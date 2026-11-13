'use strict';

const TownRelations=(()=>{
  const couples=[
    {key:'nora-owen',a:6,b:8,place:'cafe',hour:34,first:0,wait:'我先点两杯。上次他嫌咖啡太甜，这次我记得了。',
      hurry:'答应了 Nora 去咖啡厅，可摊位还没收好。她会不会以为我忘了？',
      missed:['我等到咖啡都凉了。比起迟到，我更难受的是他一句话都没捎来。','收完摊才发现时间过了。我想道歉，又怕听起来像找借口。'],
      together:['他总算来了。我想先听他说说今天怎么了。','她给我留了杯不加糖的咖啡。我应该早点告诉她我在忙。']},
    {key:'june-milo',a:13,b:14,place:'square',hour:37,first:1,wait:'想跟 Milo 绕着广场走一圈。上次的话说到一半，还没说完。',
      hurry:'我记得六月说想散步。我得把手头的事做完，然后去找她。',
      missed:['原本想把话说完，最后还是一个人走了一圈。','我以为还能赶上。下次得先问她愿不愿意等。'],
      together:['走了一圈以后，那些本来不好开口的话，好像也能说了。','原来她只是想让我听完。我很庆幸今天来了。']}
  ];
  const authored=[
    {a:3,b:7,label:'朋友'},{a:21,b:17,label:'朋友'},{a:26,b:27,label:'同学'}
  ];
  const byId=(w,id)=>w.people.find(p=>p.id===id);
  const day=w=>Math.floor(w.tick/48);
  const pairFor=id=>couples.find(pair=>pair.a===id||pair.b===id);
  const partnerId=(pair,id)=>pair.a===id?pair.b:pair.a;
  const state=(w,pair)=>w.relationshipDates?.[pair.key];
  function nextPlan(w,pair,previous){
    if(previous&&!previous.result)return previous;
    const repair=['missed','strained'].includes(previous?.result?.kind);
    const nextDay=previous?Math.floor(previous.until/48)+(repair?1:3):Math.max(day(w),pair.first);
    const hour=repair?36:pair.hour;
    const start=nextDay*48+hour;
    return {kind:repair?'repair':'date',at:start,until:start+2};
  }
  function prepare(w){
    for(const pair of couples){
      const previous=state(w,pair);
      if(previous&&!previous.result)continue;
      const next=nextPlan(w,pair,previous);
      if(w.tick>next.until&&(!previous||previous.result)){
        const at=(day(w)+1)*48+(next.kind==='repair'?36:pair.hour);
        next.at=at;next.until=at+2;
      }
      if(!previous||w.tick>=next.at-12){
        w.relationshipDates??={};
        w.relationshipDates[pair.key]=next;
        if(previous?.result)next.previous=previous.result;
      }
    }
  }
  const venue=(pair,plan)=>plan.kind==='repair'?'square':pair.place;
  const relationship=(w,a,b)=>12+(a.trust[b.id]||0)+NPCMemory.influence(w,a.id,b.id)*6;
  function shiftConflict(pair,plan){
    if(pair.key==='nora-owen'&&plan.kind==='date'&&Math.floor(plan.at/48)%2===0)return plan.until+1;
    return plan.at;
  }
  function destination(w,p,routine){
    const pair=pairFor(p.id);
    if(!pair)return routine;
    const plan=state(w,pair);
    if(!plan||w.tick<plan.at-1||w.tick>plan.until||['missed','strained'].includes(plan.result?.kind))return routine;
    const other=byId(w,partnerId(pair,p.id));
    if(relationship(w,p,other)<1)return routine;
    const place=venue(pair,plan);
    if(p.id===pair.b&&plan.kind==='date'){
      const release=shiftConflict(pair,plan)-(plan.die>=5?3:plan.die>=3?1:0);
      if(w.tick<release&&release>plan.at)return {place:p.job,activity:'dateOvertime'};
    }
    if(['sleep','teach','class'].includes(routine.activity))return routine;
    return {place,activity:plan.kind==='repair'?'dateRepair':'date'};
  }
  function step(w,log,remember){
    for(const pair of couples){
      const plan=state(w,pair);
      if(!plan||plan.result||w.tick<plan.at)continue;
      const a=byId(w,pair.a),b=byId(w,pair.b),place=venue(pair,plan);
      const aThere=a.place===place,bThere=b.place===place;
      const ready=aThere&&bThere&&relationship(w,a,b)>=1&&relationship(w,b,a)>=1;
      if(!ready&&w.tick<plan.until)continue;
      const who=aThere?a.name:bThere?b.name:null;
      const kind=ready?(plan.kind==='repair'?'repaired':'kept'):aThere&&bThere?'strained':'missed';
      const text=kind==='repaired'? `${a.name} 和 ${b.name} 在广场把失约的事说开了。`:
        kind==='kept'?`${a.name} 和 ${b.name} 都来赴约了。`:kind==='strained'?`${a.name} 和 ${b.name} 见到了对方，却没能把话说开。`:
        who?`${who} 等到了约定时间结束，另一个人没有来。`:`${a.name} 和 ${b.name} 都没能赴约。`;
      const source=log(text,plan.root??null,'date-result',[a.id,b.id]);
      plan.result={kind,at:w.tick,text,aThere,bThere,heldAtWork:b.activity==='dateOvertime'};
      if(ready){
        a.mood=Math.min(100,a.mood+10);b.mood=Math.min(100,b.mood+8);
        remember(a,b,'date',.64,kind==='repaired'?'这次我们把上次没说清的话说完了。':pair.together[0],source,75);
        remember(b,a,'date',.6,kind==='repaired'?'终于当面讲清了我为什么没来。':pair.together[1],source,75);
      }else if(aThere!==bThere){
        const waiting=aThere?a:b,absent=aThere?b:a;
        waiting.mood=Math.max(0,waiting.mood-12);absent.mood=Math.max(0,absent.mood-4);
        remember(waiting,absent,'date-missed',-.43,`我在约好的地方等 ${absent.name}，但对方没有来。`,source,70);
        remember(absent,waiting,'date-missed',-.12,`我没赶上和 ${waiting.name} 的约定。想找个机会解释。`,source,62);
      }
    }
  }
  function canNudge(w,pair,plan){
    return !!plan&&!plan.result&&shiftConflict(pair,plan)>plan.at&&!plan.die&&w.tick<plan.until&&w.tokens>0;
  }
  function nudge(w,id,random,log){
    const pair=pairFor(id),plan=pair&&state(w,pair);
    if(!pair||TownTravel.away(byId(w,id))||!canNudge(w,pair,plan))return null;
    plan.die=1+Math.floor(random()*6);
    w.tokens--;
    const other=byId(w,pair.b);
    plan.root=log(`你为 ${other.name} 的约会掷出 ${plan.die} 点。`,null,'date-die',[pair.a,pair.b]);
    return plan.root;
  }
  function date(w,p){
    const pair=pairFor(p.id);
    if(!pair)return null;
    const saved=state(w,pair),plan=saved??nextPlan(w,pair);
    return {pair,plan,place:venue(pair,plan),other:byId(w,partnerId(pair,p.id)),
      conflict:shiftConflict(pair,plan)>plan.at,canNudge:!TownTravel.away(p)&&canNudge(w,pair,saved)};
  }
  function thought(w,p){
    const info=date(w,p);
    if(!info)return null;
    const {pair,plan}=info,first=p.id===pair.a;
    if(plan.result?.kind==='missed'){
      const waited=first?plan.result.aThere:plan.result.bThere;
      if(waited)return first&&plan.kind==='date'?pair.missed[0]:`我在约好的地方等了一会儿。想知道 ${info.other.name} 遇到了什么事。`;
      return !first&&plan.kind==='date'&&(pair.key!=='nora-owen'||plan.result.heldAtWork)?pair.missed[1]:
        `我没能去见 ${info.other.name}。得找个机会把这事说清楚。`;
    }
    if(plan.result?.kind==='strained')return first?'人是见到了，可我还是不知道该怎么开口。':'见到对方之后，准备好的话反而一句也说不出来。';
    if(plan.result?.kind==='repaired')return first?'这次终于听到了原因。以后有变化，想先告诉对方。':'能把原因讲出来，比装作什么都没发生轻松多了。';
    if(plan.result?.kind==='kept')return pair.together[first?0:1];
    if(plan.kind==='repair')return first?'想听听上次为什么没来。见面之前，还是有点拿不准。':'想当面说说上次的事。要先道歉，把理由留到后面。';
    if(Math.floor(plan.at/48)>day(w))return `约好了改天和 ${info.other.name} 见面。我想记得留出时间。`;
    return first?pair.wait:pair.hurry;
  }
  function connections(w,p){
    const connections=[];
    for(const q of w.people){
      if(q.id===p.id)continue;
      const score=p.trust[q.id]||0,pair=pairFor(p.id);
      const known=authored.find(r=>r.a===p.id&&r.b===q.id||r.b===p.id&&r.a===q.id);
      const sameHome=TownSchool.household(p.id)===TownSchool.household(q.id);
      const couple=pair&&partnerId(pair,p.id)===q.id;
      const family=sameHome&&(TownSchool.student(p)||TownSchool.student(q));
      const coworker=p.job===q.job&&!TownSchool.student(p)&&!TownSchool.student(q);
      const neighbor=Math.floor((TownSchool.household(p.id)-1)/6)===Math.floor((TownSchool.household(q.id)-1)/6);
      const label=couple?'恋人':family?'家人':known?.label??(score>=8?'朋友':score!==0?'熟人':coworker?'同事':neighbor?'邻居':null);
      if(!label)continue;
      const event=w.events.findLast(e=>e.ids?.includes(p.id)&&e.ids?.includes(q.id)&&
        !['date-die','story-invite','story-start','moment-start','wish-roll','wish-plan'].includes(e.type));
      connections.push({person:q,label,score,priority:couple?6:family?5:known?4:event?3:coworker?2:1,event});
    }
    return connections.sort((a,b)=>b.priority-a.priority||Math.abs(b.score)-Math.abs(a.score));
  }
  function valid(w){
    if(w.relationshipDates==null)return true;
    if(typeof w.relationshipDates!=='object'||Array.isArray(w.relationshipDates))return false;
    const validResult=r=>r&&['kept','missed','repaired','strained'].includes(r.kind)&&typeof r.text==='string'&&
      Number.isInteger(r.at)&&r.at<=w.tick&&typeof r.aThere==='boolean'&&typeof r.bThere==='boolean';
    return Object.entries(w.relationshipDates).every(([key,plan])=>couples.some(p=>p.key===key)&&plan&&
      ['date','repair'].includes(plan.kind)&&Number.isInteger(plan.at)&&plan.at>=0&&plan.at<=w.tick+192&&plan.until===plan.at+2&&
      (plan.die==null||Number.isInteger(plan.die)&&plan.die>=1&&plan.die<=6&&Number.isInteger(plan.root)&&plan.root>0&&plan.root<=w.sequence)&&
      (plan.result==null||validResult(plan.result))&&(plan.previous==null||validResult(plan.previous)));
  }
  const activeRoot=(w,root)=>couples.some(p=>state(w,p)?.root===root&&!state(w,p).result);
  return {prepare,destination,step,date,nudge,thought,connections,valid,activeRoot};
})();
