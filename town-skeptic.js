'use strict';

// Newton slowly notices the dice. He only learns what he could plausibly see or hear.
const TownSkeptic=(()=>{
  const NEWTON=3,IRIS=7;
  const NOTED={coin:'捡到了硬币',lottery:'中了彩票',bus:'刚好赶上了公交',lost:'丢了钥匙',delay:'错过了班车',
    visit:'突然改了路线','wish-roll':'突然下定决心去见一个人','date-die':'约会前的事忽然顺了'};
  const COMMENTS=['也许只是巧合。','又一件。我开始记下时间和地点。','三件事都发生在有人路过的时候。',
    '把它们连起来看，像一条线。','这不是运气。像有人在掷骰子。','我需要一个实验。','它好像也在看我记的东西。'];
  const LATER=['又一件。笔记本快写满了。','时间、地点、人，都对得上。','我开始能猜到下一件会落在谁身上。','如果它在看，它现在一定知道我在记。','Iris 说我该睡觉了。可我停不下来。'];
  const STAGES=['还没察觉','开始记录巧合','准备做实验','找到了“证据”','公开演讲之后'];
  const day=tick=>Math.floor(tick/48);
  const person=(w,id)=>w.people.find(p=>p.id===id);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function state(w){
    w.skeptic??={cursor:w.sequence,notes:[],stage:0,awareness:0,experiment:null,talk:null,believers:[],laughers:[],retryAt:0,thanked:{}};
    return w.skeptic;
  }
  function hash(...parts){
    let h=0x811c9dc5;
    for(const n of parts){h=Math.imul(h^(n>>>0),0x01000193)>>>0;h^=h>>>13;}
    return (h>>>0)/4294967296;
  }
  function notices(w,newton,target,e,s){
    if(!newton||newton.activity==='sleep')return false;
    if(target===newton||e.type==='lottery')return true;
    if(newton.place===target.place&&newton.place!=='homes')return true;
    if((newton.trust[target.id]||0)>=8||(target.trust[newton.id]||0)>=8)return true;
    return s.awareness>=70&&hash(e.id,s.notes.length)<.5;
  }
  function step(w,log,memory){
    const s=state(w),t=w.tick,newton=person(w,NEWTON);
    const fresh=w.events.filter(e=>e.id>s.cursor);
    s.cursor=w.sequence;
    if(t%48===0){s.awareness=Math.max(0,s.awareness-8);s.thanked={};}
    for(const e of fresh){
      if(!Object.hasOwn(NOTED,e.type))continue;
      const target=person(w,e.ids?.[0]);
      if(!target)continue;
      s.awareness=clamp(s.awareness+4,0,100);
      for(const witness of w.people)if(witness!==target&&witness.place===target.place&&target.place!=='homes')witness.suspicion+=.5;
      if(s.stage>=4&&s.believers.includes(target.id)&&['coin','lottery','bus'].includes(e.type)&&!s.thanked[target.id]){
        s.thanked[target.id]=true;
        const id=log(`${target.name} 抬头看了看天，小声说了句谢谢。`,e.id,'sky-thanks',[target.id]);
        const event=w.events.find(item=>item.id===id);if(event)event.tone=1;
      }
      if(s.experiment&&!s.experiment.result&&e.type==='coin'&&t>=s.experiment.at&&t<=s.experiment.until&&newton.place==='square'){
        s.experiment.result='proof';
        s.stage=3;s.awareness=clamp(s.awareness+20,0,100);
        const id=log(`就在 Newton 盯着长椅时，${target.name} 捡到了硬币。Newton 的手在发抖。`,s.experiment.root,'proof',[NEWTON,target.id]);
        memory(newton,target,'proof',.2,`做实验那晚，${target.name} 捡到了硬币。这不是巧合。`,id,90);
        scheduleTalk(w,s,log,id);
        continue;
      }
      if(!notices(w,newton,target,e,s))continue;
      const n=s.notes.length;
      const comment=n<COMMENTS.length?COMMENTS[n]:LATER[Math.floor(hash(e.id,n)*LATER.length)];
      const text=`${target===newton?'我':target.name+' '}${NOTED[e.type]}。${comment}`;
      const id=log(`Newton 在笔记本上记下：“${text}”`,e.id,'note',[NEWTON,target.id]);
      s.notes.push({day:day(t),tick:t,text,source:id});
      if(s.notes.length>40)s.notes.shift();
    }
    advance(w,s,log,memory,newton);
  }
  function scheduleTalk(w,s,log,parent){
    const at=(day(w.tick)+1)*48+36;
    const root=log('Newton 在广场布告栏贴了一张纸：“明天 18:00，谈谈微光镇里看不见的骰子。”',parent,'lecture-plan',[NEWTON]);
    s.talk={at,until:at+2,root,done:false};
  }
  function advance(w,s,log,memory,newton){
    const t=w.tick,count=s.notes.length;
    if(s.stage===0&&count>=2){
      s.stage=1;
      log('Newton 开始随身带着一个笔记本，记录小镇里的巧合。',s.notes.at(-1).source,'suspicion-stage',[NEWTON]);
    }
    if(s.stage===1&&count>=4&&count>=s.retryAt&&!s.experiment){
      s.stage=2;
      const at=(day(t)+1)*48+38;
      const root=log('Newton 决定明晚在广场长椅上放一枚硬币，写着：“如果你在看，就让下一个人捡到它。”',s.notes.at(-1).source,'experiment-plan',[NEWTON]);
      s.experiment={at,until:at+2,root,result:null};
    }
    if(s.experiment&&!s.experiment.result&&t>s.experiment.until){
      s.experiment.result='nothing';
      log('Newton 在广场守了一个小时，硬币一直躺在长椅上。他自嘲地笑了笑。',s.experiment.root,'experiment-fail',[NEWTON]);
      s.awareness=clamp(s.awareness-15,0,100);
      s.stage=1;s.retryAt=count+3;s.experiment=null;
    }
    if(s.stage<3&&count>=10){
      s.stage=3;
      const id=log('Newton 翻完了整本笔记：“证据已经够多了。”',s.notes.at(-1).source,'proof',[NEWTON]);
      s.experiment=null;
      scheduleTalk(w,s,log,id);
    }
    if(s.talk&&!s.talk.done&&t>=s.talk.at+1){
      s.talk.done=true;
      const audience=w.people.filter(p=>p.id!==NEWTON&&p.place==='square'&&p.activity==='lecture');
      if(!newton||newton.place!=='square'){
        log('到了约定的时间，Newton 却没能出现在广场。布告栏上的纸被风吹走了一角。',s.talk.root,'lecture',[NEWTON]);
        s.stage=3;s.talk=null;return;
      }
      const believers=audience.filter(p=>p.temperament!=='practical'||(p.trust[NEWTON]||0)>=12);
      const laughers=audience.filter(p=>!believers.includes(p));
      s.believers=[...new Set([...s.believers,...believers.map(p=>p.id)])];
      s.laughers=[...new Set([...s.laughers,...laughers.map(p=>p.id)])];
      const parts=[];
      if(believers.length)parts.push(`${believers.map(p=>p.name).join('、')} 听得很认真`);
      if(laughers.length)parts.push(`${laughers.map(p=>p.name).join('、')} 笑出了声`);
      const id=log(`Newton 在广场讲了一刻钟“看不见的骰子”。${audience.length} 人来听${parts.length?'，'+parts.join('，'):''}。`,s.talk.root,'lecture',[NEWTON,...audience.slice(0,8).map(p=>p.id)]);
      const event=w.events.find(item=>item.id===id);if(event)event.count=audience.length;
      for(const p of believers)memory(p,newton,'lecture',.4,'Newton 说小镇里有一个看不见的观察者。我有点信了。',id,70);
      for(const p of laughers)memory(p,newton,'lecture',-.15,'Newton 在广场讲什么“看不见的骰子”，太离谱了。',id,50);
      s.stage=4;
    }
  }
  function destination(w,p,routine){
    const s=w.skeptic;
    if(!s)return routine;
    const t=w.tick,free=!['sleep','work','class','teach','prepare'].includes(routine.activity);
    if(p.id===NEWTON&&s.experiment&&!s.experiment.result&&t>=s.experiment.at&&t<=s.experiment.until&&free)return {place:'square',activity:'experiment'};
    if(s.talk&&!s.talk.done&&t>=s.talk.at&&t<=s.talk.until){
      if(p.id===NEWTON&&routine.activity!=='sleep')return {place:'square',activity:'speech'};
      if(free&&!TownSchool.student(p)&&(p.id===IRIS||(p.trust[NEWTON]||0)>=0&&hash(p.id,s.talk.at)<.45))return {place:'square',activity:'lecture'};
    }
    return routine;
  }
  function thought(w,p){
    const s=w.skeptic;
    if(!s)return null;
    if(p.id===NEWTON){
      if(s.stage===1)return `这周的巧合有点多。笔记本已经记了 ${s.notes.length} 页。`;
      if(s.stage===2)return '明晚在广场放一枚硬币。如果真有谁在看，它会回应吗？';
      if(s.stage===3)return '它回应了。我得把这件事讲给大家听，哪怕他们会笑。';
      if(s.stage===4)return '有人信了，有人笑我。可我知道自己看见了什么。';
      return null;
    }
    if(s.stage>=4&&s.believers.includes(p.id))return '自从听了 Newton 的话，我总觉得有人在看着我们。也许是好意？';
    if(s.stage>=4&&s.laughers.includes(p.id)&&p.suspicion>=2)return 'Newton 那套说法很荒唐……可最近的事，确实有点巧。';
    if(p.suspicion>=3)return '最近的巧合是不是太多了？';
    return null;
  }
  function valid(w){
    const s=w.skeptic;
    if(s==null)return true;
    return Number.isInteger(s.cursor)&&Array.isArray(s.notes)&&Number.isInteger(s.stage)&&s.stage>=0&&s.stage<=4&&
      typeof s.awareness==='number'&&Array.isArray(s.believers)&&Array.isArray(s.laughers);
  }
  const notesOn=(w,d)=>(w.skeptic?.notes??[]).filter(n=>n.day===d).length;
  return {step,destination,thought,valid,notesOn,STAGES,NEWTON,state};
})();
