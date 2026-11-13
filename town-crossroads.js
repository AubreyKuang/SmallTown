'use strict';

const TownCrossroads=(()=>{
  const stories=[
    {
      title:'晚班车前的试吃',ids:[1,2],open:17,deadline:32,
      clue:'Alice 已经订好晚班车，Bob 的摊子却要收到傍晚。两个人约好出发前试吃新面包。',
      lines:['等你收完摊，我应该已经在站台上了。','说好了要认真给你试吃。我得想想这摊怎么收。'],
      choices:[
        {label:'请 Bob 提早收摊',hint:'今天 16:30 在面包店见。Alice 照常搭晚班车。',at:33,place:'bakery',result:'Bob 提早收了摊，在面包店试吃后说面包边可以再脆一点。Alice 带着这句话赶上了晚班车。'},
        {label:'帮 Alice 改签早班车',hint:'今天 19:30 在面包店见，Alice 明早出发。',at:39,place:'bakery',result:'Alice 改乘次日早班车。Bob 收摊后慢慢试完了一整片，Alice 把他说的写在了配方背面。'},
        {label:'把试吃搬到站台',hint:'今天 18:00 在车站见，只有半小时。',at:36,place:'station',result:'Bob 把面包纸袋带到了站台。两人分吃了一块，Alice 把剩下的带上了火车。'}
      ],
      missed:'Bob 收完摊赶到时，晚班车已经走了。Alice 回镇后，他想去面包店解释。',
      later:'Bob 到面包店解释了那天为什么没赶上。Alice 把带回来的手写食谱摊开，两人重新约了试吃。',
      laterAt:136,laterPlace:'bakery'
    },
    {
      title:'放学前的旧书',ids:[25,3],open:113,deadline:131,
      clue:'Marin 想在放学前拿到借给 Newton 的故事书，Newton 却答应傍晚去车站帮忙。',
      lines:['今天想念那本旧故事书，孩子们还等着结尾。','我带着书，但傍晚答应了车站的人去搭把手。'],
      choices:[
        {label:'让 Newton 午后绕去学校',hint:'今天 14:00 在学校交书，赶得上课后朗读。',at:124,place:'school',result:'Newton 午后把书送进学校。Marin 在放学前念完了故事，几个孩子抢着猜中了结尾。'},
        {label:'让 Marin 放学后去车站取书',hint:'今天 18:00 取书。车站的帮忙照常，故事留到明天。',at:132,place:'station',result:'Marin 到车站取走了旧书。Newton 顺便夹进一张画着站台的书签，明天读书时正好用得上。'}
      ],
      missed:'放学铃响时书还没送到。Marin 请孩子们各自猜一个结尾，Newton 知道后决定明天把书带来。',
      later:'Newton 把旧书带到学校，Marin 把孩子们猜过的结尾念给他听。两人一起挑了一个最意外的版本。',
      laterAt:171,laterPlace:'school'
    },
    {
      title:'灯亮前的商街',ids:[7,8],open:209,deadline:230,
      clue:'Iris 想赶在天黑前挂好灯笺，Owen 的摊位还没收。两个人各腾不出一双手。',
      lines:['灯笺还差一根绳，再晚一点就看不清了。','我能帮你，但摊子还剩两箱东西没收。'],
      choices:[
        {label:'先帮 Owen 收摊，再去广场',hint:'今天 18:30 到广场挂灯。',at:229,place:'square',result:'Iris 先帮 Owen 抬完箱子，两人在广场挂好了灯笺。第一盏灯亮起来时，Owen 还没来得及摘围巾。'},
        {label:'把灯笺挂到摊位旁',hint:'今天 19:30 在商街挂灯，Owen 可以留在摊位。',at:231,place:'market',result:'Iris 把灯笺搬到商街。Owen 边收摊边扶着绳头，最后一位客人也留下来看灯亮。'}
      ],
      missed:'天黑后绳子还是没挂好。Iris 把灯笺收回袋里，Owen 第二天带来了一小卷新绳。',
      later:'Owen 带来新绳，和 Iris 在白天把灯笺重新挂好。两人约好下次先给彼此留一段时间。',
      laterAt:276,laterPlace:'square'
    }
  ];
  const modes=[
    {place:'station',contact:3,tick:36,label:'傍晚去车站，可能碰见 Newton',habit:'去站台看看'},
    {place:'bakery',contact:1,tick:37,label:'傍晚去面包店，可能碰见 Alice',habit:'顺路捎面包'},
    {place:'square',contact:7,tick:36,label:'傍晚去广场，可能碰见 Iris',habit:'在广场歇脚'},
    {place:'market',contact:8,tick:36,label:'傍晚去商街，可能碰见 Owen',habit:'帮忙收摊'},
    {place:'station',contact:3,tick:36,label:'傍晚去车站，可能碰见 Newton',habit:'去站台看看'},
    {place:'square',contact:7,tick:36,label:'傍晚去广场，可能碰见 Iris',habit:'在广场歇脚'}
  ];
  const person=(w,id)=>w.people.find(p=>p.id===id);
  const dayStart=tick=>tick-tick%48;
  const entries=w=>Object.entries(w.crossroads??{});
  const view=(key,state)=>({...state,key,story:stories[key],area:key.startsWith('home-')?modes[Number(key.slice(5))]:null});
  const list=w=>entries(w).map(([key,state])=>view(key,state)).sort((a,b)=>b.open-a.open);
  const active=w=>list(w).filter(e=>e.phase==='open'||e.phase==='planned'||e.phase==='later');
  const at=place=>({place,activity:'crossroads'});
  function start(w){
    if(w.crossroadsStart!=null)return;
    const trip=TownTravel.tripFor(w,person(w,1));
    const ready=trip&&!trip.returned?Math.max(w.tick,trip.back+4):w.tick;
    w.crossroadsStart=dayStart(ready)+(ready%48>=17?48:0);
  }
  function open(w,key,info,log){
    const root=log(info.clue,null,'crossroads-open',info.ids);
    (w.crossroads??={})[key]={...info,open:w.tick,root,phase:'open'};
  }
  function prepare(w,log){
    const start=w.crossroadsStart;
    for(const [index,story] of (start==null?[]:stories.entries())){
      if(w.tick<start+story.open||w.tick>start+story.deadline||w.crossroads?.[index])continue;
      if(story.ids.some(id=>TownTravel.away(person(w,id))))continue;
      if(index===0){
        const traveler=person(w,1);
        if(!TownTravel.tripFor(w,traveler)||TownTravel.tripFor(w,traveler).returned){
          TownTravel.book(w,traveler,(text,type,ids)=>log(text,null,type,ids));
        }
        if(TownTravel.tripFor(w,traveler)?.depart!==start+38)continue;
      }
      open(w,String(index),{title:story.title,clue:story.clue,ids:story.ids,deadline:start+story.deadline,base:start},log);
    }
    for(const house of TownBuild.buildings(w)){
      const key='home-'+house.plot;
      if(!house.movedIn||w.tick>house.moveIn+9||w.crossroads?.[key])continue;
      const newcomer=w.people.find(p=>p.homePlot===house.plot),area=modes[house.plot];
      const neighbor=person(w,area.contact),place=Town.places[area.place].name;
      open(w,key,{title:'回家的那条路',clue:`${newcomer.name} 刚搬到${TownBuild.plots[house.plot].name}，还认不全附近的路。${neighbor.name} 熟悉${place}一带，也许能带一段。`,
        ids:[newcomer.id,neighbor.id],deadline:dayStart(w.tick)+30,base:dayStart(w.tick)},log);
    }
  }
  function choices(entry){
    if(entry.story)return entry.story.choices.map(option=>({...option,at:entry.base+option.at}));
    const place=Town.places[entry.area.place].name;
    return [{label:'安排两人顺路走一段',hint:`在${place}碰头，一起认回家的路。`,
      at:entry.base+entry.area.tick,place:entry.area.place}];
  }
  function available(w,entry,option){
    if(entry.phase!=='open'||w.tick>entry.deadline||option.at<=w.tick||entry.ids.some(id=>TownTravel.away(person(w,id))))return false;
    return !active(w).some(other=>{
      const meeting=appointment(other);
      return meeting&&Math.abs(meeting.at-option.at)<=3&&other.ids.some(id=>entry.ids.includes(id));
    });
  }
  function choose(w,key,index,log){
    if(typeof key!=='string'||!Object.hasOwn(w.crossroads??{},key)||!w.tokens)return false;
    const entry=view(key,w.crossroads[key]);
    if(!Number.isInteger(index))return false;
    const option=choices(entry)[index];
    if(!option||!available(w,entry,option))return false;
    if(key==='0'&&index===1&&!TownTravel.deferMorning(w,person(w,1)))return false;
    w.tokens--;
    Object.assign(w.crossroads[key],{phase:'planned',choice:index,parent:log(option.label,entry.root,'crossroads-choice',entry.ids)});
    return true;
  }
  function appointment(entry){
    if(entry.phase==='planned')return choices(entry)[entry.choice];
    if(entry.phase==='later'&&entry.story)return {at:entry.base+entry.story.laterAt,place:entry.story.laterPlace};
    return null;
  }
  function destination(w,p){
    for(const [key,state] of entries(w)){
      if(!state.ids.includes(p.id)||!['planned','later'].includes(state.phase))continue;
      const meeting=appointment(view(key,state));
      if(meeting&&w.tick>=meeting.at-3&&w.tick<=meeting.at)return at(meeting.place);
    }
    return null;
  }
  function neighborhood(w,p,routine){
    if(!['walk','coffee','shop','read','rest','cook'].includes(routine.activity))return routine;
    if(p.homePlot!=null){
      const area=modes[p.homePlot],home=TownBuild.house(w,p.homePlot);
      if(home&&w.tick>=dayStart(home.moveIn)+48&&w.tick%48>=area.tick-3&&w.tick%48<=area.tick)return at(area.place);
    }
    for(const house of TownBuild.buildings(w)){
      const area=modes[house.plot];
      if(p.id===area.contact&&w.tick>=dayStart(house.moveIn)+48&&w.tick%48>=area.tick-3&&w.tick%48<=area.tick)return at(area.place);
    }
    return routine;
  }
  function outcome(w,entry,text,log,remember,emotion){
    const [a,b]=entry.ids.map(id=>person(w,id));
    const source=log(text,entry.parent??entry.root,'crossroads-result',entry.ids);
    remember(a,b,'crossroads',emotion,text,source,74);
    remember(b,a,'crossroads',emotion,text,source,74);
    const state=w.crossroads[entry.key];
    Object.assign(state,{phase:'done',result:text,parent:source});
    if(entry.story&&emotion>0)Object.assign(state,{mementoAt:w.tick,mementoRoute:entry.phase});
  }
  function settle(w,log,remember){
    for(const entry of active(w)){
      const [a,b]=entry.ids.map(id=>person(w,id));
      const meeting=appointment(entry);
      if(meeting&&w.tick>=meeting.at){
        if(a.place===meeting.place&&b.place===meeting.place){
          const text=entry.phase==='later'?entry.story.later:meeting.result??
            `${b.name} 和 ${a.name} 在${Town.places[meeting.place].name}碰头，一起走了一段回家的路。`;
          outcome(w,entry,text,log,remember,.58);
        }else if(entry.story&&entry.phase!=='later'){
          const text=`${entry.story.missed}`;
          Object.assign(w.crossroads[entry.key],{phase:'later',result:text,parent:log(text,entry.parent,'crossroads-result',entry.ids)});
        }else{
          outcome(w,entry,`${a.name} 和 ${b.name} 没能在约好的地方碰头，各自先回去了。`,log,remember,-.1);
        }
      }else if(entry.phase==='open'&&w.tick>(entry.story?entry.base+entry.story.choices.at(-1).at:entry.base+entry.area.tick)){
        if(entry.story){
          const text=entry.story.missed;
          Object.assign(w.crossroads[entry.key],{phase:'later',result:text,parent:log(text,entry.root,'crossroads-result',entry.ids)});
        }else{
          const text=`${a.name} 今天自己认了回家的路。以后还会经过${Town.places[entry.area.place].name}。`;
          const source=log(text,entry.root,'crossroads-result',entry.ids);
          Object.assign(w.crossroads[entry.key],{phase:'done',result:text,parent:source});
        }
      }
    }
    for(const p of w.people){
      if(p.homePlot==null)continue;
      const area=modes[p.homePlot],home=TownBuild.house(w,p.homePlot);
      if(!home||w.tick<dayStart(home.moveIn)+48||w.tick%48<area.tick-3||w.tick%48>area.tick||p.place!==area.place)continue;
      const neighbor=person(w,area.contact);
      const text=neighbor.place===p.place?
        `${p.name} 顺路在${Town.places[p.place].name}碰见 ${neighbor.name}，两人聊了一会儿。`:null;
      if(!text||w.events.some(e=>e.type==='neighborhood'&&e.tick>=dayStart(w.tick)&&e.ids[0]===p.id))continue;
      const source=log(text,null,'neighborhood',[p.id,neighbor.id]);
      remember(p,neighbor,'neighborhood',.28,text,source,60);
      remember(neighbor,p,'neighborhood',.28,text,source,60);
    }
  }
  function clue(w,a,b){
    const entry=active(w).find(item=>item.phase==='open'&&w.tick<=item.deadline&&(item.ids.includes(a.id)||item.ids.includes(b.id)));
    if(!entry)return null;
    const speaker=entry.ids.includes(a.id)&&entry.ids.includes(b.id)?person(w,entry.ids[0]):entry.ids.includes(a.id)?a:b;
    const listener=speaker===a?b:a;
    const lines=entry.story&&entry.ids.includes(a.id)&&entry.ids.includes(b.id)?entry.story.lines:
      [entry.clue,'听起来还有时间。要不要先把两边的安排对一对？'];
    return {topic:entry.title,source:entry.root,opportunity:entry.key,
      lines:lines.map((text,i)=>({speaker:(i?listener:speaker).id,text}))};
  }
  function ending(w,key){
    const state=w.crossroads?.[key],story=stories[key];
    if(!story||state?.phase!=='done')return null;
    if(state.mementoAt!=null)return {tick:state.mementoAt,route:state.mementoRoute};
    // Older saves already hold the exact completed branch text and scheduled date.
    if(state.result===story.later)return {tick:state.base+story.laterAt,route:'later'};
    const choice=story.choices[state.choice];
    if(choice&&state.result===choice.result)return {tick:state.base+choice.at,route:'planned'};
    return null;
  }
  function valid(w){
    if(w.crossroadsStart!=null&&(!Number.isInteger(w.crossroadsStart)||w.crossroadsStart<0||w.crossroadsStart>w.tick+192||w.crossroadsStart%48))return false;
    if(w.crossroads==null)return true;
    return typeof w.crossroads==='object'&&!Array.isArray(w.crossroads)&&entries(w).every(([key,entry])=>{
      if(!entry||!/^([0-2]|home-[0-5])$/.test(key)||!Number.isInteger(entry.open)||!Number.isInteger(entry.base)||
        !Number.isInteger(entry.deadline)||entry.deadline<entry.open||entry.open>w.tick||entry.base<0||entry.base%48||
        !Number.isInteger(entry.root)||entry.root<1||entry.root>w.sequence||!Array.isArray(entry.ids)||
        entry.ids.length!==2||entry.ids[0]===entry.ids[1]||entry.ids.some(id=>!person(w,id))||
        typeof entry.title!=='string'||typeof entry.clue!=='string'||!['open','planned','later','done'].includes(entry.phase))return false;
      const item=view(key,entry);
      const hasMemento=entry.mementoAt!=null||entry.mementoRoute!=null;
      if(hasMemento&&(!item.story||entry.phase!=='done'||!Number.isSafeInteger(entry.mementoAt)||entry.mementoAt<entry.open||
        entry.mementoAt>w.tick||(entry.mementoRoute!=='later'&&(entry.mementoRoute!=='planned'||!Number.isInteger(entry.choice)||!choices(item)[entry.choice]))))return false;
      return (!item.area||w.people.some(p=>p.id===entry.ids[0]&&p.homePlot===Number(key.slice(5))))&&
        (entry.phase!=='planned'||Number.isInteger(entry.choice)&&!!choices(item)[entry.choice])&&
        (entry.phase!=='later'||!!item.story);
    });
  }
  return {start,active,list,choices,available,appointment,prepare,choose,destination,neighborhood,settle,clue,ending,valid,modes};
})();
