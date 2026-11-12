'use strict';

const TownMovement = (() => {
  function create(world,random=Math.random){
    const walkers=[];
    const distance=(x,y,[tx,ty])=>Math.hypot(x-tx,y-ty);

    function pickStop(place,walker,nearby=false){
      const neighbors=walkers.filter(other=>other!==walker);
      const free=TownMap.stops[place].filter(point=>!neighbors.some(other=>other.stop===point));
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
      const stop=resident.place==='homes'?TownHomes.stops(resident.id,activity)[0]:
        pickStop(resident.place)??TownMap.stops[resident.place][resident.id%TownMap.stops[resident.place].length];
      walkers.push({resident,place:resident.place,x:stop[0],y:stop[1],stop,
        activity,pace:42+random()*25,wait:random()*1.4,stride:random()*Math.PI*2});
    }

    function start(walker,place,activity){
      const local=place===walker.place;
      const home=place==='homes';
      const points=home?TownHomes.stops(walker.resident.id,activity):null;
      const stop=home?points[Math.floor(random()*points.length)]:pickStop(place,walker,local);
      if(stop===walker.stop&&local){walker.wait=.45+random()*.8;return;}
      const destination=!home&&stop===walker.stop?TownMap.stops[place][walker.resident.id%TownMap.stops[place].length]:stop;
      const [x,y]=destination;
      const path=TownMap.plan(TownMap.route(walker,{place,x,y}));
      walker.stop=destination;
      const speed=local?walker.pace*(home?.38:1):Math.max(walker.pace*2.7,path.total/3.2);
      walker.journey={path,place,activity,traveled:0,speed};
    }

    function advance(seconds,roam=true){
      for(const walker of walkers){
        if(walker.journey?.place===walker.place&&walker.place!==walker.resident.place)walker.journey=null;
        if(!walker.journey){
          walker.wait-=seconds;
          const activity=Town.activity(world,walker.resident);
          if(walker.place!==walker.resident.place)start(walker,walker.resident.place,activity);
          else if(walker.activity!==activity){
            walker.activity=activity;
            if(walker.place==='homes')start(walker,walker.place,activity);
          }else if(roam&&walker.wait<=0)start(walker,walker.place,activity);
        }
        const trip=walker.journey;
        if(!trip)continue;
        const traveled=Math.min(trip.path.total,trip.traveled+seconds*trip.speed);
        walker.stride+=(traveled-trip.traveled)*.34;
        trip.traveled=traveled;
        [walker.x,walker.y]=TownMap.position(trip.path,trip.path.total?traveled/trip.path.total:1);
        if(traveled===trip.path.total){
          walker.place=trip.place;
          walker.activity=trip.activity;
          walker.journey=null;
          walker.wait=walker.activity==='walk'?.25+random()*.8:.7+random()*2.5;
        }
      }
    }

    function pins(){
      return walkers.map(({resident,place,x,y,journey,stride,activity})=>({resident,place,x,y,activity,
        indoors:(place==='homes'||journey?.place==='homes')&&TownHomes.contains(resident.id,x,y),
        step:journey?Math.sin(stride)*2:0}))
        .sort((a,b)=>a.y-b.y);
    }
    return {advance,pins};
  }
  return {create};
})();
