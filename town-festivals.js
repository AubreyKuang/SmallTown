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
  const pupilId=28;
  const bench={place:'square',activity:'learnTune'};
  const reprise={place:'square',activity:'shareTune'};
  const person=(w,id)=>w.people.find(p=>p.id===id);
  const lessonHour=36;
  const lessonDay=story=>story.day+1;
  const lessonTick=story=>lessonDay(story)*48+lessonHour;
  function followup(w,p,routine){
    const story=w.festivalTune;
    if(!story)return routine;
    const free=available.has(routine.activity)||p.id===pupilId&&routine.activity==='homework';
    if(!free)return routine;
    if((story.phase==='waiting'||story.phase==='heard')&&(p.id===pupilId||p.id===story.guide)&&
      w.tick>=lessonTick(story)-5&&w.tick<lessonTick(story)+4)return bench;
    if((story.phase==='heard'||story.phase==='done')&&p.id===pupilId){
      const event=plan(dayOf(w.tick));
      if(event?.guest&&event.day>story.day&&(story.phase==='heard'||dayOf(story.played)===event.day)&&w.tick>=event.at-5&&w.tick<event.until)return reprise;
    }
    return routine;
  }
  function saveMemory(w,type,source,people,words){
    NPCMemory.record(w,{type,time:w.tick,source,participants:people.map(p=>p.id)},people.map((p,i)=>({
      person:p.id,subject:people.length===1?'visitor:'+guest.id:people[1-i].id,
      emotion:.67,impact:78,interpretation:words[i]
    })));
  }
  function settleTune(w,event,log){
    const story=w.festivalTune;
    if(!story)return;
    const pupil=person(w,pupilId),guide=person(w,story.guide);
    if(story.phase==='waiting'&&w.tick>=lessonTick(story)){
      if(w.tick>=lessonTick(story)+4){
        // A conflicting appointment leaves room for a new encounter at a later concert.
        delete w.festivalTune;
        return;
      }
      if(pupil.place!==bench.place||guide.place!==bench.place||pupil.activity!==bench.activity||guide.activity!==bench.activity)return;
      const source=log(`${guide.name} 在喷泉边哼了鹿野的曲子。Pip 学了开头三句，又加上了自己的一句。`,
        w.events.some(e=>e.id===story.source)?story.source:null,'festival-tune',[pupilId,guide.id]);
      saveMemory(w,'festival-tune',source,[pupil,guide],[
        `${guide.name} 在喷泉边教我哼鹿野的曲子。我多加了一句，听起来像水滴落下来。`,
        'Pip 没赶上音乐会。我把曲子哼给他听，他自己补了一个结尾。'
      ]);
      Object.assign(story,{phase:'heard',learned:w.tick,source});
    }else if(story.phase==='heard'&&event?.guest&&event.day>story.day&&w.tick>=event.at&&w.tick<event.until&&pupil.activity===reprise.activity&&pupil.place===reprise.place){
      const source=log('鹿野认出了 Pip 哼的曲子，也听出了他自己加的那一句。演出收尾时，他把这一句拉进了原来的旋律。',
        w.events.some(e=>e.id===story.source)?story.source:null,'festival-reprise',[pupilId]);
      saveMemory(w,'festival-reprise',source,[pupil],['鹿野听见了我自己加的那一句，还在台上拉了一遍。原来一首曲子可以接着写。']);
      Object.assign(story,{phase:'done',played:w.tick,source});
    }
  }
  function tuneConversation(w,a,b){
    const story=w.festivalTune;
    if(!story||story.phase==='waiting'||w.tick-story.learned>=48)return null;
    const pupil=person(w,pupilId),guide=person(w,story.guide);
    if(![a,b].includes(pupil)||![a,b].includes(guide))return null;
    return {topic:'喷泉边学来的曲子',source:story.source,lines:[
      {speaker:guide.id,text:'刚才最后那一句，是你自己加的吧？'},
      {speaker:pupil.id,text:'嗯。原本应该停了，可喷泉还在响，我就想再哼一句。'}
    ]};
  }
  function valid(w){
    const story=w.festivalTune;
    if(story==null)return true;
    return typeof story==='object'&&!Array.isArray(story)&&Number.isSafeInteger(story.day)&&story.day>=0&&story.day<=dayOf(w.tick)&&!!plan(story.day)?.guest&&
      person(w,pupilId)&&story.guide!==pupilId&&person(w,story.guide)&&Number.isSafeInteger(story.source)&&story.source>0&&story.source<=w.sequence&&
      (story.phase==='waiting'||Number.isSafeInteger(story.learned)&&story.learned>=lessonTick(story)&&story.learned<=w.tick&&
        (story.phase==='heard'||story.phase==='done'&&Number.isSafeInteger(story.played)&&story.played>=story.learned&&story.played<=w.tick));
  }
  const crowdStops={
    learnTune:[[476,371],[490,372]],
    shareTune:[[546,344]],
    welcomeGuest:[[857,450],[863,465],[852,480],[865,492],[851,501],[838,454],[837,487],[828,476]],
    concert:[[510,346],[531,344],[553,345],[575,347],[593,349],[510,365],[531,367],[574,368],[594,371],[503,387],[524,388],[554,395],[575,391],[600,388],[620,371]]
  };
  const gathering=activity=>Object.hasOwn(crowdStops,activity);
  function destination(w,p,routine){
    const event=plan(dayOf(w.tick));
    if(!event)return followup(w,p,routine);
    if(event.guest&&welcomeIds.has(p.id)&&w.tick>=event.arrival-2+p.id%2&&w.tick<event.arrival+2+p.id%2&&
      (available.has(routine.activity)||routine.place==='station'&&routine.activity==='work')){
      return {place:'station',activity:'welcomeGuest'};
    }
    const selected=((p.id+event.day*5)%13)<6;
    if((selected||event.guest&&welcomeIds.has(p.id))&&available.has(routine.activity)&&
      w.tick>=event.at-(event.guest?5:3)+p.id%3&&w.tick<event.until-(event.guest?0:p.id%2))return {place:'square',activity:event.activity};
    return followup(w,p,routine);
  }
  function step(w,log){
    const event=plan(dayOf(w.tick));
    settleTune(w,event,log);
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
    if(event.guest&&!w.festivalTune&&!attendees.some(p=>p.id===pupilId)){
      const tomorrow=(event.day+1)*48+lessonHour;
      const guide=attendees.find(p=>!TownSchool.student(p)&&p.id!==TownSchool.teacher&&
        available.has(TownRoutines.daily({...w,tick:tomorrow},p).activity));
      if(guide)w.festivalTune={phase:'waiting',day:event.day,guide:guide.id,source};
    }
  }
  return {plan,upcoming,passenger,destination,step,gathering,crowdStops,followup,tuneConversation,valid};
})();
