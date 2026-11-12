'use strict';

// Butterfly effects. Every follow-up grows from an earlier event and needs a real encounter:
// residents only pass things on when their own schedules bring them to the same place.
const TownRipples=(()=>{
  const PLAYER=new Set(['delay','lost','coin','bus','lottery','visit','wish-roll','date-die','moment-choice','moment-plan','story-invite']);
  const TONE={help:1,thanks:1,treat:1,share:1,bond:1,crush:1,couple:1,reunion:1,umbrella:1,repay:1,snowman:1,meteor:1,
    stargaze:1,platform:1,flowers:1,'kind-turn':1,'moment-result':1,'wish-result':1,'story-done':1,'sky-thanks':1,coin:1,bus:1,lottery:1,
    gossip:-1,rumor:-1,conflict:-1,jealous:-1,unpaid:-1,late:-1,lost:-1,delay:-1,'stood-up':-1,'confess-no':-1};
  const OUTDOOR=new Set(['square','forest','market','station']);
  const SOCIAL=new Set(['square','forest','market','station','cafe','bakery','schoolyard']);
  const BUSY=new Set(['sleep','class','teach','prepare']);
  const MEETS=new Set(['again','confess']);
  const MAX_DEPTH=7;
  const OBSERVED=new Set(['note','suspicion','suspicion-stage','experiment-plan']);
  const day=tick=>Math.floor(tick/48);
  const person=(w,id)=>w.people.find(p=>p.id===id);
  const placeName=place=>Town.places[place]?.name??'家';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;

  function state(w){
    w.ripples??={cursor:w.sequence,seed:(w.seed^0x9e3779b9)>>>0,plans:[],bonds:[],crushes:[],couples:[],kindness:{},changed:[],daily:{},meteor:null};
    return w.ripples;
  }
  // Ripples keep their own deterministic dice so the town's main random stream stays untouched.
  function roll(s,...parts){
    let h=s.seed>>>0;
    for(const n of parts){h=Math.imul(h^(n>>>0),0x01000193)>>>0;h^=h>>>15;}
    h=Math.imul(h,0x2c1b3c6d)>>>0;h^=h>>>12;
    return (h>>>0)/4294967296;
  }
  const pick=(s,list,...parts)=>list[Math.floor(roll(s,...parts)*list.length)];
  function toneOf(e){
    if(!e)return 0;
    if(typeof e.tone==='number')return e.tone;
    if(e.type==='loan')return e.text.includes('碰了壁')?-1:1;
    if(e.type==='date-result')return /都来赴约|说开了/.test(e.text)&&!e.text.includes('没能')?1:-1;
    return TONE[e.type]??0;
  }
  function index(w){return new Map(w.events.map(e=>[e.id,e]));}
  function lineage(w,id,byId=index(w)){
    let e=byId.get(id),root=e,depth=0;
    while(e?.parent&&depth<60){
      const up=byId.get(e.parent);
      if(!up)break;
      root=up;e=up;depth++;
    }
    return {root,depth};
  }
  const rootOf=(w,id)=>lineage(w,id).root;
  function tree(w,rootId){
    const children=new Map();
    for(const e of w.events)if(e.parent!=null){
      if(!children.has(e.parent))children.set(e.parent,[]);
      children.get(e.parent).push(e);
    }
    const root=w.events.find(e=>e.id===rootId);
    if(!root)return null;
    const build=(e,depth)=>({event:e,depth,children:depth>12?[]:(children.get(e.id)??[]).map(child=>build(child,depth+1))});
    return build(root,0);
  }
  function summary(w,rootId){
    const node=tree(w,rootId);
    if(!node)return {count:0,depth:0,people:[],last:null,positive:0,negative:0,deepPositive:0};
    const people=new Set(),walk=[node];let count=0,depth=0,last=node.event,positive=0,negative=0,deepPositive=0;
    while(walk.length){
      const n=walk.pop();
      walk.push(...n.children);
      // Newton's notes and private doubts are observations, not consequences.
      if(OBSERVED.has(n.event.type))continue;
      count++;depth=Math.max(depth,n.depth);
      for(const id of n.event.ids??[])people.add(id);
      if(n.event.id>last.id)last=n.event;
      const t=toneOf(n.event);
      if(n.depth>0){if(t>0)positive++;if(t<0)negative++;}
      if(n.depth>=2&&t>0)deepPositive++;
    }
    return {count:count-1,depth,people:[...people],last,positive,negative,deepPositive};
  }

  function partnerOf(w,s,p){
    const couple=s.couples.find(pair=>pair.includes(p.id));
    if(couple)return person(w,couple[0]===p.id?couple[1]:couple[0]);
    return TownRelations.connections(w,p).find(c=>c.label==='恋人')?.person??null;
  }
  const free=p=>!BUSY.has(p.activity);
  const together=(a,b)=>a&&b&&a.place===b.place&&a.place!=='homes'&&free(a)&&free(b);
  function companions(w,p,filter=()=>true){
    if(!SOCIAL.has(p.place)&&p.place!==p.job)return [];
    return w.people.filter(o=>o!==p&&o.place===p.place&&free(o)&&filter(o));
  }
  function addPlan(s,entry){
    if(s.plans.length>=48)s.plans.shift();
    s.plans.push(entry);
  }
  function emit(w,log,text,parent,type,ids,extra){
    const id=log(text,parent,type,ids);
    const event=w.events.find(e=>e.id===id);
    if(event&&extra)Object.assign(event,extra);
    return id;
  }
  function hearsay(w,listener,subject,emotion,text,source){
    NPCMemory.record(w,{type:'hearsay',time:w.tick,participants:[listener.id,subject.id],source},[
      {person:listener.id,subject:subject.id,emotion,impact:55,confidence:.6,channel:'hearsay',interpretation:text}
    ]);
    listener.trust[subject.id]=clamp((listener.trust[subject.id]||0)+Math.round(emotion*8),-100,100);
  }
  function kindness(w,s,log,p,parent){
    s.kindness[p.id]=(s.kindness[p.id]||0)+1;
    if(p.temperament==='practical'&&s.kindness[p.id]>=3&&!s.changed.includes(p.id)){
      p.temperament='generous';s.changed.push(p.id);
      emit(w,log,`被人好好照顾过几回以后，${p.name} 开始留意身边谁需要搭把手了。`,parent,'kind-turn',[p.id],{tone:1});
    }
  }
  function gossip(s,w,from,teller,subject,tone,claim){
    if(!teller||!subject||teller===subject)return;
    addPlan(s,{kind:'gossip',ids:[teller.id,subject.id],parent:from,at:w.tick+1,until:w.tick+30,tone,claim,hops:0,told:[]});
  }

  // A new event may set later consequences in motion.
  function react(w,s,e,log,byId){
    const [a,b]=(e.ids??[]).map(id=>person(w,id));
    if(lineage(w,e.id,byId).depth>=MAX_DEPTH)return;
    const t=w.tick;
    switch(e.type){
      case 'lottery':
        if(a)addPlan(s,{kind:a.temperament==='practical'?'splurge':'treat',ids:[a.id],parent:e.id,at:t+1,until:t+24});
        break;
      case 'loan':
        if(!a||!b)break;
        if(toneOf(e)<0)gossip(s,w,e.id,b,a,-1,`${a.name} 中了奖，可连朋友都不肯帮一把。`);
        else addPlan(s,{kind:b.temperament==='practical'&&roll(s,e.id,7)<.4?'unpaid':'repay',ids:[b.id,a.id],parent:e.id,at:t+36,until:t+110});
        break;
      case 'help':
        if(a&&b)addPlan(s,{kind:'thanks',ids:[a.id,b.id],parent:e.id,at:t+4,until:t+90});
        break;
      case 'late':
        if(a)addPlan(s,{kind:'cover',ids:[a.id],parent:e.id,at:t,until:t+3,place:a.job});
        break;
      case 'meeting':
        if(a&&b&&roll(s,e.id,3)<.65)addPlan(s,{kind:'again',ids:[a.id,b.id],parent:e.id,at:e.tick+47,until:e.tick+50,place:a.place});
        break;
      case 'coin':
        if(a)addPlan(s,{kind:'share',ids:[a.id],parent:e.id,at:t+1,until:t+30});
        break;
      case 'bus':
        if(a)addPlan(s,{kind:'platform',ids:[a.id],parent:e.id,at:t+1,until:t+4,place:'station'});
        break;
      case 'date-result':
        if(a&&b&&toneOf(e)<0){
          const waited=e.text.startsWith(a.name)?a:e.text.startsWith(b.name)?b:null;
          if(waited)gossip(s,w,e.id,waited,waited===a?b:a,-1,`${(waited===a?b:a).name} 那天让人白等了一场。`);
        }
        break;
      case 'conflict':case 'unpaid':
        if(a&&b&&roll(s,e.id,9)<.6)gossip(s,w,e.id,b,a,-1,`${a.name} 借了钱一直没还。`);
        break;
      case 'blackout':{
        const start=t-t%48;
        addPlan(s,{kind:'stargaze',ids:[],parent:e.id,at:start+41,until:start+43});
        break;
      }
      case 'couple':
        for(const holder of s.crushes.filter(c=>c.to===b?.id&&c.from!==a?.id)){
          const rival=person(w,holder.from);
          if(rival)addPlan(s,{kind:'jealous',ids:[rival.id,a.id,b.id],parent:e.id,at:t+1,until:t+60});
        }
        break;
    }
    if(a&&b&&a!==b&&toneOf(e)>0)bondCheck(w,s,a,b,e,log);
  }

  function bondCheck(w,s,a,b,e,log){
    const k=key(a.id,b.id);
    if(partnerOf(w,s,a)===b)return;
    const ab=a.trust[b.id]||0,ba=b.trust[a.id]||0;
    if(!s.bonds.includes(k)){
      if(ab>=18&&ba>=18){
        s.bonds.push(k);
        emit(w,log,`${a.name} 和 ${b.name} 成了朋友。`,e.id,'bond',[a.id,b.id],{tone:1});
      }
      return;
    }
    const adults=!TownSchool.student(a)&&!TownSchool.student(b)&&a.id!==TownSchool.teacher&&b.id!==TownSchool.teacher;
    if(!adults||s.crushes.some(c=>c.from===a.id||c.from===b.id))return;
    if(partnerOf(w,s,a)||partnerOf(w,s,b))return;
    const [from,to]=ab>=ba?[a,b]:[b,a];
    if((from.trust[to.id]||0)<40)return;
    s.crushes.push({from:from.id,to:to.id});
    const root=emit(w,log,`${from.name} 发现自己越来越期待见到 ${to.name}。`,e.id,'crush',[from.id,to.id],{tone:1});
    const at=(day(w.tick)+2)*48+38;
    addPlan(s,{kind:'confess',ids:[from.id,to.id],parent:root,at,until:at+3,place:'square'});
  }

  // Each plan returns true once it has happened.
  function run(w,s,plan,log){
    const [a,b,c]=plan.ids.map(id=>person(w,id));
    const k=plan.parent;
    switch(plan.kind){
      case 'treat':{
        if(!a||!free(a)||!SOCIAL.has(a.place))return false;
        const peers=companions(w,a).slice(0,3);
        if(!peers.length)return false;
        const what=a.place==='cafe'?'喝咖啡':a.place==='bakery'?'吃刚出炉的面包':'吃点心';
        const id=emit(w,log,`${a.name} 中奖后心情大好，在${placeName(a.place)}请 ${peers.map(p=>p.name).join('、')} ${what}。`,k,'treat',[a.id,...peers.map(p=>p.id)],{tone:1});
        a.money=Math.max(0,a.money-4*peers.length);
        for(const p of peers){
          p.mood+=6;
          NPCMemory.record(w,{type:'treat',time:w.tick,participants:[p.id,a.id],source:id},[
            {person:p.id,subject:a.id,emotion:.5,impact:55,interpretation:`${a.name} 中奖那天请我${what}。`}]);
          p.trust[a.id]=clamp((p.trust[a.id]||0)+6,-100,100);
          kindness(w,s,log,p,id);
        }
        return true;
      }
      case 'splurge':{
        if(!a||a.place!=='market'||!free(a))return false;
        const id=emit(w,log,`${a.name} 揣着奖金在商业街转了一圈，最后只买了一束花。`,k,'flowers',[a.id],{tone:0});
        const best=w.people.filter(o=>o!==a&&(a.trust[o.id]||0)>3).sort((x,y)=>(a.trust[y.id]||0)-(a.trust[x.id]||0))[0];
        if(best)addPlan(s,{kind:'flowers',ids:[a.id,best.id],parent:id,at:w.tick+1,until:w.tick+48});
        return true;
      }
      case 'flowers':{
        if(!together(a,b))return false;
        const id=emit(w,log,`${a.name} 把那束花送给了 ${b.name}。`,k,'flowers',[a.id,b.id],{tone:1});
        b.mood+=8;
        NPCMemory.record(w,{type:'flowers',time:w.tick,participants:[b.id,a.id],source:id},[
          {person:b.id,subject:a.id,emotion:.6,impact:70,interpretation:`${a.name} 送了我一束花。`}]);
        b.trust[a.id]=clamp((b.trust[a.id]||0)+8,-100,100);
        const partner=partnerOf(w,s,b);
        if(partner&&partner!==a)addPlan(s,{kind:'jealous',ids:[partner.id,a.id,b.id],parent:id,at:w.tick,until:w.tick+48});
        return true;
      }
      case 'jealous':{
        // a: the jealous partner, b: the rival, c: the one they love.
        if(!a||!b||!c)return true;
        if(!together(a,c)&&!together(a,b))return false;
        const id=emit(w,log,`${a.name} 听说了 ${b.name} 和 ${c.name} 的事，一整晚都没怎么说话。`,k,'jealous',[a.id,b.id,c.id],{tone:-1});
        hearsay(w,a,b,-.6,`${b.name} 和 ${c.name} 走得太近了。`,id);
        a.trust[c.id]=clamp((a.trust[c.id]||0)-4,-100,100);a.mood-=8;
        return true;
      }
      case 'repay':{
        if(!together(a,b))return false;
        const id=emit(w,log,`${a.name} 把借的 15 元还给了 ${b.name}，还多带了一袋面包。`,k,'repay',[a.id,b.id],{tone:1});
        const amount=Math.min(15,a.money);a.money-=amount;b.money+=amount;
        NPCMemory.record(w,{type:'repay',time:w.tick,participants:[b.id,a.id],source:id},[
          {person:b.id,subject:a.id,emotion:.6,impact:65,interpretation:`${a.name} 守信用，借的钱按时还了。`}]);
        b.trust[a.id]=clamp((b.trust[a.id]||0)+8,-100,100);
        kindness(w,s,log,b,id);
        return true;
      }
      case 'unpaid':{
        if(!together(a,b))return false;
        const id=emit(w,log,`${a.name} 说手头还紧，借的钱要再缓缓。${b.name} 没接话。`,k,'unpaid',[a.id,b.id],{tone:-1});
        NPCMemory.record(w,{type:'unpaid',time:w.tick,participants:[b.id,a.id],source:id},[
          {person:b.id,subject:a.id,emotion:-.55,impact:70,interpretation:`${a.name} 借了钱，一拖再拖。`}]);
        b.trust[a.id]=clamp((b.trust[a.id]||0)-8,-100,100);b.mood-=5;
        return true;
      }
      case 'thanks':{
        if(!together(a,b))return false;
        const gift=pick(s,['一份热面包','一杯咖啡','一张手写的谢卡'],plan.parent,a.id);
        const id=emit(w,log,`${a.name} 为找回钥匙的事，给 ${b.name} 带了${gift}。`,k,'thanks',[a.id,b.id],{tone:1});
        b.mood+=6;
        NPCMemory.record(w,{type:'thanks',time:w.tick,participants:[b.id,a.id],source:id},[
          {person:b.id,subject:a.id,emotion:.5,impact:55,interpretation:`${a.name} 特意来谢我，还带了${gift}。`}]);
        b.trust[a.id]=clamp((b.trust[a.id]||0)+6,-100,100);
        kindness(w,s,log,b,id);
        return true;
      }
      case 'cover':{
        if(!a)return true;
        const coworker=w.people.find(o=>o!==a&&o.job===a.job&&o.place===a.job&&o.activity==='work');
        if(!coworker)return false;
        const id=emit(w,log,`${a.name} 迟到的那会儿，${coworker.name} 先替 ${a.name} 顶上了。`,k,'cover',[coworker.id,a.id],{tone:0});
        coworker.mood-=4;
        NPCMemory.record(w,{type:'cover',time:w.tick,participants:[coworker.id,a.id],source:id},[
          {person:coworker.id,subject:a.id,emotion:-.25,impact:45,interpretation:`替迟到的 ${a.name} 顶了班。`},
          {person:a.id,subject:coworker.id,emotion:.55,impact:60,interpretation:`我迟到时 ${coworker.name} 帮我顶了班。`}]);
        a.trust[coworker.id]=clamp((a.trust[coworker.id]||0)+7,-100,100);
        const lateCount=w.events.filter(e=>e.type==='late'&&e.ids?.[0]===a.id&&e.tick>w.tick-144).length;
        if(lateCount>=2)gossip(s,w,id,coworker,a,-1,`${a.name} 这几天老是迟到。`);
        return true;
      }
      case 'again':{
        if(!a||!b)return true;
        if(a.place!==plan.place||b.place!==plan.place)return false;
        const id=emit(w,log,`${a.name} 和 ${b.name} 又在${placeName(plan.place)}碰面了。这回是约好的。`,k,'reunion',[a.id,b.id],{tone:1});
        for(const [x,y] of [[a,b],[b,a]]){
          NPCMemory.record(w,{type:'reunion',time:w.tick,participants:[x.id,y.id],source:id},[
            {person:x.id,subject:y.id,emotion:.45,impact:60,interpretation:`和 ${y.name} 约好在${placeName(plan.place)}再见，${y.name} 真的来了。`}]);
          x.trust[y.id]=clamp((x.trust[y.id]||0)+6,-100,100);
        }
        return true;
      }
      case 'confess':{
        if(!a||!b)return true;
        if(a.place!=='square'||b.place!=='square')return false;
        const willing=(b.trust[a.id]||0)+NPCMemory.influence(w,b.id,a.id)*5>=32&&!partnerOf(w,s,b);
        if(willing){
          s.couples.push([a.id,b.id]);
          const id=emit(w,log,`${a.name} 在广场对 ${b.name} 说出了心意。${b.name} 笑着答应了。`,k,'couple',[a.id,b.id],{tone:1});
          for(const [x,y] of [[a,b],[b,a]]){
            NPCMemory.record(w,{type:'couple',time:w.tick,participants:[x.id,y.id],source:id},[
              {person:x.id,subject:y.id,emotion:.9,impact:95,interpretation:`那天在广场，我和 ${y.name} 在一起了。`}]);
            x.trust[y.id]=clamp((x.trust[y.id]||0)+10,-100,100);x.mood+=12;
          }
        }else{
          const id=emit(w,log,`${a.name} 在广场对 ${b.name} 说出了心意。${b.name} 说，想先做朋友。`,k,'confess-no',[a.id,b.id],{tone:-1});
          NPCMemory.record(w,{type:'confess-no',time:w.tick,participants:[a.id,b.id],source:id},[
            {person:a.id,subject:b.id,emotion:-.35,impact:80,interpretation:`我对 ${b.name} 说了心里话，${b.name} 说想先做朋友。`}]);
          a.mood-=12;
        }
        s.crushes=s.crushes.filter(c=>c.from!==a.id);
        return true;
      }
      case 'share':{
        if(!a||!free(a)||!['bakery','cafe','schoolyard','square'].includes(a.place))return false;
        const kid=companions(w,a).sort((x,y)=>Number(TownSchool.student(y))-Number(TownSchool.student(x)))[0];
        if(!kid)return false;
        const id=emit(w,log,`${a.name} 用捡来的硬币买了块小面包，掰了一半给 ${kid.name}。`,k,'share',[a.id,kid.id],{tone:1});
        NPCMemory.record(w,{type:'share',time:w.tick,participants:[kid.id,a.id],source:id},[
          {person:kid.id,subject:a.id,emotion:.35,impact:45,interpretation:`${a.name} 分了我半块面包。`}]);
        kid.trust[a.id]=clamp((kid.trust[a.id]||0)+5,-100,100);kid.mood+=4;
        kindness(w,s,log,kid,id);
        return true;
      }
      case 'platform':{
        if(!a||a.place!=='station')return false;
        const other=companions(w,a,o=>!TownSchool.student(o))[0];
        if(!other)return false;
        const topic=pick(s,['这班车会不会晚点','远方的城市','各自要去的地方','站台上的旧钟'],plan.parent,other.id);
        const id=emit(w,log,`${a.name} 提早到了车站，和候车的 ${other.name} 聊起了${topic}。`,k,'platform',[a.id,other.id],{tone:1});
        for(const [x,y] of [[a,other],[other,a]]){
          NPCMemory.record(w,{type:'platform',time:w.tick,participants:[x.id,y.id],source:id},[
            {person:x.id,subject:y.id,emotion:.3,impact:40,interpretation:`在车站和 ${y.name} 聊了${topic}。`}]);
          x.trust[y.id]=clamp((x.trust[y.id]||0)+4,-100,100);
        }
        return true;
      }
      case 'stargaze':{
        const gazers=w.people.filter(p=>p.place==='square'&&p.activity==='stars');
        if(!gazers.length&&w.tick<plan.until)return false;
        s.daily.stars={day:day(w.tick),count:gazers.length};
        if(gazers.length<2)return true;
        const id=emit(w,log,`停电的夜里，${gazers.length} 位居民在广场看星星。有人带了手电，有人举着火把。`,k,'stargaze',gazers.slice(0,8).map(p=>p.id),{tone:1,count:gazers.length});
        for(let i=0;i+1<gazers.length&&i<6;i+=2){
          const [x,y]=[gazers[i],gazers[i+1]];
          NPCMemory.record(w,{type:'stargaze',time:w.tick,participants:[x.id,y.id],source:id},[
            {person:x.id,subject:y.id,emotion:.3,impact:50,interpretation:`停电那晚，和 ${y.name} 在广场看了星星。`},
            {person:y.id,subject:x.id,emotion:.3,impact:50,interpretation:`停电那晚，和 ${x.name} 在广场看了星星。`}]);
          x.trust[y.id]=clamp((x.trust[y.id]||0)+4,-100,100);y.trust[x.id]=clamp((y.trust[x.id]||0)+4,-100,100);
        }
        return true;
      }
      case 'gossip':{
        if(!a||!b||!free(a))return false;
        const told=new Set(plan.told);
        const listener=companions(w,a,o=>o!==b&&!told.has(o.id)&&!TownSchool.student(o))
          .sort((x,y)=>(a.trust[y.id]||0)-(a.trust[x.id]||0))[0];
        if(!listener)return false;
        plan.told.push(listener.id);
        const wrong=roll(s,plan.parent,listener.id,plan.hops)<(plan.hops?0.45:0.28);
        if(wrong){
          const twist=pick(s,['在背后说别人的坏话','故意躲着大家','最近谁都瞧不上'],plan.parent,listener.id);
          const claim=`${b.name} ${twist}。`;
          const id=emit(w,log,`${a.name} 跟 ${listener.name} 说起 ${b.name} 的事。${listener.name} 听岔了，以为 ${claim}`,plan.parent,'rumor',[a.id,listener.id,b.id],{tone:-1,hops:plan.hops+1});
          hearsay(w,listener,b,-.6,`听说 ${claim}`,id);
          if(plan.hops<3&&roll(s,id,5)<.6)addPlan(s,{kind:'gossip',ids:[listener.id,b.id],parent:id,at:w.tick+2,until:w.tick+36,tone:-1,claim,hops:plan.hops+1,told:[a.id]});
        }else{
          const id=emit(w,log,`${a.name} 跟 ${listener.name} 说：“${plan.claim}”`,plan.parent,'gossip',[a.id,listener.id,b.id],{tone:plan.tone,hops:plan.hops});
          hearsay(w,listener,b,plan.tone*.4,`听 ${a.name} 说，${plan.claim}`,id);
        }
        return plan.told.length>=2;
      }
    }
    return true;
  }
  // What happens when a plan runs out of time.
  function expire(w,s,plan,log){
    const [a,b]=plan.ids.map(id=>person(w,id));
    if(plan.kind==='again'&&a&&b){
      const came=[a,b].filter(p=>p.place===plan.place);
      if(came.length===1){
        const [x]=came,y=x===a?b:a;
        const id=emit(w,log,`${x.name} 照约定到了${placeName(plan.place)}，${y.name} 没有来。`,plan.parent,'stood-up',[x.id,y.id],{tone:-1});
        NPCMemory.record(w,{type:'stood-up',time:w.tick,participants:[x.id,y.id],source:id},[
          {person:x.id,subject:y.id,emotion:-.35,impact:55,interpretation:`约好再见，${y.name} 却没来。`}]);
        x.trust[y.id]=clamp((x.trust[y.id]||0)-5,-100,100);
      }
    }else if(plan.kind==='confess'&&a&&b){
      s.crushes=s.crushes.filter(c=>c.from!==a.id);
      if(a.place==='square')emit(w,log,`${a.name} 在广场等了一会儿，最终没把话说出口。`,plan.parent,'quiet',[a.id,b.id],{tone:0});
    }else if(plan.kind==='repay'&&a&&b){
      const amount=Math.min(15,a.money);a.money-=amount;b.money+=amount;
      emit(w,log,`${a.name} 把借的钱装进信封，塞进了 ${b.name} 家的信箱。`,plan.parent,'repay',[a.id,b.id],{tone:1});
      b.trust[a.id]=clamp((b.trust[a.id]||0)+4,-100,100);
    }else if(plan.kind==='unpaid'&&a&&b){
      const id=emit(w,log,`${b.name} 等了好几天，${a.name} 还是没提还钱的事。`,plan.parent,'conflict',[b.id,a.id],{tone:-1});
      NPCMemory.record(w,{type:'conflict',time:w.tick,participants:[b.id,a.id],source:id},[
        {person:b.id,subject:a.id,emotion:-.6,impact:75,interpretation:`${a.name} 借钱不还。`}]);
      b.trust[a.id]=clamp((b.trust[a.id]||0)-10,-100,100);
    }
  }

  function collective(w,s,log){
    const t=w.tick,h=t%48,d=day(t);
    if(w.weather==='细雨'&&s.daily.umbrella!==d&&h>=14&&h<40&&roll(s,t,11)<.3){
      for(const place of OUTDOOR){
        const here=w.people.filter(p=>p.place===place&&free(p)&&!TownSchool.student(p));
        const giver=here.find(p=>p.temperament==='generous');
        const other=giver&&here.find(p=>p!==giver);
        if(!other)continue;
        s.daily.umbrella=d;
        const id=emit(w,log,`雨下大了，${giver.name} 把伞往 ${other.name} 那边挪了挪，两人一起走出了${placeName(place)}。`,null,'umbrella',[giver.id,other.id],{tone:1});
        NPCMemory.record(w,{type:'umbrella',time:t,participants:[other.id,giver.id],source:id},[
          {person:other.id,subject:giver.id,emotion:.45,impact:55,interpretation:`下雨那天，${giver.name} 和我共撑了一把伞。`},
          {person:giver.id,subject:other.id,emotion:.25,impact:40,interpretation:`雨天和 ${other.name} 撑了同一把伞。`}]);
        other.trust[giver.id]=clamp((other.trust[giver.id]||0)+6,-100,100);
        giver.trust[other.id]=clamp((giver.trust[other.id]||0)+3,-100,100);
        kindness(w,s,log,other,id);
        break;
      }
    }
    if(w.weather==='小雪'&&s.daily.snow!==d){
      for(const place of ['schoolyard','square']){
        const kids=w.people.filter(p=>p.place===place&&['recess','play','walk'].includes(p.activity));
        if(kids.length<2)continue;
        s.daily.snow=d;
        const names=kids.slice(0,4).map(p=>p.name).join('、');
        const id=emit(w,log,`下雪了。${names} 在${placeName(place)}堆了一个歪歪扭扭的雪人。`,null,'snowman',kids.slice(0,4).map(p=>p.id),{tone:1});
        for(let i=0;i+1<Math.min(4,kids.length);i++){
          const [x,y]=[kids[i],kids[i+1]];
          NPCMemory.record(w,{type:'snowman',time:t,participants:[x.id,y.id],source:id},[
            {person:x.id,subject:y.id,emotion:.35,impact:55,interpretation:`下雪天和 ${y.name} 一起堆了雪人。`}]);
          x.trust[y.id]=clamp((x.trust[y.id]||0)+4,-100,100);
        }
        break;
      }
    }
    if(h===40&&w.weather==='晴朗'&&!w.power&&!s.meteor&&roll(s,d,77)<.06){
      s.meteor={from:t+1,until:t+4,root:emit(w,log,'夜空划过第一颗流星。醒着的居民陆续走向广场。',null,'meteor-start',[],{tone:1})};
    }
    if(s.meteor&&t>=s.meteor.until){
      const gazers=w.people.filter(p=>p.place==='square'&&p.activity==='meteor');
      emit(w,log,`流星雨落了一个多小时。${gazers.length} 位居民在广场许了愿。`,s.meteor.root,'meteor',gazers.slice(0,8).map(p=>p.id),{tone:1,count:gazers.length});
      for(const p of gazers)p.mood+=6;
      s.meteor=null;
    }
    // Moods rub off on people who share a place.
    const groups=new Map();
    for(const p of w.people)if(SOCIAL.has(p.place)&&free(p)){
      if(!groups.has(p.place))groups.set(p.place,[]);
      groups.get(p.place).push(p);
    }
    for(const group of groups.values()){
      if(group.length<2)continue;
      const bright=group.some(p=>p.mood>=85),gloomy=group.some(p=>p.mood<=25);
      for(const p of group){
        if(bright&&p.mood<85)p.mood+=1;
        if(gloomy&&p.mood>25)p.mood-=1;
      }
    }
  }

  function step(w,log){
    const s=state(w);
    const fresh=w.events.filter(e=>e.id>s.cursor);
    s.cursor=w.sequence;
    const byId=index(w);
    for(const e of fresh)react(w,s,e,log,byId);
    collective(w,s,log);
    let budget=2;
    for(const plan of [...s.plans]){
      if(w.tick<plan.at)continue;
      const remove=()=>{s.plans=s.plans.filter(p=>p!==plan);};
      if(w.tick>plan.until){expire(w,s,plan,log);remove();continue;}
      if(budget<=0)continue;
      const before=w.sequence;
      if(run(w,s,plan,log))remove();
      if(w.sequence>before)budget--;
    }
    if(w.tick%48===0)s.daily={stars:s.daily.stars};
    for(const p of w.people)p.mood=clamp(p.mood,0,100);
  }

  function destination(w,p,routine){
    const s=w.ripples;
    if(!s)return routine;
    if(s.meteor&&w.tick>=s.meteor.from&&w.tick<s.meteor.until&&!['class','teach'].includes(routine.activity)&&
      (routine.activity!=='sleep'||p.id%3===0)&&!TownSchool.student(p))return {place:'square',activity:'meteor'};
    if(['sleep','class','teach','work','prepare'].includes(routine.activity))return routine;
    for(const plan of s.plans){
      if(MEETS.has(plan.kind)&&plan.ids.includes(p.id)&&w.tick>=plan.at&&w.tick<=plan.until)return {place:plan.place,activity:'meet'};
    }
    return routine;
  }

  function thought(w,p){
    const s=w.ripples;
    if(!s)return null;
    const crush=s.crushes.find(c=>c.from===p.id);
    if(crush){
      const other=person(w,crush.to);
      return `最近总想在广场碰见 ${other.name}。要不要把话说出来呢？`;
    }
    const couple=s.couples.find(pair=>pair.includes(p.id));
    if(couple&&w.events.some(e=>e.type==='couple'&&e.ids.includes(p.id)&&w.tick-e.tick<96)){
      const other=person(w,couple[0]===p.id?couple[1]:couple[0]);
      return `我和 ${other.name} 在一起了。说出来之前，我差点就转身走了。`;
    }
    const rumor=NPCMemory.recall(w,p.id).find(m=>m.channel==='hearsay'&&m.emotion<0&&w.tick-m.time<72);
    if(rumor)return `${rumor.interpretation.replace(/。$/,'')}……是真的吗？`;
    return null;
  }

  function valid(w){
    const s=w.ripples;
    if(s==null)return true;
    const ids=new Set(w.people.map(p=>p.id));
    return Number.isInteger(s.cursor)&&Number.isInteger(s.seed)&&Array.isArray(s.plans)&&Array.isArray(s.bonds)&&
      Array.isArray(s.crushes)&&Array.isArray(s.couples)&&Array.isArray(s.changed)&&s.kindness&&typeof s.kindness==='object'&&
      s.plans.every(p=>typeof p.kind==='string'&&Number.isInteger(p.at)&&Number.isInteger(p.until)&&Array.isArray(p.ids)&&p.ids.every(id=>ids.has(id)))&&
      s.couples.every(pair=>Array.isArray(pair)&&pair.every(id=>ids.has(id)));
  }
  const couples=w=>w.ripples?.couples??[];
  const pendingFor=(w,rootId)=>{
    const s=w.ripples;
    if(!s)return false;
    return s.plans.some(plan=>plan.parent!=null&&rootOf(w,plan.parent)?.id===rootId);
  };
  return {step,destination,thought,valid,tree,summary,rootOf,lineage,toneOf,couples,pendingFor,PLAYER};
})();
