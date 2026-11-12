'use strict';

// Daily fate requests and lasting achievements. Both read the town's real event history.
const TownGoals=(()=>{
  const ACHIEVEMENTS=[
    {key:'butterfly',name:'蝴蝶振翅',text:'一次干预牵动了 6 位居民',icon:'✦',color:'#d39a32'},
    {key:'redline',name:'牵起红线',text:'由你引起的一连串事，让两位居民成了朋友',icon:'♥',color:'#c8645a'},
    {key:'blessing',name:'塞翁失马',text:'一次坏运气，最后变成了好事',icon:'☘',color:'#5f9150'},
    {key:'curse',name:'福兮祸所伏',text:'一次好运，最后引出了矛盾',icon:'ϟ',color:'#8a6bb0'},
    {key:'seen',name:'被看见了',text:'Newton 找到了“证据”',icon:'◉',color:'#4f7896'},
    {key:'lecture',name:'广场演讲',text:'Newton 公开讲述看不见的骰子',icon:'❝',color:'#a0704a'},
    {key:'hidden',name:'隐身者',text:'连续 3 天每天干预 3 次，Newton 一页也没记',icon:'◌',color:'#5d6d70'},
    {key:'stars',name:'星空下',text:'停电的夜里，6 位以上居民一起看星星',icon:'☾',color:'#3e5a8a'},
    {key:'snowman',name:'第一个雪人',text:'下雪天，孩子们堆起了雪人',icon:'❄',color:'#5d97b9'},
    {key:'rumor',name:'以讹传讹',text:'一句误会接连传了好几个人',icon:'≋',color:'#8c5f4a'},
    {key:'week',name:'一周目',text:'观察微光镇满 7 天',icon:'⚄',color:'#b88a3a'},
    {key:'meteor',name:'流星雨',text:'稀有：看见一场流星雨',icon:'☄',color:'#4a4f9a',rare:true},
    {key:'changed',name:'改变一生',text:'稀有：有人因为被善待，变成了热心肠',icon:'✿',color:'#b86e93',rare:true},
    {key:'couple',name:'有情人',text:'稀有：两位居民在广场走到了一起',icon:'❦',color:'#c4504f',rare:true}
  ];
  const RANKS=[[0,'见习观察者'],[3,'命运学徒'],[8,'织线人'],[15,'骰子之主']];
  const KINDS=['pair','mood','ripple','turn','quiet'];
  const day=tick=>Math.floor(tick/48);
  const person=(w,id)=>w.people.find(p=>p.id===id);
  const adult=p=>!TownSchool.student(p)&&p.id!==TownSchool.teacher;
  function hash(...parts){
    let h=0x9e3779b9;
    for(const n of parts){h=Math.imul(h^(n>>>0),0x01000193)>>>0;h^=h>>>15;}
    h=Math.imul(h,0x2c1b3c6d)>>>0;h^=h>>>12;
    return (h>>>0)/4294967296;
  }
  function state(w){
    if(!w.goals){
      w.goals={seed:(w.seed^0x51ed27)>>>0,day:-1,quests:[],completed:0,achievements:{},streak:0,bonus:0,fresh:[],cursor:w.sequence,last:null};
      makeQuests(w,day(w.tick));
    }
    return w.goals;
  }
  function makeQuests(w,d){
    const s=w.goals;
    const kinds=[...KINDS].filter(k=>d>0||k!=='quiet').sort((a,b)=>hash(s.seed,d,KINDS.indexOf(a))-hash(s.seed,d,KINDS.indexOf(b)));
    const quests=[];
    for(const kind of kinds){
      if(quests.length>=2)break;
      const quest=build(w,kind,d,s);
      if(quest)quests.push(quest);
    }
    s.day=d;s.quests=quests;
  }
  function build(w,kind,d,s){
    const people=w.people.filter(adult);
    if(kind==='pair'){
      const pairs=[];
      for(const a of people)for(const b of people){
        if(a.id>=b.id||(a.trust[b.id]||0)||(b.trust[a.id]||0))continue;
        const shared=a.habit===b.habit?Town.places[a.habit].name:a.job===b.job?Town.places[a.job].name:null;
        if(shared)pairs.push([a,b,shared]);
      }
      if(!pairs.length)return null;
      const [a,b,shared]=pairs[Math.floor(hash(s.seed,d,11)*pairs.length)];
      return {kind,a:a.id,b:b.id,text:`让 ${a.name} 和 ${b.name} 见上一面`,hint:`两人素不相识，却都常去${shared}。试试「改道」。`,done:false};
    }
    if(kind==='mood'){
      const low=people.filter(p=>p.mood<70);
      if(!low.length)return null;
      const p=low[Math.floor(hash(s.seed,d,13)*low.length)];
      return {kind,a:p.id,text:`让 ${p.name} 的心情升到 85`,hint:'捡到硬币、赶上公交、被人帮一把，都会让人高兴。好心情还会传染。',done:false};
    }
    if(kind==='ripple')return {kind,text:'让一次干预牵动 4 位居民',hint:'中彩票、丢钥匙这类事最容易一传十。',done:false};
    if(kind==='turn')return {kind,text:'让一次坏运气最终变成好事',hint:'丢了钥匙的人，也许会遇上帮忙的人，还会回来道谢。',done:false};
    if(kind==='quiet')return {kind,text:'干预 2 次以上，但别让 Newton 记下新的一页',hint:'避开 Newton 在场的地方，也别碰他熟悉的人。今晚结算。',done:false};
    return null;
  }
  function playerRoots(w,d){
    return w.events.filter(e=>e.parent==null&&TownRipples.PLAYER.has(e.type)&&day(e.tick)===d);
  }
  function unlock(w,s,key){
    if(s.achievements[key]!=null)return;
    s.achievements[key]=day(w.tick);
    s.fresh.push({type:'achievement',key});
  }
  function check(w){
    const s=state(w),d=day(w.tick),start=d*48;
    if(s.day!==d)makeQuests(w,d);
    for(const quest of s.quests){
      if(quest.done||quest.kind==='quiet')continue;
      let done=false;
      if(quest.kind==='pair')done=w.events.some(e=>e.tick>=start&&e.ids?.includes(quest.a)&&e.ids.includes(quest.b)&&!['note','gossip','rumor','jealous'].includes(e.type));
      else if(quest.kind==='mood')done=(person(w,quest.a)?.mood??0)>=85;
      else if(quest.kind==='ripple')done=playerRoots(w,d).some(root=>TownRipples.summary(w,root.id).people.length>=4);
      else if(quest.kind==='turn')done=playerRoots(w,d).some(root=>['lost','delay'].includes(root.type)&&TownRipples.summary(w,root.id).deepPositive>0);
      if(done)complete(s,quest);
    }
    const fresh=w.events.filter(e=>e.id>s.cursor);
    s.cursor=w.sequence;
    const byId=new Map(w.events.map(e=>[e.id,e]));
    const roots=new Set();
    for(const e of fresh){
      const {root,depth}=TownRipples.lineage(w,e.id,byId);
      const mine=root&&TownRipples.PLAYER.has(root.type)&&root.parent==null;
      if(mine)roots.add(root.id);
      const tone=TownRipples.toneOf(e);
      if(e.type==='bond'&&mine)unlock(w,s,'redline');
      if(mine&&depth>=2&&tone>0&&['lost','delay'].includes(root.type))unlock(w,s,'blessing');
      if(mine&&depth>0&&tone<0&&['lottery','coin','bus'].includes(root.type)&&e.type!=='note')unlock(w,s,'curse');
      if(e.type==='proof')unlock(w,s,'seen');
      if(e.type==='lecture'&&e.count>0)unlock(w,s,'lecture');
      if(e.type==='stargaze'&&e.count>=6)unlock(w,s,'stars');
      if(e.type==='snowman')unlock(w,s,'snowman');
      if(e.type==='meteor'&&e.count>0)unlock(w,s,'meteor');
      if(e.type==='rumor'&&e.hops>=2)unlock(w,s,'rumor');
      if(e.type==='kind-turn')unlock(w,s,'changed');
      if(e.type==='couple')unlock(w,s,'couple');
    }
    for(const id of roots)if(TownRipples.summary(w,id).people.length>=6)unlock(w,s,'butterfly');
    if(w.tick>=7*48)unlock(w,s,'week');
  }
  function complete(s,quest){
    quest.done=true;s.completed++;
    s.fresh.push({type:'quest',text:quest.text});
  }
  // Called at midnight before tokens refill. Returns tomorrow's bonus interventions.
  function rollover(w){
    const s=state(w),d=day(w.tick)-1;
    if(d<0)return 0;
    const roots=playerRoots(w,d).length,notes=TownSkeptic.notesOn(w,d);
    for(const quest of s.quests)if(quest.kind==='quiet'&&!quest.done&&s.day===d&&roots>=2&&notes===0)complete(s,quest);
    s.streak=roots>=3&&notes===0?s.streak+1:0;
    if(s.streak>=3)unlock(w,s,'hidden');
    const done=s.day===d?s.quests.filter(q=>q.done):[];
    s.last={day:d,done:done.map(q=>q.text),missed:s.day===d?s.quests.filter(q=>!q.done).map(q=>q.text):[],bonus:Math.min(2,done.length)};
    s.bonus=s.last.bonus;
    makeQuests(w,d+1);
    return s.bonus;
  }
  const rank=w=>{
    const n=w.goals?.completed??0;
    let title=RANKS[0][1],next=null;
    for(const [need,name] of RANKS){if(n>=need)title=name;else{next={need,name};break;}}
    return {title,completed:n,next};
  };
  function valid(w){
    const s=w.goals;
    if(s==null)return true;
    return Number.isInteger(s.day)&&Array.isArray(s.quests)&&Number.isInteger(s.completed)&&s.achievements&&typeof s.achievements==='object'&&
      Array.isArray(s.fresh)&&Number.isInteger(s.cursor)&&Number.isInteger(s.bonus)&&s.bonus>=0&&s.bonus<=2;
  }
  return {check,rollover,state,rank,valid,ACHIEVEMENTS,playerRoots};
})();
