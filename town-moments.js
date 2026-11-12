'use strict';

const TownMoments=(()=>{
  const scenes=[
    {title:'多出来的一袋面包',place:'bakery',prompt:(a,b)=>`${a} 烤多了一袋面包，${b} 路过时闻到了香味，却没好意思开口。`,
      hint:'让面包袋滑到桌边',payoff:'分了一袋刚出炉的面包',favor:'带来一罐果酱，回赠上次的面包'},
    {title:'被风吹走的画',place:'square',prompt:(a,b)=>`${a} 的画纸掉到了地上，${b} 正在附近，不确定对方需不需要帮忙。`,
      hint:'让画纸吹向对方脚边',payoff:'一起把掉在地上的画捡好',favor:'带来一张新画纸，说上次多亏了对方'},
    {title:'书页里的旧车票',place:'station',prompt:(a,b)=>`${a} 捡到一张夹在书页里的旧车票，旁边的 ${b} 好像认出了上面的站名。`,
      hint:'让旧车票翻到有字的一面',payoff:'聊起了车票上的旧站名',favor:'带来一张旧车站的照片，继续上次的话题'},
    {title:'还剩一个座位',place:'cafe',prompt:(a,b)=>`${a} 拿着杯子四处张望，${b} 身边正好空着一个座位。`,
      hint:'让空椅子轻轻转出来',payoff:'坐下来聊了好一会儿',favor:'见到对方时，顺手留好了上次的座位'},
    {title:'墙外的纸飞机',place:'schoolyard',prompt:(a,b)=>`${a} 的纸飞机飞过了操场围栏，${b} 刚好看到它落在哪里。`,
      hint:'让纸飞机在风里抖一下',payoff:'一起找回了飞走的纸飞机',favor:'折了一架新的纸飞机，拿来一起试飞'},
    {title:'两个人的风铃',place:'market',prompt:(a,b)=>`${a} 想挂一串新风铃，但一只手扶不住梯子。${b} 正从摊位边经过。`,
      hint:'让风铃提前响一声',payoff:'一起把风铃挂了起来',favor:'来检查上次挂好的风铃，还帮忙拧紧了绳结'}
  ];
  const get=(w,id)=>w.people.find(p=>p.id===id);
  const sceneFor=m=>scenes[m.kind];
  const active=w=>['open','waiting'].includes(w.moment?.state)?w.moment:null;
  const together=(a,b,place)=>a.place===b.place&&(!place||a.place===place);
  const bond=(w,a,b)=>(b.trust[a.id]||0)+NPCMemory.influence(w,b.id,a.id)*10;
  function start(w,log){
    const hour=w.tick%48;
    if(![17,22,29,34,39].includes(hour)||active(w)||w.moment?.offered===w.tick)return;
    // The first morning starts with an observable situation in a currently occupied place.
    const order=(Math.floor(w.tick/48)*5+hour)%scenes.length;
    for(let i=0;i<scenes.length;i++){
      const kind=(order+i)%scenes.length,scene=scenes[kind];
      const people=w.people.filter(p=>p.place===scene.place&&(scene.place==='schoolyard'?TownSchool.student(p):!TownSchool.student(p)));
      if(people.length<2)continue;
      const worker=people.find(p=>p.job===scene.place);
      if(scene.place==='bakery'&&!worker)continue;
      const a=worker||people[0];
      const candidates=people.filter(p=>p!==a);
      const b=candidates[(w.tick+Math.floor(w.seed/32))%candidates.length];
      const offered=w.tick;
      const root=log(scene.prompt(a.name,b.name),null,'moment-start',[a.id,b.id]);
      w.moment={kind,a:a.id,b:b.id,root,offered,until:offered+4,state:'open'};
      return;
    }
  }
  function finish(w,m,success,mode,log,remember){
    const a=get(w,m.a),b=get(w,m.b),scene=sceneFor(m);
    m.state='done';
    m.success=success;
    m.result=success
      ? `${a.name} 和 ${b.name} ${scene.payoff}。`
      : mode==='reunion'? `${a.name} 等了一会儿，${b.name} 没赶到。`:`${a.name} 和 ${b.name} 擦肩而过。`;
    const source=log(m.result,m.root,'moment-result',[a.id,b.id]);
    if(!success)return;
    const strength=mode==='reunion'?.95:mode==='hint'?.65:.45;
    remember(a,b,'town-moment',strength,`我和 ${b.name} ${scene.payoff}。`,source);
    remember(b,a,'town-moment',strength,`那天我和 ${a.name} ${scene.payoff}。`,source);
    a.mood=Math.min(100,a.mood+8);b.mood=Math.min(100,b.mood+8);
    w.favors??=[];
    w.favors.push({kind:m.kind,a:m.a,b:m.b,root:source,after:w.tick-w.tick%48+48,until:w.tick+144});
    if(w.favors.length>12)w.favors.shift();
  }
  function choose(w,root,mode,log,remember){
    const m=active(w);
    if(!m||m.state!=='open'||m.root!==root||!['hint','reunion','leave'].includes(mode))return false;
    const a=get(w,m.a),b=get(w,m.b),scene=sceneFor(m);
    if(mode!=='leave'&&w.tokens<=0)return false;
    if(mode==='hint'&&!together(a,b,scene.place))return false;
    if(mode!=='leave')w.tokens--;
    if(mode==='reunion'){
      m.state='waiting';
      m.until=w.tick-w.tick%48+48+(scene.place==='schoolyard'?29:34);
      log(`${a.name} 决定明天到原处等 ${b.name}。`,m.root,'moment-plan',[a.id,b.id]);
    }else{
      if(mode==='hint')log(scene.hint,m.root,'moment-choice',[a.id,b.id]);
      finish(w,m,mode==='hint'||together(a,b,scene.place)&&(bond(w,a,b)>=6||b.temperament==='generous'),mode,log,remember);
    }
    return true;
  }
  function destination(w,p){
    const m=active(w);
    if(m?.state==='waiting'&&p.id===m.a&&w.tick>=m.until-2&&w.tick<=m.until)return sceneFor(m).place;
  }
  function step(w,log,remember){
    for(const favor of w.favors??[]){
      if(w.tick<favor.after||w.tick>favor.until)continue;
      const a=get(w,favor.a),b=get(w,favor.b);
      if(a.place==='homes'||!together(a,b))continue;
      const text=`${b.name} 又遇见了 ${a.name}，${scenes[favor.kind].favor}。`;
      const id=log(text,favor.root,'moment-favor',[b.id,a.id]);
      remember(a,b,'town-favor',.55,text,id);
      remember(b,a,'town-favor',.45,text,id);
      favor.until=w.tick-1;
    }
    if(w.favors)w.favors=w.favors.filter(favor=>favor.until>=w.tick);
    const m=active(w);
    if(m&&w.tick>=m.until){
      const a=get(w,m.a),b=get(w,m.b),place=sceneFor(m).place;
      const reunion=m.state==='waiting';
      finish(w,m,together(a,b,place)&&(reunion||bond(w,a,b)>=6||b.temperament==='generous'),
        reunion?'reunion':'leave',log,remember);
      return;
    }
    start(w,log);
  }
  function valid(w){
    const actors=m=>get(w,m.a)&&get(w,m.b)&&m.a!==m.b&&Number.isInteger(m.kind)&&!!scenes[m.kind]&&
      Number.isInteger(m.root)&&m.root>0&&m.root<=w.sequence&&Number.isInteger(m.until);
    const m=w.moment;
    return (m==null||(actors(m)&&['open','waiting','done'].includes(m.state)&&Number.isInteger(m.offered)&&
      (m.state!=='done'||typeof m.result==='string')))&&(w.favors==null||
      (Array.isArray(w.favors)&&w.favors.length<=12&&w.favors.every(f=>actors(f)&&Number.isInteger(f.after))));
  }
  return {sceneFor,active,destination,step,choose,valid};
})();
