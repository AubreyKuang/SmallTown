'use strict';

const TownVisitors=(()=>{
  const profiles=[
    {id:'lin',sprite:105,name:'林澄',first:0,every:7,place:'bakery',reason:'搭早班车来送书，顺路去面包店。',
      firstMeeting:'把一本旧书留在了柜台上，问下次来时能不能听听读后感。',
      reunion:'又带来一本书，两人接着聊起上回还没说完的那一页。'},
    {id:'yue',sprite:106,name:'阿越',first:2,place:'cafe',reason:'路过小镇，想找间咖啡厅画完车站的速写。',
      firstMeeting:'请对方帮忙认了认画里的站台，临走时把那张速写留了下来。'}
  ];
  const dayOf=tick=>Math.floor(tick/48);
  const runs=(profile,day)=>day>=profile.first&&
    (profile.every?(day-profile.first)%profile.every===0:day===profile.first);
  function visit(profile,day){
    const [train,next]=TownRail.services(day);
    return {profile,day,start:train.start,arrival:train.start+1,reach:train.start+4.2,
      leave:next.start-2.2,departure:next.start+2};
  }
  function passenger(service,offset){
    if(service.index!==0||offset!==0)return null;
    const profile=profiles.find(candidate=>runs(candidate,service.day));
    return profile?visit(profile,service.day):null;
  }
  const state=(w,id)=>w.visitors?.[id];
  function timetable(w){
    const today=dayOf(w.tick);
    return profiles.flatMap(profile=>{
      const days=Array.from({length:8},(_,i)=>today+i);
      const day=days.find(d=>runs(profile,d)&&visit(profile,d).departure>w.tick);
      const trip=day==null?null:visit(profile,day);
      const history=state(w,profile.id);
      return trip||history?[{profile,trip,history}]:[];
    }).sort((a,b)=>(a.trip?.arrival??Infinity)-(b.trip?.arrival??Infinity));
  }
  function step(w,log,remember){
    const trip=passenger(TownRail.services(dayOf(w.tick))[0],0);
    if(!trip||w.tick<trip.arrival||w.tick>=trip.departure)return;
    const {profile,day,reach,leave}=trip;
    w.visitors??={};
    const history=w.visitors[profile.id]??={visits:0,lastDay:-1,met:{}};
    if(history.lastDay!==day){
      history.lastDay=day;
      history.visits++;
      log(`${profile.name} 搭早班车来到微光镇。`,null,'visitor-arrival',[],{visitorName:profile.name});
    }
    if(w.tick<reach||w.tick>=leave||history.lastMeeting?.day===day)return;
    const present=w.people.filter(p=>p.place===profile.place&&!TownSchool.student(p)&&
      !['sleep','commute','prepare','date','dateRepair','project','wish'].includes(p.activity));
    const resident=present.find(p=>p.id===history.lastMeeting?.resident)??present.find(p=>p.job===profile.place)??present[0];
    if(!resident)return;
    const reunited=Boolean(history.met[resident.id]);
    const detail=reunited?profile.reunion:profile.firstMeeting;
    const text=`${profile.name} 在${Town.places[profile.place].name}遇见 ${resident.name}，${detail}`;
    const source=log(text,null,reunited?'visitor-reunion':'visitor-meeting',[resident.id]);
    history.met[resident.id]=(history.met[resident.id]??0)+1;
    history.lastMeeting={day,resident:resident.id,text};
    remember(resident,`visitor:${profile.id}`,reunited?.75:.58,
      `我${reunited?'又':'第一次'}见到了${profile.name}。${reunited?'上次那本书，我们终于聊到了结尾。':detail}`,source);
  }
  function valid(w){
    if(w.visitors==null)return true;
    return typeof w.visitors==='object'&&!Array.isArray(w.visitors)&&Object.entries(w.visitors).every(([id,s])=>{
      const profile=profiles.find(candidate=>candidate.id===id);
      return profile&&s&&Number.isInteger(s.visits)&&s.visits>0&&Number.isInteger(s.lastDay)&&
        s.lastDay<=dayOf(w.tick)&&runs(profile,s.lastDay)&&s.met&&typeof s.met==='object'&&!Array.isArray(s.met)&&
        Object.entries(s.met).every(([resident,count])=>w.people.some(p=>String(p.id)===resident)&&
          Number.isInteger(count)&&count>0&&count<=s.visits)&&
        (s.lastMeeting==null||Number.isInteger(s.lastMeeting.day)&&s.lastMeeting.day<=s.lastDay&&
          runs(profile,s.lastMeeting.day)&&s.met[s.lastMeeting.resident]>0&&typeof s.lastMeeting.text==='string');
    });
  }
  return {passenger,timetable,step,valid};
})();
