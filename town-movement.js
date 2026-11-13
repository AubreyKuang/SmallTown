'use strict';

const TownMovement = (() => {
  function create(world,random=Math.random,onConversation=()=>{}){
    const walkers=[];
    const groups=new Set();
    let nextSocial=.4;
    const distance=(x,y,[tx,ty])=>Math.hypot(x-tx,y-ty);
    const privateActivities=new Set(['sleep','class','teach','prepare','indoorRecess','breadCart','breadBake']);

    const publicStops=(place,activity)=>TownInteriors.uses(place,activity)?TownInteriors.stops(place):TownMap.stops[place];
    function twilightSeat(resident,place,activity){
      if(activity!=='twilight')return null;
      return TownAtmosphere.tables[place]?.seats[resident.id===TownTwilight.plan(world)?.host?0:1]??null;
    }
    function pickStop(pool,walker,nearby=false){
      const neighbors=walkers.filter(other=>other!==walker);
      const free=pool.filter(point=>!neighbors.some(other=>other.stop===point));
      const spaced=free.filter(point=>!neighbors.some(other=>distance(other.x,other.y,point)<14 ||
        distance(...other.stop,point)<14));
      const options=spaced.length?spaced:free;
      const local=nearby?options.filter(point=>{
        const length=distance(walker.x,walker.y,point);
        return length>=20&&length<=(walker.activity==='walk'?82:55);
      }):options;
      return local[Math.floor(random()*local.length)]??walker?.stop;
    }

    for(const resident of world.people){
      const activity=Town.activity(world,resident);
      const pool=publicStops(resident.place,activity);
      const stop=resident.place==='homes'?TownHomes.stops(resident.id,activity,resident.homePlot)[0]:
        twilightSeat(resident,resident.place,activity)??pickStop(pool)??pool[resident.id%pool.length];
      walkers.push({resident,place:resident.place,x:stop[0],y:stop[1],stop,
        activity,pace:(32+random()*14)*(TownSchool.student(resident)?.9:1),wait:random()*1.4,
        stride:random()*Math.PI*2,cooldown:0});
    }

    function start(walker,place,activity){
      const previous=walker.journey;
      const local=!previous?.transit&&place===walker.place;
      const home=place==='homes';
      const points=home?TownHomes.stops(walker.resident.id,activity,walker.resident.homePlot):publicStops(place,activity);
      const sameArea=TownInteriors.uses(place,activity)===TownInteriors.contains(place,walker.x,walker.y);
      const stop=home?points[Math.floor(random()*points.length)]:twilightSeat(walker.resident,place,activity)??pickStop(points,walker,local&&sameArea);
      if(stop===walker.stop&&local&&sameArea){walker.wait=.45+random()*.8;return;}
      const destination=!home&&stop===walker.stop?points[walker.resident.id%points.length]:stop;
      const [x,y]=destination;
      const target={place,x,y};
      const path=previous?.transit?TownMap.reroute(walker,target,previous):TownMap.plan(TownMap.route(walker,target));
      walker.stop=destination;
      const speed=local?walker.pace*(home?.5:.9):walker.pace;
      walker.journey={path,place,activity,traveled:0,speed,transit:!local};
    }

    const atHome=w=>(w.place==='homes'||w.journey?.place==='homes')&&TownHomes.contains(w.resident.id,w.x,w.y,w.resident.homePlot);
    const inside=w=>atHome(w)||TownInteriors.contains(w.place,w.x,w.y)||TownInteriors.contains(w.journey?.place,w.x,w.y);
    function heading(w){
      const trip=w.journey;
      if(!trip?.path.total)return null;
      const [x,y]=TownMap.position(trip.path,Math.min(1,(trip.traveled+12)/trip.path.total));
      const length=distance(w.x,w.y,[x,y]);
      return length>1?[(x-w.x)/length,(y-w.y)/length]:null;
    }
    function alignment(a,b){
      const x=heading(a),y=heading(b);
      return x&&y?x[0]*y[0]+x[1]*y[1]:0;
    }
    function endGroup(group,completed){
      const {a,b,type}=group;
      a.group=b.group=null;
      a.cooldown=6+random()*6;b.cooldown=6+random()*6;
      groups.delete(group);
      if(completed&&type==='talk')onConversation(a.resident.id,b.resident.id);
    }
    function meet(){
      if(groups.size>=4)return;
      const candidates=walkers.filter(w=>!w.group&&w.cooldown<=0&&!privateActivities.has(w.activity)&&!privateActivities.has(Town.activity(world,w.resident))&&!atHome(w));
      const startIndex=Math.floor(random()*candidates.length);
      const available=candidates.slice(startIndex).concat(candidates.slice(0,startIndex));
      for(let i=0;i<available.length;i++){
        const a=available[i];
        for(const b of available.slice(i+1)){
          const dist=distance(a.x,a.y,[b.x,b.y]);
          if(dist<8||dist>32)continue;
          if(inside(a)!==inside(b)||inside(a)&&a.place!==b.place)continue;
          if(TownSchool.student(a.resident)!==TownSchool.student(b.resident)&&
            TownSchool.household(a.resident.id)!==TownSchool.household(b.resident.id))continue;
          const sameWay=alignment(a,b)>.85;
          const familiar=(a.resident.trust[b.resident.id]||0)+(b.resident.trust[a.resident.id]||0)>0;
          const canChat=dist<=23&&(!sameWay||familiar)&&random()<(familiar?.75:.46);
          if(!sameWay&&!canChat)continue;
          const group={a,b,type:canChat?'talk':'walk',remaining:canChat?1.8+random()*1.3:3+random()*2};
          a.group=b.group=group;groups.add(group);
          return;
        }
      }
    }
    function advance(seconds,roam=true){
      for(const group of groups){
        group.remaining-=seconds;
        const {a,b,type}=group;
        const drifting=type==='walk'&&(alignment(a,b)<.5||distance(a.x,a.y,[b.x,b.y])>42);
        if(group.remaining<=0||drifting)endGroup(group,group.remaining<=0);
      }
      for(const walker of walkers){
        walker.cooldown-=seconds;
        if(walker.group?.type==='talk')continue;
        if(walker.journey&&walker.journey.place!==walker.resident.place){
          if(walker.journey.transit)start(walker,walker.resident.place,Town.activity(world,walker.resident));
          else walker.journey=null;
        }
        if(!walker.journey){
          walker.wait-=seconds;
          const activity=Town.activity(world,walker.resident);
          if(walker.place!==walker.resident.place)start(walker,walker.resident.place,activity);
          else if(walker.activity!==activity){
            const changesRoom=TownInteriors.uses(walker.place,walker.activity)!==TownInteriors.uses(walker.place,activity);
            walker.activity=activity;
            if(walker.place==='homes'||changesRoom||activity==='twilight')start(walker,walker.place,activity);
          }else if(roam&&walker.wait<=0&&activity!=='twilight')start(walker,walker.place,activity);
        }
        const trip=walker.journey;
        if(!trip)continue;
        const group=walker.group;
        const partner=group&&(group.a===walker?group.b:group.a);
        const speed=partner?Math.min(trip.speed,partner.journey?.speed??trip.speed)*.9:trip.speed;
        const easing=Math.min(1,.62+trip.traveled/18,.55+(trip.path.total-trip.traveled)/22);
        const traveled=Math.min(trip.path.total,trip.traveled+seconds*speed*easing);
        walker.stride+=(traveled-trip.traveled)*.27;
        trip.traveled=traveled;
        [walker.x,walker.y]=TownMap.position(trip.path,trip.path.total?traveled/trip.path.total:1);
        if(traveled===trip.path.total){
          walker.place=trip.place;
          walker.activity=trip.activity;
          walker.journey=null;
          walker.wait=walker.activity==='walk'?.25+random()*.8:.7+random()*2.5;
        }
      }
      nextSocial-=seconds;
      if(roam&&nextSocial<=0){meet();nextSocial=.45+random()*.55;}
    }

    function pins(){
      return walkers.map(w=>({resident:w.resident,place:w.place,x:w.x,y:w.y,activity:w.activity,
        indoors:inside(w),social:w.group?.type,partner:w.group?(w.group.a===w?w.group.b:w.group.a).resident.id:null,
        movingTo:w.journey?.transit?w.journey.place:null,
        step:w.journey&&w.group?.type!=='talk'?Math.sin(w.stride)*1.6:0}))
        .sort((a,b)=>a.y-b.y);
    }
    return {advance,pins};
  }
  return {create};
})();
