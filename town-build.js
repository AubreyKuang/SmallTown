'use strict';

const TownBuild=(()=>{
  // Plots keep clear of existing buildings, water and roads. Each has a spur to a street junction.
  const plots=[
    {name:'西街口',x:49,y:268,junction:0,path:[[49,282],[49,317],[101,315]]},
    {name:'面包坊西侧',x:333,y:245,junction:1,path:[[333,255],[333,285]]},
    {name:'广场西侧',x:415,y:355,junction:2,path:[[415,368],[398,368],[398,298],[430,272]]},
    {name:'商街南侧',x:740,y:345,junction:5,path:[[740,354],[714,353],[714,290]]},
    {name:'东街口',x:826,y:354,junction:5,path:[[826,367],[806,362],[805,296]]},
    {name:'河岸东坡',x:693,y:411,junction:3,path:[[693,424],[666,429],[628,427],[550,353]]}
  ];
  const types={
    cottage:{name:'单户小屋',cost:6,capacity:1,duration:4,width:42,height:31,roof:'#a55c46'},
    duplex:{name:'双户联排',cost:12,capacity:2,duration:6,width:56,height:36,roof:'#58786d'}
  };
  const names=['Alma','Ben','Clara','Daisy','Edith','Felix','Gwen','Hugo','Ina','Jasper','Kira','Linus'];
  const jobs=['bakery','market','station'];
  const buildings=w=>w.construction??[];
  const residentId=(plot,slot)=>30+plot*2+slot;
  const idFor=(plot,slot)=>({id:residentId(plot,slot),name:names[plot*2+slot],homePlot:plot,
    job:jobs[(plot+slot)%jobs.length],habit:['forest','cafe','square'][(plot*2+slot)%3],
    temperament:slot||plot%2?'practical':'generous'});
  const house=(w,plot)=>buildings(w).find(b=>b.plot===plot);
  function bounds(plot,type){
    const {x,y}=plots[plot],{width,height}=types[type];
    return [x-width/2-3,y-height-12,x+width/2+10,y+8];
  }
  function hit(x,y,plot,type){
    const [left,top,right,bottom]=bounds(plot,type);
    return x>=left&&x<=right&&y>=top&&y<=bottom;
  }
  const plotAt=(x,y,type)=>plots.findIndex((_,id)=>hit(x,y,id,type));
  function canPlace(w,plot,type){
    return Number.isInteger(plot)&&!!plots[plot]&&Object.hasOwn(types,type)&&!house(w,plot)&&TownSupply.funds(w)>=types[type].cost;
  }
  function place(w,plot,type,log){
    if(!canPlace(w,plot,type)||!TownSupply.spend(w,types[type].cost))return false;
    const ready=w.tick+types[type].duration;
    let moveIn=ready-ready%48+18;
    if(moveIn<=ready)moveIn+=48;
    (w.construction??=[]).push({plot,type,started:w.tick,ready,moveIn});
    log(`${plots[plot].name}开始建造${types[type].name}。`,null,'build-start',[]);
    return true;
  }
  function step(w,log,addResident){
    for(const b of buildings(w)){
      if(!b.finished&&w.tick>=b.ready){
        b.finished=true;
        log(`${plots[b.plot].name}的${types[b.type].name}竣工了。`,null,'build-ready',[]);
      }
      if(b.movedIn||w.tick<b.moveIn)continue;
      b.movedIn=true;
      const incoming=Array.from({length:types[b.type].capacity},(_,slot)=>addResident(idFor(b.plot,slot)));
      log(`${incoming.map(p=>p.name).join(' 和 ')}搬进了${plots[b.plot].name}的新家。`,null,'build-move-in',incoming.map(p=>p.id));
    }
  }
  function valid(w,baseCount){
    const list=buildings(w);
    if(!Array.isArray(list)||list.length>plots.length)return false;
    const expected=new Map();
    const occupied=new Set();
    for(const b of list){
      if(!b||!Number.isInteger(b.plot)||!plots[b.plot]||occupied.has(b.plot)||!Object.hasOwn(types,b.type)||
        !Number.isSafeInteger(b.started)||b.started<0||b.started>w.tick||b.ready!==b.started+types[b.type].duration||
        !Number.isSafeInteger(b.moveIn)||b.moveIn%48!==18||b.moveIn<=b.ready||b.moveIn>b.ready+48||
        Boolean(b.finished)!==(w.tick>=b.ready)||Boolean(b.movedIn)!==(w.tick>=b.moveIn))return false;
      occupied.add(b.plot);
      if(b.movedIn)for(let slot=0;slot<types[b.type].capacity;slot++){
        const data=idFor(b.plot,slot);
        expected.set(data.id,data);
      }
    }
    const extra=w.people.filter(p=>p.id>baseCount);
    return extra.length===expected.size&&extra.every(p=>expected.get(p.id)?.homePlot===p.homePlot&&expected.has(p.id))&&
      w.people.every(p=>p.id>baseCount||p.homePlot==null);
  }
  return {plots,types,buildings,house,bounds,hit,plotAt,canPlace,place,step,valid};
})();
