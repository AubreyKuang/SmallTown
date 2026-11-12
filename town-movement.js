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
        return length>=20&&length<=82;
      }):options;
      return local[Math.floor(random()*local.length)]??walker?.stop;
    }

    for(const resident of world.people){
      const stop=pickStop(resident.place)??TownMap.stops[resident.place][resident.id%TownMap.stops[resident.place].length];
      walkers.push({resident,place:resident.place,x:stop[0],y:stop[1],stop,
        pace:42+random()*25,wait:random()*1.4,stride:random()*Math.PI*2});
    }

    function start(walker,place){
      const local=place===walker.place;
      const stop=pickStop(place,walker,local);
      if(stop===walker.stop&&local){walker.wait=.45+random()*.8;return;}
      const destination=stop===walker.stop?TownMap.stops[place][walker.resident.id%TownMap.stops[place].length]:stop;
      const [x,y]=destination;
      const path=TownMap.plan(TownMap.route(walker,{place,x,y}));
      walker.stop=destination;
      walker.journey={path,place,traveled:0,speed:local?walker.pace:walker.pace*2.7};
    }

    function advance(seconds,roam=true){
      for(const walker of walkers){
        if(walker.journey?.place===walker.place&&walker.place!==walker.resident.place)walker.journey=null;
        if(!walker.journey){
          walker.wait-=seconds;
          if(walker.place!==walker.resident.place)start(walker,walker.resident.place);
          else if(roam&&walker.wait<=0)start(walker,walker.place);
        }
        const trip=walker.journey;
        if(!trip)continue;
        const traveled=Math.min(trip.path.total,trip.traveled+seconds*trip.speed);
        walker.stride+=(traveled-trip.traveled)*.34;
        trip.traveled=traveled;
        [walker.x,walker.y]=TownMap.position(trip.path,trip.path.total?traveled/trip.path.total:1);
        if(traveled===trip.path.total){
          walker.place=trip.place;
          walker.journey=null;
          walker.wait=.45+random()*1.65;
        }
      }
    }

    function pins(){
      return walkers.map(({resident,place,x,y,journey,stride})=>({resident,place,x,y,step:journey?Math.sin(stride)*2:0}))
        .sort((a,b)=>a.y-b.y);
    }
    return {advance,pins};
  }
  return {create};
})();
