'use strict';

const TownFestivals=(()=>{
  const guest={id:'luye',sprite:107,name:'鹿野',place:'square',reason:'巡演的手风琴手，下午抵达微光镇，在广场演奏后乘晚班车离开。'};
  const events=[
    {offset:1,name:'广场茶点派对',start:34,end:41,activity:'party',description:'面包店拿出一盘小点心，街坊带着杯子来广场坐一坐。'},
    {offset:2,name:'风铃节',start:34,end:42,activity:'festival',description:'街坊把各家带来的风铃挂在广场上。傍晚有灯串，雨天在棚下照常举行。'},
    {offset:4,name:'鹿野的广场音乐会',start:33,end:35,activity:'concert',description:'手风琴手鹿野搭午后列车来访。居民可以去车站接他，也可以直接到广场听演出。',guest}
  ];
  const welcomeIds=new Set([3,6,9,15,17,24]);
  const available=new Set(['walk','coffee','shop','read','rest','cook','play','lunch']);
  const dayOf=tick=>Math.floor(tick/48);
  function plan(day){
    const event=events.find(item=>item.offset===day%7);
    if(!event)return null;
    const base=day*48;
    return {...event,day,at:base+event.start,until:base+event.end,
      arrival:event.guest?TownRail.services(day)[1].start+1:null};
  }
  function upcoming(tick){
    const day=dayOf(tick);
    return Array.from({length:8},(_,i)=>plan(day+i)).filter(event=>event&&event.until>tick).slice(0,3);
  }
  function passenger(service,offset){
    const event=plan(service.day);
    if(service.index!==1||offset!==0||!event?.guest)return null;
    return {profile:event.guest,arrival:event.arrival,reach:event.at,leave:event.until,departure:TownRail.services(event.day)[2].start+2};
  }
  const crowdStops={
    welcomeGuest:[[857,450],[863,465],[852,480],[865,492],[851,501],[838,454],[837,487],[828,476]],
    concert:[[510,346],[531,344],[553,345],[575,347],[593,349],[510,365],[531,367],[574,368],[594,371],[503,387],[524,388],[554,395],[575,391],[600,388],[620,371]]
  };
  const gathering=activity=>Object.hasOwn(crowdStops,activity);
  function destination(w,p,routine){
    const event=plan(dayOf(w.tick));
    if(!event)return routine;
    if(event.guest&&welcomeIds.has(p.id)&&w.tick>=event.arrival-2+p.id%2&&w.tick<event.arrival+2+p.id%2&&
      (available.has(routine.activity)||routine.place==='station'&&routine.activity==='work')){
      return {place:'station',activity:'welcomeGuest'};
    }
    const selected=((p.id+event.day*5)%13)<6;
    if((selected||event.guest&&welcomeIds.has(p.id))&&available.has(routine.activity)&&
      w.tick>=event.at-(event.guest?5:3)+p.id%3&&w.tick<event.until-(event.guest?0:p.id%2))return {place:'square',activity:event.activity};
    return routine;
  }
  function step(w,log){
    const event=plan(dayOf(w.tick));
    if(!event)return;
    if(w.tick===event.arrival){
      const greeters=w.people.filter(p=>p.activity==='welcomeGuest'&&p.place==='station').map(p=>p.id);
      log(`${guest.name} 搭午后列车抵达微光镇，${greeters.length?greeters.length+' 位居民到车站接他':'他随后会沿街走到广场'}。`,
        null,'festival-arrival',greeters,{visitorName:guest.name});
    }
    if(w.tick!==event.at+1)return;
    const attendees=w.people.filter(p=>p.place==='square'&&p.activity===event.activity);
    const detail={party:'大家在喷泉旁分了点心。',festival:'灯亮时，风铃刚好响了一阵。',concert:'鹿野拉完第一首曲子，广场上响起了掌声。'}[event.activity];
    const source=log(`${event.name}有 ${attendees.length} 位居民到场。${attendees.length?detail:''}`,
      null,'festival-held',attendees.map(p=>p.id),{festivalName:event.name});
    if(attendees.length)NPCMemory.record(w,{type:'festival-held',time:w.tick,source,participants:attendees.map(p=>p.id)},
      attendees.map(p=>({person:p.id,subject:event.guest?'visitor:'+event.guest.id:'square',emotion:.62,impact:72,
        interpretation:`我去了${event.name}。${detail}`})));
    for(const p of attendees)p.mood=Math.min(100,p.mood+5);
  }
  return {plan,upcoming,passenger,destination,step,gathering,crowdStops};
})();
