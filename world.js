const Town = (() => {
  const names = ['Alice','Bob','Newton','Mina','Leo','Nora','Iris','Owen','Ada','Theo','Luna','Eli','June','Milo','Ruby','Sam','Grace','Noah','Eva','Kai','Nina','Max','Lily','Finn'];
  const places = {
    homes:{name:'居民区',x:90,y:86}, bakery:{name:'面包店',x:200,y:85},
    cafe:{name:'咖啡厅',x:270,y:86}, market:{name:'商业街',x:345,y:83},
    square:{name:'中央广场',x:232,y:182}, station:{name:'火车站',x:422,y:190},
    forest:{name:'树林',x:92,y:213}
  };
  function create(seed = Date.now()) {
    return {seed:seed>>>0,tick:0,weather:'晴朗',power:false,sequence:0,events:[],pending:[],tokens:3,
      people:names.map((name,i)=>({id:i+1,name,place:'homes',job:['bakery','market','station'][i%3],
        habit:i%4===0||i===1?'cafe':i%4===2?'forest':'square', temperament:i===2?'skeptic':i%3===0?'generous':'practical',
        money:20,mood:65,suspicion:0,trust:{}, override:null,delay:0}))};
  }
  function random(w) {
    w.seed=(Math.imul(w.seed,1664525)+1013904223)>>>0;
    return w.seed/4294967296;
  }
  function log(w,text,parent=null,type='town',ids=[]) {
    const event={id:++w.sequence,tick:w.tick,text,parent,type,ids};
    w.events.push(event);
    if(w.events.length>300){
      const required=new Set(w.pending.map(p=>p.parent));
      if(w.townStory)required.add(w.townStory.root);
      const byId=new Map(w.events.map(e=>[e.id,e]));
      for(const id of [...required]){
        let entry=byId.get(id);
        while(entry?.parent&&!required.has(entry.parent)){
          required.add(entry.parent);entry=byId.get(entry.parent);
        }
      }
      const index=w.events.findIndex((e,i)=>i<w.events.length-100&&!required.has(e.id)&&!w.events.some(child=>child.parent===e.id));
      if(index>=0)w.events.splice(index,1);
    }
    return event.id;
  }
  function memory(w,a,b,kind,emotion,text,source) {
    NPCMemory.record(w,{type:kind,time:w.tick,participants:[a.id,b.id],source},[
      {person:a.id,subject:b.id,emotion,impact:85,interpretation:text}
    ]);
    a.trust[b.id]=Math.max(-100,Math.min(100,(a.trust[b.id]||0)+Math.round(emotion*12)));
  }
  function schedule(w,p) {
    const h=w.tick%48/2;
    if(p.override?.until>w.tick)return {place:p.override.place,activity:p.override.place==='station'&&p.override.bus?'commute':'visit'};
    const project=TownStories.destination(w,p);
    if(project)return {place:project,activity:'project'};
    if(w.power&&(p.id%5===0||p.id%7===0)&&h>=19+(p.id%3)*.5&&h<21+(p.id%2)*.5)return {place:'square',activity:'stars'};
    return TownRoutines.daily(w,p);
  }
  function activity(w,p){
    if(Object.hasOwn(TownRoutines.labels,p.activity))return p.activity;
    const planned=schedule(w,p);
    return planned.place===p.place?planned.activity:p.place==='homes'?'rest':p.job===p.place?'work':'visit';
  }
  function influence(w,id,kind,place) {
    const p=w.people.find(person=>person.id===id);
    if(!p||(kind==='delay'&&!TownRoutines.canDelay(w,p))||w.tokens<=0||!['delay','lost','coin','bus','lottery','visit'].includes(kind)||(kind==='visit'&&!Object.hasOwn(places,place)))return false;
    w.tokens--;
    p.suspicion+=p.temperament==='skeptic'?2:1;
    let parent;
    switch(kind){
      case 'delay':
        p.delay=w.tick-w.tick%48+TownRoutines.shift(p,w.tick).start+1;p.mood-=8;
        parent=log(w,`${p.name} 耽搁了出门，原来的班车已经走了。`,null,'delay',[id]);
        w.pending.push({kind:'late',person:id,parent,at:p.delay});
        break;
      case 'lost':
        p.mood-=10;
        parent=log(w,`${p.name} 发现常用钥匙不见了。`,null,'lost',[id]);
        w.pending.push({kind:'help',person:id,parent,at:w.tick+1,until:w.tick+8});
        break;
      case 'coin': p.money+=2;p.mood+=8;log(w,`${p.name} 捡到两枚硬币。`,null,'coin',[id]);break;
      case 'bus':
        p.delay=0;p.mood+=5;p.override={place:'station',until:w.tick+2,bus:true};
        log(w,`${p.name} 刚好赶上去车站的公交车。`,null,'bus',[id]);break;
      case 'lottery':
        p.money+=80;p.mood+=15;
        parent=log(w,`${p.name} 的旧彩票中了 80 元。`,null,'lottery',[id]);
        w.pending.push({kind:'loan',person:id,parent,at:w.tick+2,until:w.tick+14});
        break;
      case 'visit':
        p.override={place,until:w.tick+5};
        parent=log(w,`${p.name} 决定改道去${places[place].name}。`,null,'visit',[id]);
        w.pending.push({kind:'meeting',person:id,parent,at:w.tick+1,until:w.tick+4,place});
        break;
    }
    if(p.suspicion>=4&&!p.questioned){
      p.questioned=true;
      log(w,`${p.name} 写下疑问：“这些巧合真的都是偶然吗？”`,parent??w.sequence,'suspicion',[id]);
    }
    return true;
  }
  function resolve(w,entry) {
    const p=w.people.find(person=>person.id===entry.person);
    if(entry.kind==='late'){
      if(p.delay<=0)return true;
      if(p.place!==p.job&&w.tick<entry.at+4)return false;
      const minutes=(w.tick-entry.at+1)*30;
      const text=p.place===p.job?`${p.name} 到${places[p.job].name}时迟到了 ${minutes} 分钟。`:
        `${p.name} 错过班车后，没能按原计划到岗。`;
      log(w,text,entry.parent,'late',[p.id]);
      return true;
    }
    const peers=w.people.filter(other=>other!==p&&other.place===p.place&&other.place!=='homes');
    const candidate=peers.find(other=>entry.kind==='meeting'
      ? !(other.override?.until>w.tick)
      : entry.kind==='loan'||other.temperament==='generous');
    if(!candidate||(entry.place&&p.place!==entry.place)){
      if(w.tick<entry.until)return false;
      const text=entry.kind==='meeting'?`${p.name} 在${places[entry.place].name}待了一会儿，没遇到熟面孔。`:
        entry.kind==='help'?`${p.name} 还没找到钥匙，只好先忙别的。`:
        `中奖的消息还没传开，没人来找 ${p.name} 借钱。`;
      log(w,text,entry.parent,'quiet',[p.id]);
      return true;
    }
    if(entry.kind==='meeting'){
      const text=`${p.name} 在${places[p.place].name}碰见按日程到这里的 ${candidate.name}。`;
      const id=log(w,text,entry.parent,'meeting',[p.id,candidate.id]);
      memory(w,p,candidate,'meeting',.4,text,id);memory(w,candidate,p,'meeting',.4,text,id);
    }else if(entry.kind==='help'){
      const text=`${candidate.name} 帮 ${p.name} 在${places[p.place].name}找到了钥匙。`;
      memory(w,p,candidate,'help',.85,text,log(w,text,entry.parent,'help',[p.id,candidate.id]));
      p.mood+=15;
    }else{
      const support=(p.trust[candidate.id]||0)+NPCMemory.influence(w,p.id,candidate.id)*12;
      const accepts=p.money>=35&&(p.temperament==='generous'||support>8);
      const text=`${candidate.name} 听说中奖后向 ${p.name} 借钱，${accepts?'得到了帮助':'碰了壁，两人有点尴尬'}。`;
      const id=log(w,text,entry.parent,'loan',[p.id,candidate.id]);
      if(accepts){p.money-=15;candidate.money+=15;}
      memory(w,candidate,p,'loan',accepts?.8:-.65,text,id);
      memory(w,p,candidate,'loan',accepts?.4:-.25,text,id);
    }
    return true;
  }
  function localEncounter(w) {
    const guests=w.people.filter(p=>['square','cafe','forest'].includes(p.place)&&['walk','coffee','lunch','stars'].includes(p.activity));
    const pairs=guests.flatMap((a,i)=>guests.slice(i+1).filter(b=>a.place===b.place).map(b=>[a,b]));
    if(!pairs.length)return;
    const [a,b]=pairs[(w.seed+w.tick*11)%pairs.length];
    const text=`${a.name} 和 ${b.name} 在${places[a.place].name}聊了一会儿。`;
    const id=log(w,text,null,'chat',[a.id,b.id]);
    const comfortable=(a.trust[b.id]||0)>=0&&(b.trust[a.id]||0)>=0;
    memory(w,a,b,'chat',comfortable?.28:-.18,`今天在${places[a.place].name}和 ${b.name} 聊了会儿`,id);
    memory(w,b,a,'chat',comfortable?.28:-.18,`今天在${places[b.place].name}和 ${a.name} 聊了会儿`,id);
  }
  function step(w) {
    w.tick++;
    const hour=w.tick%48;
    if(hour===0){
      w.tokens=3;
      w.weather=['晴朗','细雨','小雪'][Math.floor(random(w)*3)];
      w.power=false;
      log(w,`新的一天。天气：${w.weather}。`);
    }
    if(hour===38&&random(w)<.3){
      w.power=true;
      log(w,'小镇停电，有些居民准备带着手电去广场看星星。',null,'blackout');
    }
    if(hour===44&&w.power){w.power=false;log(w,'街灯重新亮了起来。');}
    for(const p of w.people){
      Object.assign(p,schedule(w,p));
      p.mood=Math.max(0,Math.min(100,p.mood));
    }
    w.pending=w.pending.filter(entry=>w.tick<entry.at||!resolve(w,entry));
    if(hour>=22&&hour<43&&((w.seed>>>4)+w.tick*3)%7===0)localEncounter(w);
    if(TownStories.active(w))TownStories.settle(w,(...args)=>log(w,...args),(...args)=>memory(w,...args));
    return w;
  }
  const valid=w=>Number.isInteger(w.tick)&&w.tick>=0&&Number.isInteger(w.seed)&&Array.isArray(w.events)
    &&Array.isArray(w.people)&&w.people.length===names.length&&w.people.every(p=>Number.isInteger(p.id)&&p.id>0&&p.id<=names.length&&Object.hasOwn(places,p.place))
    &&new Set(w.people.map(p=>p.id)).size===names.length
    &&w.people.every(p=>Object.hasOwn(places,p.job)&&Object.hasOwn(places,p.habit)&&p.trust&&typeof p.trust==='object')
    &&Array.isArray(w.pending)&&w.pending.every(p=>['late','help','meeting','loan'].includes(p.kind)&&w.people.some(person=>person.id===p.person))
    &&Number.isInteger(w.sequence)&&Number.isInteger(w.tokens)&&w.tokens>=0&&w.tokens<=3&&TownStories.valid(w);
  const startStory=(w,plan,helper)=>TownStories.start(w,plan,helper,(...args)=>log(w,...args));
  const inviteStory=w=>TownStories.invite(w,(...args)=>log(w,...args));
  const forecast=(w,p,tick)=>schedule({...w,tick,power:tick-w.tick<4&&w.power},p).place;
  return {create,step,influence,places,valid,startStory,inviteStory,forecast,activity,canDelay:TownRoutines.canDelay};
})();
