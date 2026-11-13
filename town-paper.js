'use strict';

// 微光镇日报: written at midnight from the day's real events.
const TownPaper=(()=>{
  const WEEK=['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
  const HEADLINES={
    couple:'广场上的告白',lecture:'Newton：小镇里有一位看不见的观察者',proof:'一枚硬币，一个实验',meteor:'流星雨划过微光镇',
    'kind-turn':'一个人悄悄变了',stargaze:'停电之夜，满天星',snowman:'今冬第一个雪人',bond:'微光镇多了一对朋友',
    crush:'有人心动了',jealous:'一束花引起的风波','confess-no':'没被接住的心意',rumor:'一句听岔了的话',
    conflict:'一笔没还上的钱','date-result':'一场约会','story-done':'镇务办成了','moment-result':'一次偶遇',
    help:'钥匙找到了',loan:'中奖之后',umbrella:'雨里的一把伞',treat:'中奖的人请客了',reunion:'约好的再见','twilight-meet':'灯笺旁的片刻'
  };
  const PRIORITY=Object.keys(HEADLINES);
  const SOCIAL=new Set(['chat','road-talk','platform','reunion','umbrella','school-recess','school-family','stargaze','treat','thanks','share']);
  const KIND_NAMES={coin:'捡硬币',lottery:'中彩票',bus:'赶公交',lost:'丢钥匙',delay:'错过班车',visit:'改道','wish-roll':'心愿掷骰','date-die':'约会掷骰','twilight-invite':'捎出灯笺','supply-intervene':'帮忙运面粉'};
  const day=tick=>Math.floor(tick/48);
  const person=(w,id)=>w.people.find(p=>p.id===id);
  const placeName=place=>Town.places[place]?.name??'家';
  const strip=text=>text.replace(/[。！]$/,'');

  function snapshot(w){
    const trust={};
    for(const p of w.people)for(const [other,value] of Object.entries(p.trust))if(value)trust[`${p.id}>${other}`]=value;
    return trust;
  }
  function track(w){
    const d=day(w.tick);
    let s=w.paperDay;
    if(!s||s.day!==d)s=w.paperDay={day:d,weather:w.weather,visits:{},last:{},trust:snapshot(w),power:false};
    s.power||=w.power;
    for(const p of w.people){
      if(!['homes','away'].includes(p.place)&&s.last[p.id]!==p.place&&!['work','class','teach','commute','prepare'].includes(p.activity)){
        s.visits[p.id]??={};
        s.visits[p.id][p.place]=(s.visits[p.id][p.place]||0)+1;
      }
      s.last[p.id]=p.place;
    }
  }
  function headline(w,events,roots){
    const ranked=roots.map(root=>({root,sum:TownRipples.summary(w,root.id)}))
      .filter(r=>r.sum.count>0).sort((a,b)=>b.sum.people.length+b.sum.count-a.sum.people.length-a.sum.count);
    const best=ranked[0];
    if(best&&best.sum.people.length>=3){
      return {title:`一次${KIND_NAMES[best.root.type]??'小小的拨动'}，牵动了 ${best.sum.people.length} 位居民`,
        text:`${strip(best.root.text)}……后来，${best.sum.last.text}`,chain:best.root.id};
    }
    for(const type of PRIORITY){
      const e=events.findLast(item=>item.type===type&&(type!=='date-result'||true));
      if(e)return {title:HEADLINES[type],text:e.text};
    }
    if(best)return {title:`一次${KIND_NAMES[best.root.type]??'小小的拨动'}`,text:`${strip(best.root.text)}……后来，${best.sum.last.text}`,chain:best.root.id};
    return {title:'平静的一天',text:'微光镇今天没有大新闻。面包照常出炉，列车照常进站。'};
  }
  function socialLine(w,events){
    const counts=new Map();
    for(const e of events)if(SOCIAL.has(e.type)&&e.ids?.length>=2){
      const [a,b]=e.ids;
      const k=a<b?`${a}-${b}`:`${b}-${a}`;
      counts.set(k,(counts.get(k)||0)+1);
    }
    const top=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
    if(!top)return null;
    const [a,b]=top[0].split('-').map(Number).map(id=>person(w,id));
    return top[1]>=2?`${a.name} 和 ${b.name} 今天碰面聊了 ${top[1]} 次。`:`${a.name} 和 ${b.name} 今天聊了一会儿。`;
  }
  function discovery(w,s){
    let best=null;
    for(const [id,places] of Object.entries(s.visits)){
      for(const [place,count] of Object.entries(places)){
        if(place==='station'||place==='school')continue;
        if(!best||count>best.count)best={id:Number(id),place,count};
      }
    }
    if(!best||best.count<2)return null;
    return `${person(w,best.id).name} 今天去了 ${best.count} 趟${placeName(best.place)}。`;
  }
  function relationLine(w,s,events){
    let best=null;
    for(const p of w.people)for(const [other,value] of Object.entries(p.trust)){
      const delta=value-(s.trust[`${p.id}>${other}`]||0);
      if(Math.abs(delta)>=4&&(!best||Math.abs(delta)>Math.abs(best.delta)||(Math.abs(delta)===Math.abs(best.delta)&&delta<best.delta)))best={a:p,b:person(w,Number(other)),delta};
    }
    if(!best||!best.b)return null;
    const cause=events.findLast(e=>e.ids?.includes(best.a.id)&&e.ids.includes(best.b.id));
    return `${best.a.name} 对 ${best.b.name} 的信任${best.delta>0?'上升':'下降'}了。${cause?`起因：${cause.text}`:''}`;
  }
  function funLine(w,events,d){
    const special=events.findLast(e=>['meteor','stargaze','snowman','umbrella','lecture','treat'].includes(e.type));
    if(special)return special.text;
    const services=TownRail.services(d);
    const total=services.reduce((sum,s)=>sum+s.arrivals,0);
    return `今天 ${services.length} 班列车共送来 ${total} 位旅客。`;
  }
  function publish(w){
    const s=w.paperDay;
    if(!s||s.day!==day(w.tick)-1)return null;
    const d=s.day,start=d*48;
    const events=w.events.filter(e=>e.tick>=start&&e.tick<start+48&&!['town','rail'].includes(e.type));
    const roots=TownGoals.playerRoots(w,d);
    const sections=[];
    const chains=roots.slice(-3).map(root=>{
      const sum=TownRipples.summary(w,root.id);
      return sum.count?`${strip(root.text)} → ${strip(sum.last.text)}（牵动 ${sum.people.length} 人）`:`${strip(root.text)}。暂时还没有后续。`;
    });
    if(chains.length)sections.push({label:'蝴蝶效应',text:chains.join('\n')});
    const social=socialLine(w,events);if(social)sections.push({label:'社交',text:social});
    const found=discovery(w,s);if(found)sections.push({label:'新发现',text:found});
    sections.push({label:'小镇趣闻',text:funLine(w,events,d)});
    const relation=relationLine(w,s,events);if(relation)sections.push({label:'关系变化',text:relation});
    const twilight=events.find(e=>e.type==='twilight-meet');
    if(twilight)sections.push({label:'河畔灯笺',text:twilight.text});
    const settlement=events.filter(e=>e.type==='build-move-in'||e.type==='build-ready');
    if(settlement.length)sections.push({label:'小镇建设',text:settlement.map(e=>e.text).join('\n')});
    const crossroads=events.filter(e=>e.type==='crossroads-result');
    if(crossroads.length)sections.push({label:'临时改变的安排',text:crossroads.map(e=>e.text).join('\n')});
    const travel=events.filter(e=>e.type==='travel-depart'||e.type==='travel-return');
    if(travel.length)sections.push({label:'列车来往',text:travel.map(e=>e.text).join('\n')});
    const supply=events.find(e=>e.type==='supply-close');
    if(supply)sections.push({label:'面包坊与商街',text:supply.text});
    const followed=TownWatch.daily(w,events);
    if(followed.length)sections.push({label:'关注的人 · 后来',text:followed.join('\n')});
    const notes=(w.skeptic?.notes??[]).filter(n=>n.day===d);
    if(notes.length)sections.push({label:'怪谈专栏',text:`Newton 的笔记本多了 ${notes.length} 页：“${notes.at(-1).text}”`});
    else if((w.skeptic?.stage??0)>=1)sections.push({label:'怪谈专栏',text:'Newton 今天没有新的记录，但他还在观察。'});
    const goals=w.goals?.last;
    if(goals&&goals.day===d&&(goals.done.length||goals.missed.length)){
      let text=`完成 ${goals.done.length} / ${goals.done.length+goals.missed.length}${goals.bonus?`，今天多 ${goals.bonus} 次干预`:''}`;
      const missed=goals.missed[0];
      const missedText=typeof missed==='string'?missed:missed?.text;
      const missedHint=typeof missed==='string'?null:missed?.hint;
      if(missedText&&missedHint)text+=`\n没完成「${missedText}」——${missedHint}`;
      sections.push({label:'命运委托',text});
    }
    let special=null;
    const romance=events.filter(e=>['couple','crush','flowers','jealous','confess-no'].includes(e.type)).length;
    if(events.some(e=>e.type==='lecture'&&e.count>0))special='号外 · 有人说小镇里住着一位看不见的观察者';
    else if(events.some(e=>e.type==='meteor'))special='流星特刊 · 今晚请抬头';
    else if(romance>=2)special='恋爱特刊 · 今天的微光镇，空气里都是心动';
    else if(!events.some(e=>SOCIAL.has(e.type))&&!roots.length)special='安静特刊 · 今天谁也没和谁搭话，大家各忙各的，有点尴尬';
    const paper={day:d,weekday:WEEK[d%7],weather:s.weather,power:s.power,headline:headline(w,events,roots),sections,special,read:false};
    w.papers??=[];
    w.papers.push(paper);
    if(w.papers.length>14)w.papers.shift();
    return paper;
  }
  function valid(w){
    return (w.papers==null||Array.isArray(w.papers)&&w.papers.every(p=>Number.isInteger(p.day)&&p.headline&&Array.isArray(p.sections)))&&
      (w.paperDay==null||Number.isInteger(w.paperDay.day)&&w.paperDay.trust&&typeof w.paperDay.trust==='object');
  }
  return {track,publish,valid,WEEK};
})();
