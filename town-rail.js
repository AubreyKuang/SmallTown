'use strict';

const TownRail=(()=>{
  const slots=[17,27,36];
  const stops=[[438,244],[602,247],[795,270],[550,321]];
  const destinations=['bakery','cafe','market','square'];
  const trackX=y=>901+Math.max(0,388-y)*.82;
  const count=(day,index)=>day<0?2:2+(day+index*2)%3;
  const service=(day,index)=>({day,index,start:day*48+slots[index],arrivals:count(day,index),
    departures:count(index===0?day-1:day,(index+slots.length-1)%slots.length)});
  const services=day=>slots.map((_,index)=>service(day,index));
  function schedule(tick){
    const day=Math.floor(tick/48);
    const active=services(day).find(s=>tick>=s.start&&tick<s.start+3);
    const next=services(day).find(s=>s.start>tick)??service(day+1,0);
    return {active,next,phase:active?['approach','platform','departure'][tick-active.start]:null};
  }
  function notice(tick){
    const {active,phase}=schedule(tick);
    if(phase==='platform')return `列车停靠微光镇站，${active.arrivals} 位旅客下车。`;
    if(phase==='departure')return `列车离开微光镇站，${active.departures} 位旅客上车。`;
    return null;
  }
  function train(tick,progress){
    const {phase}=schedule(tick);
    if(!phase)return null;
    const ease=phase==='approach'?1-(1-progress)**2:progress**2;
    return {phase,nose:phase==='platform'?427:phase==='approach'?680-253*ease:427-187*ease};
  }

  const paths=new Map();
  function route(destination,offset){
    const key=`${destination}:${offset}`;
    if(!paths.has(key)){
      const station=[822+offset*4,471+offset*6],platform=[879,449+offset*17],door=[891,449+offset*17];
      const [x,y]=stops[destinations.indexOf(destination)];
      const target=[x+offset*4,y+offset*5];
      const street=TownMap.plan(TownMap.route({place:'station',x:station[0],y:station[1],resident:{id:offset+1}},
        {place:destination,x:target[0],y:target[1]}));
      paths.set(key,{door,platform,station,target,street,platformPath:TownMap.plan([door,platform,[879,station[1]],station]),
        queue:TownMap.plan([station,[879,station[1]],platform]),board:TownMap.plan([platform,door])});
    }
    return paths.get(key);
  }
  const fraction=(now,start,end)=>Math.max(0,Math.min(1,(now-start)/(end-start)));
  function passengers(tick,progress){
    const time=tick+progress,day=Math.floor(tick/48),pins=[];
    for(const origin of [service(day-1,2),...services(day)]){
      const next=origin.index===slots.length-1?service(origin.day+1,0):service(origin.day,origin.index+1);
      for(let i=0;i<origin.arrivals;i++){
        const alight=origin.start+1.07+i*.09,board=next.start+1.56+i*.075;
        if(time<alight||time>=board+.15)continue;
        const visit=TownFestivals.passenger(origin,i)??TownVisitors.passenger(origin,i);
        const p=route(visit?.profile.place??destinations[(origin.index+i)%3],i);
        let position,phase;
        const explore=visit?.profile.place==='square'?origin.start+2.7:origin.start+2.2+i*.12,reach=visit?.reach??origin.start+5.6+i*.12;
        const returnAt=visit?.leave??Math.max(reach,next.start-3.2-i*.08),queueAt=next.start+.36+i*.11;
        if(time<explore){
          position=TownMap.position(p.platformPath,fraction(time,alight,explore));phase='alight';
        }else if(time<reach){
          position=TownMap.position(p.street,fraction(time,explore,reach));phase='walk';
        }else if(time<returnAt){
          position=p.target;phase='visit';
        }else if(time<queueAt){
          position=TownMap.position(p.street,1-fraction(time,returnAt,queueAt));phase='walk';
        }else if(time<board){
          position=TownMap.position(p.queue,fraction(time,queueAt,queueAt+.8));phase='wait';
        }else{
          position=TownMap.position(p.board,fraction(time,board,board+.15));phase='board';
        }
        pins.push({id:visit?.profile.sprite??100+(origin.day+1)*12+origin.index*4+i,
          visitor:visit?.profile,x:position[0],y:position[1],phase});
      }
    }
    return pins;
  }
  return {services,schedule,notice,trackX,train,passengers};
})();
