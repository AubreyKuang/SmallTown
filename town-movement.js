'use strict';

const TownMovement = (() => {
  function create(world,random=Math.random,onConversation=()=>{},snapshot=null){
    const walkers=[];
    const groups=new Set();
    let nextSocial=.4;
    const distance=(x,y,[tx,ty])=>Math.hypot(x-tx,y-ty);
    const onMap=(x,y)=>Number.isFinite(x)&&x>=0&&x<=960&&Number.isFinite(y)&&y>=0&&y<=620;
    const localPlace=place=>place!=='away'&&Object.hasOwn(Town.places,place);
    const privateActivities=new Set(['away','trainWait','trainBoard','trainReturn','moveIn','sleep','class','teach','prepare','indoorRecess','breadCart','breadBake']);

    const platform=id=>[879,451+(id%4)*12];
    const door=id=>[891,451+(id%4)*12];
    const publicStops=(place,activity,id)=>activity==='trainBoard'?[door(id)]:activity==='trainWait'?[platform(id)]:
      TownFestivals.crowdStops[activity]??(TownInteriors.uses(place,activity)?TownInteriors.stops(place):TownMap.stops[place]);
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

    function addWalker(resident){
      const activity=Town.activity(world,resident);
      const arriving=['moveIn','trainReturn'].includes(activity);
      const place=resident.place;
      const pool=publicStops(place,activity,resident.id);
      const stop=arriving?door(resident.id):place==='homes'?TownHomes.stops(resident.id,activity,resident.homePlot)[0]:
        twilightSeat(resident,place,activity)??pickStop(pool)??pool[resident.id%pool.length];
      const walker={resident,place,x:stop[0],y:stop[1],stop,
        activity:arriving?'alight':activity,pace:(32+random()*14)*(TownSchool.student(resident)?.9:1),
        wait:random()*1.4,stride:random()*Math.PI*2,facing:0,cooldown:0};
      const saved=snapshot&&Object.hasOwn(snapshot,resident.id)?snapshot[resident.id]:null;
      if(saved&&onMap(saved.x,saved.y)&&localPlace(saved.place)){
        Object.assign(walker,{x:saved.x,y:saved.y,stop:[saved.x,saved.y],place:saved.place,
          activity:saved.activity==='alight'||Object.hasOwn(TownRoutines.labels,saved.activity)?saved.activity:'visit'});
        const trip=saved.journey;
        if(trip&&localPlace(trip.place)&&Object.hasOwn(TownRoutines.labels,trip.activity)&&
          Array.isArray(trip.points)&&trip.points.length>1&&trip.points.length<=128&&
          trip.points.every(point=>Array.isArray(point)&&point.length===2&&onMap(...point))&&
          Number.isFinite(trip.traveled)&&trip.traveled>=0&&Number.isFinite(trip.speed)&&trip.speed>0&&trip.speed<=46){
          const path=TownMap.plan(trip.points);
          if(trip.traveled<path.total){
            const {place,activity,traveled,speed,transit,cartStart}=trip;
            walker.stop=path.points.at(-1);
            walker.journey={path,place,activity,traveled,speed,transit:Boolean(transit),
              cartStart:Number.isFinite(cartStart)&&cartStart>=0&&cartStart<=path.total?cartStart:null};
          }
        }
      }
      walkers.push(walker);
    }
    const tracked=new Set();
    function sync(){
      for(const resident of world.people){
        if(tracked.has(resident.id)||resident.place==='away')continue;
        addWalker(resident);
        tracked.add(resident.id);
      }
    }
    sync();

    function start(walker,place,activity,delivery){
      const previous=walker.journey;
      const local=!previous?.transit&&place===walker.place;
      const home=place==='homes';
      const points=home?TownHomes.stops(walker.resident.id,activity,walker.resident.homePlot):publicStops(place,activity,walker.resident.id);
      const sameArea=TownInteriors.uses(place,activity)===TownInteriors.contains(place,walker.x,walker.y);
      const special=delivery||TownFestivals.gathering(activity)||['trainBoard','trainWait'].includes(activity)||walker.activity==='alight';
      const stop=delivery?[delivery.at(-1).x,delivery.at(-1).y]:home?points[Math.floor(random()*points.length)]:
        twilightSeat(walker.resident,place,activity)??pickStop(points,walker,!special&&local&&sameArea);
      if(stop===walker.stop&&local&&sameArea&&!special){walker.wait=.45+random()*.8;return;}
      const destination=!home&&stop===walker.stop?points[walker.resident.id%points.length]:stop;
      const [x,y]=destination;
      const target={place,x,y};
      const routeTo=to=>previous?.transit?TownMap.reroute(walker,to,previous).points:TownMap.route(walker,to);
      let waypoints=routeTo(delivery?.[0]??target);
      const pickup=delivery?TownMap.plan(waypoints).total:null;
      if(delivery){
        for(let i=1;i<delivery.length;i++){
          waypoints.push(...TownMap.route({...delivery[i-1],resident:walker.resident},delivery[i]).slice(1));
        }
      }else if(walker.activity==='alight'&&place==='station'){
        waypoints=[[walker.x,walker.y],platform(walker.resident.id),[879,y],[x,y]];
      }else if(activity==='trainBoard'){
        waypoints=[...routeTo({place,x:879,y}),[x,y]];
      }
      const path=TownMap.plan(waypoints);
      walker.stop=destination;
      const speed=local?walker.pace*(home?.5:.9):walker.pace;
      walker.journey={path,place,activity,traveled:0,speed,transit:!local,cartStart:pickup};
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
      if(completed&&type==='talk')onConversation(a.resident.id,b.resident.id,group.conversation);
    }
    function meet(){
      if(groups.size>=4)return;
      const candidates=walkers.filter(w=>w.resident.place!=='away'&&!w.group&&w.cooldown<=0&&!privateActivities.has(w.activity)&&!privateActivities.has(Town.activity(world,w.resident))&&!atHome(w));
      const startIndex=Math.floor(random()*candidates.length);
      const available=candidates.slice(startIndex).concat(candidates.slice(0,startIndex));
      for(let i=0;i<available.length;i++){
        const a=available[i];
        for(const b of available.slice(i+1)){
          const dist=distance(a.x,a.y,[b.x,b.y]);
          if(dist<8||dist>32)continue;
          if(inside(a)!==inside(b)||inside(a)&&a.place!==b.place)continue;
          const learningTogether=a.activity==='learnTune'&&b.activity==='learnTune';
          if(!learningTogether&&TownSchool.student(a.resident)!==TownSchool.student(b.resident)&&
            TownSchool.household(a.resident.id)!==TownSchool.household(b.resident.id))continue;
          const sameWay=alignment(a,b)>.85;
          const familiar=(a.resident.trust[b.resident.id]||0)+(b.resident.trust[a.resident.id]||0)>0;
          const canChat=learningTogether||dist<=23&&(!sameWay||familiar)&&random()<(familiar?.75:.46);
          if(!sameWay&&!canChat)continue;
          const group={a,b,type:canChat?'talk':'walk',remaining:canChat?4.8+random()*1.6:3+random()*2};
          if(canChat)group.conversation=TownConversations.create(world,a.resident,b.resident);
          a.group=b.group=group;groups.add(group);
          return;
        }
      }
    }
    function moveAlong(walker,trip){
      const [x,y]=TownMap.position(trip.path,trip.path.total?trip.traveled/trip.path.total:1);
      const dx=x-walker.x,dy=y-walker.y;
      if(Math.abs(dx)+Math.abs(dy)>.0001)walker.facing=Math.abs(dx)>.3*Math.abs(dy)?Math.sign(dx):0;
      walker.x=x;walker.y=y;
    }
    function advance(seconds,roam=true){
      sync();
      for(let i=walkers.length-1;i>=0;i--){
        const w=walkers[i],id=w.resident.id;
        if(w.resident.place!=='away')continue;
        if(w.group)endGroup(w.group,false);
        if(!aboard(w)){
          if(w.journey?.activity!=='trainBoard')start(w,'station','trainBoard');
          const trip=w.journey;
          trip.traveled=Math.min(trip.path.total,trip.traveled+seconds*trip.speed);
          moveAlong(w,trip);
          w.stride+=seconds*trip.speed*.27;
          if(trip.traveled<trip.path.total)continue;
        }
        walkers.splice(i,1);tracked.delete(id);
      }
      for(const group of groups){
        group.remaining-=seconds;
        const {a,b,type}=group;
        const drifting=type==='walk'&&(alignment(a,b)<.5||distance(a.x,a.y,[b.x,b.y])>42);
        if(group.remaining<=0||drifting)endGroup(group,group.remaining<=0);
      }
      for(const walker of walkers){
        if(walker.resident.place==='away'||aboard(walker))continue;
        const scheduled=Town.activity(world,walker.resident);
        const delivery=privateActivities.has(scheduled)&&scheduled!=='breadCart'?null:TownSupply.delivery(world,walker.resident.id);
        const activity=delivery?'breadCart':scheduled;
        const place=delivery?.at(-1).place??walker.resident.place;
        if((activity==='trainBoard'||delivery)&&walker.group)endGroup(walker.group,false);
        walker.cooldown-=seconds;
        if(walker.group?.type==='talk')continue;
        if(['trainWait','trainBoard'].includes(activity)&&walker.journey?.activity!==activity&&walker.activity!==activity)start(walker,'station',activity);
        else if(delivery&&walker.journey?.activity!=='breadCart'&&walker.activity!=='breadCart')start(walker,place,activity,delivery);
        else if(walker.journey&&(walker.journey.place!==place||walker.journey.cartStart!=null&&!delivery)){
          if(walker.journey.transit)start(walker,place,activity,delivery);
          else walker.journey=null;
        }
        if(!walker.journey){
          walker.wait-=seconds;
          if(walker.activity==='alight')start(walker,'station','trainReturn');
          else if(walker.place!==place)start(walker,place,activity,delivery);
          else if(walker.activity!==activity){
            const changesRoom=TownInteriors.uses(walker.place,walker.activity)!==TownInteriors.uses(walker.place,activity);
            walker.activity=activity;
            if(walker.place==='homes'||changesRoom||activity==='twilight'||TownFestivals.gathering(activity))start(walker,walker.place,activity);
          }else if(roam&&walker.wait<=0&&!TownFestivals.gathering(activity)&&!['twilight','trainWait','breadCart'].includes(activity))start(walker,walker.place,activity);
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
        moveAlong(walker,trip);
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

    const aboard=w=>w.activity==='trainBoard'&&!w.journey&&distance(w.x,w.y,door(w.resident.id))<.01;
    function pins(){
      return walkers.filter(w=>!aboard(w)).map(w=>({resident:w.resident,place:w.place,x:w.x,y:w.y,activity:w.activity,
        indoors:inside(w),social:w.group?.type,conversation:w.group?.conversation,partner:w.group?(w.group.a===w?w.group.b:w.group.a).resident.id:null,
        movingTo:w.journey?.transit?w.journey.place:null,cart:w.journey?.cartStart!=null&&w.journey.traveled>=w.journey.cartStart,
        facing:w.journey&&w.group?.type!=='talk'?w.facing:0,
        step:w.journey&&w.group?.type!=='talk'?Math.sin(w.stride)*1.6:0}))
        .sort((a,b)=>a.y-b.y);
    }
    function positions(){
      return Object.fromEntries(walkers.filter(w=>w.resident.place!=='away').map(w=>{
        const {x,y,place,activity,journey}=w;
        const data={x,y,place,activity};
        if(journey){
          const {path,...route}=journey;
          data.journey={points:path.points,...route};
        }
        return [w.resident.id,data];
      }));
    }
    return {advance,pins,sync,positions};
  }
  return {create};
})();
