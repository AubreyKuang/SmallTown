'use strict';

const TownWishes=(()=>{
  const profiles={
    1:{other:2,title:'想做一炉有人记得的面包',fear:'Bob 总说「都挺好」。我其实想听一句真话。',beats:[
      {place:'bakery',hour:34,thought:'我把新配方烤了一小份。Bob 真来试吃的话，他会说实话吗？',result:'Alice 把试做的面包递给 Bob。Bob 说外皮很好，就是糖放多了。'},
      {place:'bakery',hour:34,thought:'他说得对，糖放多了。今天想请他一起把最后一炉做完。',result:'Alice 和 Bob 改完了配方，把第一炉一起出炉的面包留在了柜台上。'}]},
    3:{other:7,title:'想找一个相信自己的人',fear:'如果把这些巧合说出口，Iris 会不会以为我想太多了？',beats:[
      {place:'cafe',hour:34,thought:'我写下了几件说不通的巧合。想先给 Iris 看一页。',result:'Newton 只给 Iris 看了一页笔记。Iris 没有笑，还问他第一件巧合是什么时候发生的。'},
      {place:'square',hour:34,thought:'Iris 还记得我说的第一件事。也许我们可以一起看看接下来会发生什么。',result:'Newton 和 Iris 在广场坐下，约好各记一件小镇里的怪事。'}]},
    21:{other:17,title:'想知道旧车票通往哪里',fear:'我怕在意这张旧车票的只有我。',beats:[
      {place:'station',hour:34,thought:'Grace 似乎认得那个站名。我想问问，可别耽误她赶车。',result:'Nina 向 Grace 问起旧车票。Grace 说小时候，她从那一站坐车来看过河边的灯。'},
      {place:'cafe',hour:34,thought:'我想把她说的线路画下来。下次别人捡到车票，也能找到那段故事。',result:'Nina 和 Grace 在咖啡厅画了一张旧线路图，还标上了当年看灯的地方。'}]},
    26:{other:27,title:'想让 Kit 看见我的纸飞机',fear:'上次才扔出去就掉下来了，我怕他又看见。',beats:[
      {place:'schoolyard',hour:29,thought:'我重折了一架。要是 Kit 放学后还在，我想给他试试。',result:'Mia 把新飞机递给 Kit。Kit 没有先扔，只问她想不想一起数三下。'},
      {place:'schoolyard',hour:29,thought:'今天我们想试试能不能飞过花坛。就算飞不过，也可以再折一架。',result:'Mia 和 Kit 一起扔出纸飞机。这次它飞过了花坛。'}]}
  };
  const ids=Object.keys(profiles).map(Number);
  const profile=id=>profiles[id];
  const state=(w,id)=>w.wishes?.[id]??{stage:0};
  const day=tick=>Math.floor(tick/48);
  const person=(w,id)=>w.people.find(p=>p.id===id);
  const beat=(id,s)=>profile(id)?.beats[s.stage];
  const trust=(w,a,b)=>(b.trust[a.id]||0)+NPCMemory.influence(w,b.id,a.id)*7;
  const unavailable=new Set(['sleep','class','teach','prepare']);
  function canRoll(w,id){
    const s=state(w,id);
    return !!beat(id,s)&&!!person(w,id)&&!s.plan&&s.lastDay!==day(w.tick)&&s.advanced!==day(w.tick)&&w.tokens>0;
  }
  function roll(w,id,random,log){
    if(!canRoll(w,id))return null;
    const p=person(w,id),goal=beat(id,state(w,id)),other=profile(id).other;
    w.wishes??={};
    const s=w.wishes[id]??={stage:0};
    const die=1+Math.floor(random()*6);
    w.tokens--;s.die=die;s.lastDay=day(w.tick);
    const band=die<=2?'1–2 点：犹豫，没开口':die<=4?'3–4 点：自己去等，对方按原日程走':'5–6 点：给双方留出碰面的机会';
    const root=log(`你为 ${p.name} 的心愿掷出了 ${die} 点（${band}）。`,null,'wish-roll',[id,other]);
    if(die<=2){
      p.mood=Math.max(0,p.mood-3);
      s.latest='原本想开口，临到头还是把话咽了回去。';
      log(`${p.name} ${s.latest}`,root,'wish-result',[id,other]);
    }else{
      let at=day(w.tick)*48+goal.hour;
      if(w.tick>at+3)at+=48;
      at=Math.max(at,w.tick+1);
      s.plan={at,until:at+5,root};
      s.latest=die>=5?'两人可能腾出时间，在同一个地方碰面。':'自己会去等一会儿，对方还按原来的日程走。';
      log(`${p.name} ${s.latest}`,root,'wish-plan',[id,other]);
    }
    return root;
  }
  function destination(w,p,routine){
    if(unavailable.has(routine.activity))return routine;
    for(const id of ids){
      const s=state(w,id),plan=s.plan,goal=beat(id,s);
      if(!plan||w.tick<plan.at||w.tick>plan.until||!goal)continue;
      const other=profile(id).other;
      if(p.id!==id&&(p.id!==other||s.die<5||trust(w,person(w,id),p)<0))continue;
      if(routine.activity==='work'&&routine.place!==goal.place)continue;
      return {place:goal.place,activity:'wish'};
    }
    return routine;
  }
  function step(w,log,remember){
    for(const id of ids){
      const existing=state(w,id),goal=beat(id,existing);
      const a=person(w,id),b=person(w,profile(id).other);
      if(!goal||!a||!b||existing.advanced===day(w.tick))continue;
      const plan=existing.plan;
      const together=a.place===goal.place&&b.place===goal.place&&!unavailable.has(a.activity)&&!unavailable.has(b.activity);
      const expected=plan?w.tick>=plan.at:w.tick%48===goal.hour+4;
      const willing=trust(w,a,b)>=(existing.stage===0?0:5);
      if(expected&&together&&willing&&(plan||trust(w,a,b)>=6)){
        w.wishes??={};
        const s=w.wishes[id]??={stage:0};
        const source=log(goal.result,plan?.root??null,'wish-result',[a.id,b.id]);
        s.stage++;s.latest=goal.result;s.advanced=day(w.tick);delete s.plan;
        remember(a,b,'wish-progress',.8,`我一直在想这件事，今天总算迈了一步。${goal.result}`,source);
        remember(b,a,'wish-progress',.63,`我没想到这对 ${a.name} 那么重要。${goal.result}`,source);
        a.mood=Math.min(100,a.mood+12);b.mood=Math.min(100,b.mood+5);
      }else if(plan&&w.tick>=plan.until){
        existing.latest=together?'见到对方了，但话还没说出口。':'等了一阵，今天没有碰上对方。';
        log(`${a.name} ${existing.latest}`,plan.root,'wish-result',[a.id,b.id]);
        delete existing.plan;
      }
    }
  }
  function thought(w,p,activity){
    const s=state(w,p.id),goal=beat(p.id,s);
    if(goal&&s.die<=2&&s.lastDay===day(w.tick))return '刚才还是没开口。让我明天再想一想。';
    if(goal)return goal.thought;
    if(profile(p.id))return s.latest||'这件事，我会一直记得。';
    if(p.mood<43)return '今天想找个清静的地方，自己待一会儿。';
    const lines={work:'还有一点事没做完。忙完想给自己留点时间。',class:'刚才那一页还没听懂，下课想再问问。',
      homework:'先把今天的作业写完，再看看外面还有谁。',walk:'想再走一小段，看看街上会碰到谁。',
      coffee:'这杯还没喝完，可以多坐一会儿。',sleep:'……',breakfast:'先吃点东西，等会儿还有事要做。',
      read:'把这一页读完再放下吧。',stars:'街灯熄了，反而看得见平时看不见的星星。',
      rest:'外面还听得到脚步声。我想再坐一会儿。',cook:'闻着差不多了。等会儿再尝尝咸淡。'};
    return lines[activity]??'想先把手头的事做完。';
  }
  const activeRoot=(w,root)=>ids.some(id=>state(w,id).plan?.root===root);
  function valid(w){
    if(w.wishes==null)return true;
    return typeof w.wishes==='object'&&!Array.isArray(w.wishes)&&Object.entries(w.wishes).every(([id,s])=>
      Object.hasOwn(profiles,id)&&w.people.some(p=>p.id===Number(id))&&s&&Number.isInteger(s.stage)&&s.stage>=0&&s.stage<=profiles[id].beats.length&&
      (s.die==null||Number.isInteger(s.die)&&s.die>=1&&s.die<=6)&&
      (s.latest==null||typeof s.latest==='string')&&
      (s.plan==null||(Number.isInteger(s.plan.root)&&s.plan.root>0&&s.plan.root<=w.sequence&&
        Number.isInteger(s.plan.at)&&s.plan.at>=0&&s.plan.at<=w.tick+48&&s.plan.until===s.plan.at+5&&s.stage<profiles[id].beats.length)));
  }
  return {profile,ids,state,beat,canRoll,roll,destination,step,thought,activeRoot,valid};
})();
