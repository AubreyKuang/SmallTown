'use strict';

const TownTravel=(()=>{
  const services=TownRail.services(0);
  const morning=services[0].start+1,evening=services.at(-1).start+2;
  const places={
    bakery:['邻镇面包坊','带回一份手写食谱，想找一天试烤。','我把邻镇师傅写的配方夹进了本子，等不忙的时候试一炉。'],
    market:['河口集市','带回几枚旧纽扣，准备分给常来摊位的人。','河口的摊主把几枚旧纽扣包给我。回来后想送给熟人。'],
    station:['山口车站','带回一张旧线路图，打算去看看图上标的小路。','山口站还挂着老线路图。我抄了一份，回家慢慢看。']
  };
  const dayStart=tick=>tick-tick%48;
  const tripFor=(w,p)=>w.trips?.[p.id];
  const away=p=>p.place==='away';
  const possible=(w,p)=>!!places[p.job]&&!TownSchool.student(p)&&(!tripFor(w,p)||tripFor(w,p).returned)&&
    !['moveIn','trainReturn'].includes(p.activity)&&!away(p);
  function book(w,p,log){
    if(!possible(w,p))return false;
    const today=dayStart(w.tick);
    const depart=today+evening+(w.tick>=today+evening-5?48:0);
    const trip={depart,back:dayStart(depart)+96+morning,job:p.job,returned:false};
    (w.trips??={})[p.id]=trip;
    log(`${p.name} 买了去${places[trip.job][0]}的车票。`,'travel-book',[p.id]);
    return true;
  }
  function schedule(w,p){
    const trip=tripFor(w,p);
    if(!trip||w.tick<trip.depart-5)return null;
    if(w.tick===trip.depart-1)return {place:'station',activity:'trainBoard'};
    if(w.tick<trip.depart)return {place:'station',activity:'trainWait'};
    if(w.tick<trip.back)return {place:'away',activity:'away'};
    if(w.tick<trip.back+2)return {place:'station',activity:'trainReturn'};
    if(w.tick<trip.back+4)return {place:'homes',activity:'rest'};
    return null;
  }
  function step(w,log,remember){
    for(const p of w.people){
      const trip=tripFor(w,p);
      if(!trip||trip.returned)continue;
      const [place,detail,thought]=places[trip.job];
      if(w.tick===trip.depart)log(`${p.name} 坐火车去了${place}，将在第 ${Math.floor(trip.back/48)+1} 天 09:00 回镇。`,'travel-depart',[p.id]);
      if(w.tick<trip.back)continue;
      trip.returned=true;
      p.mood=Math.min(100,p.mood+8);
      const source=log(`${p.name} 从${place}回来了，${detail}`,'travel-return',[p.id]);
      remember(p,place,thought,source);
    }
  }
  function valid(w){
    const trips=w.trips;
    return w.people.every(p=>away(p)===Boolean(trips?.[p.id]&&w.tick>=trips[p.id].depart&&w.tick<trips[p.id].back))&&
      (trips==null||typeof trips==='object'&&!Array.isArray(trips)&&Object.entries(trips).every(([id,t])=>
      w.people.some(p=>String(p.id)===id&&p.job===t?.job)&&Object.hasOwn(places,t.job)&&
      Number.isSafeInteger(t.depart)&&t.depart>=evening&&t.depart%48===evening&&t.depart<=w.tick+53&&
      t.back===dayStart(t.depart)+96+morning&&t.returned===(w.tick>=t.back)));
  }
  return {tripFor,away,possible,book,schedule,step,valid,destination:trip=>places[trip.job][0],keepsake:trip=>places[trip.job][1]};
})();
