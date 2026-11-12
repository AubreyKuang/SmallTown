'use strict';

const TownTwilight=(()=>{
  const interval=3,start=36,end=41;
  const hosts=[
    {host:7,guests:[17,2],prompt:'Iris 想把画了一半的河岸带来，听听别人记得的风景。',topic:['聊起了小时候河岸涨水的那天','画下了今天最后一道落在桥上的光'],keepsake:['一页旧河岸速写','一页落日速写']},
    {host:17,guests:[21,6],prompt:'Grace 带了一张旧车票，想找人听完她还没讲完的故事。',topic:['画出了旧车票通往的那条线路','说起了错过末班车的那个冬天'],keepsake:['一张手绘线路图','一张写满字的旧车票']},
    {host:1,guests:[2,9],prompt:'Alice 留了两块橙皮面包，想听听第一口是什么味道。',topic:['尝着橙皮面包，商量下回少放一点糖','分了橙皮面包，还包了一块给店里晚班的人'],keepsake:['一张改过的配方','一个系着细绳的纸袋']}
  ];
  const free=new Set(['read','rest','cook','walk','coffee','shop','twilight']);
  const dayOf=tick=>Math.floor(tick/48);
  const get=(w,id)=>w.people.find(p=>p.id===id);
  function plan(w){
    const day=dayOf(w.tick);
    if(day%interval!==0)return null;
    const profile=hosts[(day/interval)%hosts.length];
    const rain=w.weather==='细雨';
    return {...profile,day,at:day*48+start,until:day*48+end,place:rain?'cafe':'square',weather:w.weather};
  }
  const state=(w,scene)=>w.twilight?.current?.day===scene.day?w.twilight.current:null;
  function lit(w){
    const scene=plan(w);
    return scene&&w.tick>=scene.at&&w.tick<scene.until?scene.place:null;
  }
  function canInvite(w,id){
    const scene=plan(w);
    return !!scene&&w.tick<scene.until&&scene.guests.includes(id)&&w.tokens>0&&
      !state(w,scene)?.invite&&!state(w,scene)?.result;
  }
  function invite(w,id,random,log){
    if(!canInvite(w,id))return null;
    const scene=plan(w),die=1+Math.floor(random()*6);
    w.twilight??={cards:[]};
    const current=w.twilight.current=state(w,scene)??{day:scene.day};
    w.tokens--;
    const host=get(w,scene.host),guest=get(w,id);
    const root=log(`你让灯笺捎给 ${guest.name}，掷出了 ${die} 点。`,null,'twilight-invite',[host.id,id]);
    current.invite={id,die,root};
    return root;
  }
  function destination(w,p,routine){
    if(!free.has(routine.activity)||w.tick%48<start||w.tick%48>=end)return routine;
    const scene=plan(w);
    if(!scene)return routine;
    const current=state(w,scene);
    const guest=current?.result?current.result.guest:current?.invite?.die>=3?current.invite.id:null;
    if(p.id!==scene.host&&p.id!==guest)return routine;
    return {place:scene.place,activity:'twilight'};
  }
  function step(w,log,remember){
    const hour=w.tick%48;
    if(hour<start||hour>end)return;
    const scene=plan(w);
    if(!scene||state(w,scene)?.result)return;
    const host=get(w,scene.host);
    const invited=state(w,scene)?.invite;
    const candidates=invited?[invited.id,...scene.guests.filter(id=>id!==invited.id)]:scene.guests;
    const guest=host.activity==='twilight'&&hour<end?candidates.map(id=>get(w,id)).find(p=>
      p.place===scene.place&&free.has(p.activity)&&(p.trust[host.id]??0)>=0&&(host.trust[p.id]??0)>=0):null;
    if(!guest&&hour<end)return;
    w.twilight??={cards:[]};
    const current=w.twilight.current=state(w,scene)??{day:scene.day};
    const choice=scene.guests.indexOf(guest?.id);
    const topic=scene.topic[choice];
    const text=guest?`${host.name} 和 ${guest.name} 在${Town.places[scene.place].name}${topic}。`:
      `${host.name} 今晚没在灯笺旁碰上熟人。`;
    const source=log(text,invited?.root??null,guest?'twilight-meet':'twilight-quiet',guest?[host.id,guest.id]:[host.id]);
    current.result={text,guest:guest?.id??null};
    if(!guest)return;
    remember(host,guest,'twilight',.72,`我和 ${guest.name} ${topic}。`,source);
    remember(guest,host,'twilight',.6,`傍晚见到 ${host.name}，我们${topic}。`,source);
    w.twilight.cards.push({day:scene.day,place:scene.place,weather:scene.weather,host:host.id,guest:guest.id,title:scene.keepsake[choice],text});
    if(w.twilight.cards.length>8)w.twilight.cards.shift();
  }
  const cards=w=>w.twilight?.cards??[];
  const nextDay=w=>dayOf(w.tick)+(interval-dayOf(w.tick)%interval);
  function valid(w){
    if(w.twilight==null)return true;
    const {cards,current}=w.twilight;
    const validDay=day=>Number.isInteger(day)&&day>=0&&day%interval===0&&day<=dayOf(w.tick);
    const validId=id=>w.people.some(p=>p.id===id);
    return Array.isArray(cards)&&cards.length<=8&&cards.every(c=>c&&validDay(c.day)&&validId(c.host)&&validId(c.guest)&&
      typeof c.title==='string'&&typeof c.text==='string'&&['cafe','square'].includes(c.place)&&['晴朗','细雨','小雪'].includes(c.weather))&&
      (current==null||validDay(current.day)&&
        (current.invite==null||validId(current.invite.id)&&Number.isInteger(current.invite.die)&&current.invite.die>=1&&current.invite.die<=6&&
          Number.isInteger(current.invite.root)&&current.invite.root>0&&current.invite.root<=w.sequence)&&
        (current.result==null||typeof current.result.text==='string'&&(current.result.guest===null||validId(current.result.guest))));
  }
  return {plan,state,lit,canInvite,invite,destination,step,cards,nextDay,valid};
})();
