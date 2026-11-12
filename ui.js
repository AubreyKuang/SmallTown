'use strict';
const $=id=>document.getElementById(id);
const KEY='god-dice-v1';
const canvas=$('map'),ctx=canvas.getContext('2d');
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let world=SaveManager.load(localStorage,KEY,Town.valid);
const isNew=!world;
if(isNew){
  world=Town.create();
  while(world.tick<17)Town.step(world);
}
Town.upgrade(world);
let timer=null,audio=null,running=false,fast=false,choosingPlace=false,frame=null;
let lastFrame=null,manualUntil=0;
let draftPlan=0,draftHelper=null,shownOffer=-1;
let animationTime=0,tickProgress=0;
const tickDuration=()=>fast?2400:7200;
let schoolBoard=false;
let interiors=localStorage.getItem(KEY+':interiors')!=='off';
let heardConversation=false;
let crowd=createCrowd(),mapPins=crowd.pins();
let seenStory=world.sequence;
let watched=Number.isInteger(world.watchedEvent)?world.watchedEvent:null;
const save=()=>SaveManager.save(localStorage,KEY,{...world,watchedEvent:watched,savedAt:Date.now()},Town.valid);
const selected=()=>world.people.find(p=>p.id===Number($('person').value))||world.people[0];

function option(select,value,label){
  const el=document.createElement('option');
  el.value=value;el.textContent=label;select.append(el);
}
function populateResidents(){
  const before=$('person').value;
  $('person').replaceChildren();
  for(const p of world.people)option($('person'),p.id,p.name);
  if(world.people.some(p=>p.id===Number(before)))$('person').value=before;
}
populateResidents();
for(const [key,place] of Object.entries(Town.places)){
  const button=document.createElement('button');
  button.textContent=place.name;button.onclick=()=>intervene('visit',key);
  $('destinations').append(button);
}
$('offline').checked=localStorage.getItem(KEY+':offline')==='yes';
$('offline').onchange=()=>localStorage.setItem(KEY+':offline',$('offline').checked?'yes':'no');
if($('offline').checked&&world.savedAt){
  const elapsed=Math.max(0,Math.min(48,Math.floor((Date.now()-world.savedAt)/600000)));
  for(let i=0;i<elapsed;i++)Town.step(world);
  if(elapsed)$('notice').textContent=`离线期间，小镇推进了 ${elapsed/2} 小时。`;
  resetCrowd();
}
function beep(){
  if(!audio)return;
  const note=audio.createOscillator(),gain=audio.createGain();
  note.type='triangle';note.frequency.value=440;gain.gain.setValueAtTime(.05,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);
  note.connect(gain).connect(audio.destination);note.start();note.stop(audio.currentTime+.23);
}

function residentActivity(p){
  const pin=mapPins.find(walker=>walker.resident.id===p.id);
  const place=p.place==='homes'?'家':Town.places[p.place].name;
  const label=TownRoutines.labels[Town.activity(world,p)];
  const companion=pin?.partner&&world.people.find(other=>other.id===pin.partner);
  return companion?`和 ${companion.name} ${pin.social==='talk'?'聊天':'同行'}`:
    pin?.movingTo||pin?.place!==p.place?`去${place}的路上`:p.place==='homes'&&label.startsWith('在家')?label:`${place} · ${label}`;
}
function personalThought(p){
  return TownRelations.thought(world,p)??TownWishes.thought(world,p,Town.activity(world,p));
}
function paint(){
  const p=selected(),activity=residentActivity(p);
  const bio=`${activity} · 心情 ${p.mood} · ${p.money} 元${p.questioned?' · 察觉异常':''}`;
  if($('bio').textContent!==bio)$('bio').textContent=bio;
  TownMap.draw(ctx,world,p.id,canvas.clientWidth,mapPins,choosingPlace,interiors,animationTime,motion.matches?.62:tickProgress);
}
function createCrowd(){
  return TownMovement.create(world,Math.random,(a,b)=>{
    if(Town.roadTalk(world,a,b))heardConversation=true;
  });
}
function resetCrowd(){
  crowd=createCrowd();
  mapPins=crowd.pins();
  tickProgress=0;
}
function refreshMotion(){
  const active=!motion.matches&&!document.hidden&&!modalOpen()&&(running||performance.now()<manualUntil);
  if(active&&frame===null)frame=requestAnimationFrame(animate);
  if(!active&&frame!==null){cancelAnimationFrame(frame);frame=null;lastFrame=null;}
}
function animate(now){
  frame=null;
  if(lastFrame!==null){
    crowd.advance(Math.min(.05,(now-lastFrame)/1000)*(fast?1.25:1),running);
    animationTime+=Math.min(50,now-lastFrame);
    tickProgress=Math.min(1,tickProgress+Math.min(50,now-lastFrame)/tickDuration());
    mapPins=crowd.pins();
    if(heardConversation){heardConversation=false;save();render();}
    else paint();
  }
  lastFrame=now;
  refreshMotion();
  if(frame===null)lastFrame=null;
}
canvas.addEventListener('click',event=>{
  const bounds=canvas.getBoundingClientRect();
  const x=(event.clientX-bounds.left)*canvas.width/bounds.width;
  const y=(event.clientY-bounds.top)*canvas.height/bounds.height;
  if(choosingPlace){
    const place=TownMap.findPlace(x,y);
    if(place)intervene('visit',place);
    return;
  }
  const closest=mapPins.reduce((best,pin)=>{
    if(pin.indoors&&!interiors)return best;
    const distance=Math.hypot(x-pin.x,y-pin.y+4);
    return distance<best.distance?{pin,distance}:best;
  },{pin:null,distance:Math.max(27,canvas.width/bounds.width*15)});
  if(closest.pin){
    $('person').value=closest.pin.resident.id;
    render();
    openResidentProfile();
  }
});
function when(tick){return `第 ${Math.floor(tick/48)+1} 天 ${String(Math.floor(tick%48/2)).padStart(2,'0')}:${tick%2?'30':'00'}`;}
const modalOpen=()=>['journal','stories','moment','rail','wish'].some(id=>$(id).open);
function storyNode(tag,value,css){
  const node=document.createElement(tag);
  node.textContent=value;
  if(css)node.className=css;
  return node;
}
function storyButton(label,action,css){
  const button=storyNode('button',label,css);
  button.onclick=action;
  return button;
}
function renderRail(){
  const {active,next,phase}=TownRail.schedule(world.tick),button=$('openRail');
  const status={approach:'正在进站',platform:'正在上下车',departure:'正在发车'};
  button.hidden=choosingPlace;
  button.dataset.active=String(Boolean(active));
  button.textContent=active?status[phase]:'列车 ›';
  if(!$('rail').open)return;
  const list=storyNode('ol','','rail-list');
  for(const service of TownRail.services(Math.floor(world.tick/48))){
    list.append(storyNode('li',`${when(service.start+1)} 到站 · ${service.arrivals} 位下车 · ${service.departures} 位上车`));
  }
  $('railPanel').replaceChildren(storyNode('h3',active?status[phase]:`下一班 ${when(next.start+1)}`),
    storyNode('p','列车到站后，部分旅客会到店铺附近逛逛，再回来搭下一班。','story-meta'),list);
}
function renderWish(){
  const p=selected(),profile=TownWishes.profile(p.id),state=TownWishes.state(world,p.id),panel=$('wishPanel');
  const thought=personalThought(p),date=TownRelations.date(world,p);
  $('wishTitle').textContent=`${p.name} 的人物档案`;
  function switchResident(id){
    $('person').value=id;render();$('wishTitle').focus();
  }
  const people=storyNode('div','','wish-people');
  for(const id of [6,8,...TownWishes.ids]){
    const person=world.people.find(candidate=>candidate.id===id);
    const button=storyButton(person.name,()=>switchResident(id));
    button.setAttribute('aria-pressed',String(id===p.id));people.append(button);
  }
  const mood=p.mood>=80?'心情很好':p.mood>=55?'心情平稳':p.mood>=40?'有些低落':'很想独处';
  panel.replaceChildren(people,storyNode('p',`此刻 · ${residentActivity(p)} · ${mood}（${p.mood}）`,'story-meta'),
    storyNode('p',`「${thought}」`,'wish-thought'));
  const current=Town.activity(world,p);
  for(let tick=world.tick+1;tick<=world.tick+48;tick++){
    const next=Town.forecastPlan(world,p,tick);
    if(next.place===p.place&&next.activity===current)continue;
    panel.append(storyNode('p',`接下来 · ${when(tick)} · ${Town.places[next.place].name} · ${TownRoutines.labels[next.activity]}`,'story-meta'));
    break;
  }
  if(date){
    const {plan,other,place,conflict,canNudge}=date;
    const statuses={kept:'赴约了',missed:'失约了',repaired:'说开了',strained:'见了面，话没说开'};
    const block=storyNode('section','','resident-section');
    const heading=storyNode('h3',plan.result?statuses[plan.result.kind]:`想和 ${other.name} ${plan.kind==='repair'?'把上次的事说开':'见一面'}`);
    heading.tabIndex=-1;
    block.append(heading,storyNode('p',`恋人 · ${other.name} · ${when(plan.at)} · ${Town.places[place].name}`,'story-meta'));
    if(plan.result)block.append(storyNode('p',plan.result.text));
    else if(plan.previous)block.append(storyNode('p',`上次：${plan.previous.text}`));
    else if(conflict)block.append(storyNode('p','Owen 得先收摊，可能赶不上约定时间。'));
    if(plan.die)block.append(storyNode('p',`掷出 ${plan.die} 点。${plan.die>=5?'收摊比预期顺利。':plan.die>=3?'能赶在约定结束前收完。':'收摊还是耽搁了。'}`,'story-meta'));
    const actions=storyNode('div','','story-actions');
    actions.append(storyButton(`查看 ${other.name} 怎么想`,()=>switchResident(other.id)));
    if(!plan.result&&world.tick<plan.at-1)actions.append(storyButton('前进到见面前半小时',()=>{
      while(world.tick<plan.at-1)Town.step(world);
      resetCrowd();save();render();panel.querySelector('.resident-section h3').focus();
    }));
    if(canNudge)actions.append(storyButton('掷骰争取早点收摊 · 1 次干预',()=>{
      const root=Town.nudgeDate(world,p.id);
      if(root){watched=root;beep();save();render();panel.querySelector('.resident-section h3').focus();}
    },'story-primary'));
    block.append(actions);panel.append(block);
  }
  const details=document.createDocumentFragment(),connections=TownRelations.connections(world,p).slice(0,5);
  if(connections.length){
    const people=storyNode('div','','profile-relations');
    for(const {person,label,score,event} of connections){
      const button=storyButton('',()=>switchResident(person.id));
      const feeling=score>=8?'更信任了':score<0?'有些隔阂':'';
      button.append(storyNode('strong',`${person.name} · ${label}`));
      if(event||feeling)button.append(storyNode('small',[feeling,event?.text].filter(Boolean).join(' · ')));
      people.append(button);
    }
    details.append(storyNode('h3','人际关系'),people);
  }
  const memories=NPCMemory.recall(world,p.id).slice(0,3);
  if(memories.length){
    const list=storyNode('ul','','profile-memories');
    for(const memory of memories)list.append(storyNode('li',memory.interpretation));
    details.append(storyNode('h3','记得的事'),list);
  }
  if(!profile){panel.append(details);return;}
  const goal=TownWishes.beat(p.id,state),other=world.people.find(candidate=>candidate.id===profile.other);
  const heading=storyNode('h3',profile.title);heading.tabIndex=-1;
  panel.append(heading,storyNode('p',goal?`${profile.fear} · 进展 ${state.stage} / ${profile.beats.length}`:'这件心事已经有了结果。','story-meta'));
  if(state.die){
    const die=storyNode('div','','wish-die');
    const face=storyNode('span','⚀⚁⚂⚃⚄⚅'[state.die-1]);face.setAttribute('aria-hidden','true');
    die.append(face,storyNode('span',`上次掷出 ${state.die} 点`));panel.append(die);
  }
  if(state.latest)panel.append(storyNode('p',state.latest,'story-result'));
  if(!goal){panel.append(details);return;}
  const actions=storyNode('div','','story-actions');
  if(state.plan){
    const {at,until}=state.plan;
    const place=Town.places[goal.place].name;
    panel.append(storyNode('p',`${when(at)} 到 ${when(until).split(' ').at(-1)} · ${place} · 想见 ${other.name}`,'story-meta'));
    if(world.tick<at-1)actions.append(storyButton('前进到机会前半小时',()=>{
      while(world.tick<at-1)Town.step(world);
      resetCrowd();save();render();panel.querySelector('h3').focus();
    }));
    actions.append(storyButton(`观察 ${other.name}`,()=>{$('person').value=other.id;$('wish').close();render();}));
  }else{
    const canRoll=TownWishes.canRoll(world,p.id);
    const label=canRoll?'为这件事掷骰 · 1 次干预':world.tokens===0?'今天的干预次数用完了':'明天可以再掷骰';
    const button=storyButton(label,()=>{
      const root=Town.rollWish(world,p.id);
      if(root){watched=root;beep();save();render();$('wishTitle').focus();}
    },'story-primary');
    button.disabled=!canRoll;actions.append(button);
    panel.append(storyNode('p','1–2 点会犹豫，3–4 点会自己去等，5–6 点会给两人都留出机会。赴约和开口还要看日程与信任。','story-meta'));
  }
  panel.append(actions,details);
}
function renderMoment(){
  const m=world.moment,panel=$('momentPanel');
  panel.replaceChildren();
  if(!m)return;
  const scene=TownMoments.sceneFor(m),[a,b]=[m.a,m.b].map(id=>world.people.find(p=>p.id===id));
  const faces=storyNode('div','','moment-portraits');
  for(const p of [a,b]){
    const image=document.createElement('canvas');image.width=image.height=64;image.setAttribute('aria-hidden','true');
    TownMap.portrait(image,p);
    faces.append(image,storyNode('span',p.name));
  }
  panel.append(storyNode('h3',scene.title),faces);
  if(m.state==='done'){
    panel.append(storyNode('p',m.result,'story-result'));
    if(m.success)panel.append(storyNode('p','两个人都记住了这件事。接下来几天，如果他们再次在外相遇，可能会有后续。','story-meta'));
    return;
  }
  panel.append(storyNode('p',scene.prompt(a.name,b.name)),storyNode('p',`${Town.places[scene.place].name} · ${when(m.until)}`,'story-meta'));
  if(m.state==='waiting'){
    const destination=Town.places[Town.forecast(world,b,m.until)].name;
    panel.append(storyNode('p',`${a.name} 会在原处等。${b.name} 按目前的日程会去${destination}，可以临近赴约时让对方改道。`));
    panel.append(storyButton(`观察 ${b.name}`,()=>{$('person').value=b.id;$('moment').close();render();}));
    if(world.tick<m.until-2)panel.append(storyButton('前进到赴约前 1 小时',()=>{
      while(world.tick<m.until-2)Town.step(world);
      resetCrowd();save();render();
    }));
    return;
  }
  const options=storyNode('div','','moment-actions');
  const choose=(mode,title,detail,disabled=false)=>{
    const button=storyButton(title,()=>{
      if(Town.chooseMoment(world,m.root,mode)){watched=m.root;beep();save();render();}
    });
    button.append(storyNode('small',detail));button.disabled=disabled;options.append(button);
  };
  choose('hint',scene.hint,'用一次干预，趁两人还在场给一个小提示。',world.tokens<1||a.place!==scene.place||b.place!==scene.place);
  choose('reunion','让其中一人明天再来','用一次干预，留一个再见的机会。两人赴约会留下更深的记忆。',world.tokens<1);
  choose('leave','让他们自己决定','不花干预。对方的性格和信任会影响是否开口。');
  panel.append(options);
}
function renderBoard(){
  const active=TownStories.active(world),offer=TownStories.offer(world);
  $('storyButtonTitle').textContent=active?TownStories.planFor(active).name:offer.title;
  $('storyButtonDetail').textContent=active?`${when(active.time)} · ${Town.places[TownStories.planFor(active).place].name}`:
    `镇务告示 · 收藏 ${world.keepsakes?.length??0} / ${TownStories.total}`;
}
function renderStories(){
  const panel=$('storyPanel'),active=TownStories.active(world),offer=TownStories.offer(world,schoolBoard);
  panel.replaceChildren();
  if(active){
    const plan=TownStories.planFor(active),helper=world.people.find(p=>p.id===active.helper);
    const willing=TownStories.eligible(world,active,helper);
    const place=Town.places[plan.place].name;
    const forecast=Town.places[Town.forecast(world,helper,active.time)].name;
    panel.append(storyNode('h3',plan.name),storyNode('p',`${when(active.time)} · ${place} · 搭档 ${helper.name}`,'story-meta'),
      storyNode('p',active.invited?`${helper.name} 已留出时间。请让两人按约定到场。`:
        willing?`${helper.name} 愿意搭手。按目前的日程，届时可能在${forecast}。`:
          `${helper.name} 目前还不愿接这项活。可以设法让两人碰面，或看看他们的关系会怎么变。`));
    const actions=storyNode('div','','story-actions');
    const invite=storyButton(active.invited?'已经约好':world.tokens>0?'约好时间 · 1 次干预':'约好时间 · 今日次数已用完',()=>{
      if(Town.inviteStory(world)){save();render();$('storyPanel').querySelector('h3').focus();}
    },'story-primary');
    invite.disabled=active.invited||!willing||world.tokens<1;
    actions.append(invite,storyButton(`在地图上观察 ${helper.name}`,()=>{
      $('person').value=helper.id;$('stories').close();render();
    }));
    if(world.tick<active.time-2)actions.append(storyButton('前进到集合前 1 小时',()=>{
      while(world.tick<active.time-2)Town.step(world);
      resetCrowd();save();render();$('storyPanel').querySelector('h3').focus();
    }));
    panel.firstElementChild.tabIndex=-1;
    panel.append(actions,storyNode('p','到约定时刻，两人需要都在现场。你也可以用「改道」让搭档准时到场。','story-meta'));
  }else{
    const past=world.townStory;
    if(past){
      const result=world.events.findLast(e=>e.parent===past.root&&['story-done','story-missed'].includes(e.type));
      if(result)panel.append(storyNode('p',result.text,'story-result'));
    }
    const today=Math.floor(world.tick/48);
    if(past?.day===today){panel.append(storyNode('p','明天再来查看新的告示。'));}
    else{
      const offerKey=today*2+Number(schoolBoard);
      if(shownOffer!==offerKey){shownOffer=offerKey;draftPlan=0;draftHelper=null;}
      panel.append(storyNode('h3',offer.title),storyNode('p',offer.intro));
      const choices=storyNode('div','','story-choices');
      const requirements={bakery:'面包店员工',market:'商业街员工',station:'车站员工',generous:'热心的居民'};
      offer.plans.forEach((plan,index)=>{
        const choice=storyButton('',()=>{draftPlan=index;draftHelper=null;renderStories();$(`plan-${index}`).focus();});
        choice.id=`plan-${index}`;
        choice.setAttribute('aria-pressed',String(index===draftPlan));
        choice.append(storyNode('strong',plan.name),storyNode('span',plan.description),storyNode('small',`推荐 ${requirements[plan.skill]}，或信任发起人的居民`));
        choices.append(choice);
      });
      panel.append(choices);
      const proposal={story:offer.index,plan:draftPlan};
      const deadline=offer.deadline;
      const venue=TownStories.planFor(proposal).place;
      const candidates=world.people.filter(p=>p.id!==offer.host&&!TownSchool.student(p)).map(p=>({p,
        willing:TownStories.eligible(world,proposal,p),there:Town.forecast(world,p,deadline)===venue}));
      candidates.sort((a,b)=>Number(b.willing)*2+Number(b.there)-Number(a.willing)*2-Number(a.there));
      const label=storyNode('label','选择搭档');label.htmlFor='storyHelper';
      const select=document.createElement('select');select.id='storyHelper';
      for(const {p,willing,there} of candidates)option(select,p.id,`${p.name} · ${willing?'愿意搭手':'暂时不愿意'}${there?' · 日程会经过':''}`);
      if(draftHelper!==null)select.value=draftHelper;
      select.onchange=()=>{draftHelper=Number(select.value);};
      const start=storyButton('开始筹备',()=>{
        if(Town.startStory(world,draftPlan,Number(select.value),schoolBoard)){save();render();$('storyPanel').querySelector('h3').focus();}
      },'story-primary');
      const actions=storyNode('div','','story-actions');actions.append(label,select,start);
      panel.append(storyNode('p',`${when(deadline)} · ${Town.places[venue].name}`,'story-meta'),actions);
    }
  }
  if(schoolBoard){
    const roster=storyNode('div','','school-roster');
    for(const p of world.people.filter(p=>p.id>=TownSchool.teacher)){
      roster.append(storyButton(`${p.name} · ${TownRoutines.labels[Town.activity(world,p)]}`,()=>{
        $('person').value=p.id;$('stories').close();render();
      }));
    }
    panel.append(storyNode('p','点击查看老师和学生','story-meta'),roster);
  }
  const collection=(world.keepsakes??[]).map(key=>TownStories.stories[Math.floor(key/2)].plans[key%2].keepsake);
  panel.append(storyNode('p',`小镇收藏 ${collection.length} / ${TownStories.total}${collection.length?` · ${collection.join('、')}`:''}`,'story-collection'));
}
function describeCauses(event){
  const causes=[];
  let parent=event.parent;
  while(parent&&causes.length<5){
    const ancestor=world.events.find(item=>item.id===parent);
    if(!ancestor)break;
    causes.unshift(ancestor.text);parent=ancestor.parent;
  }
  return causes;
}
function renderJournal(){
  const p=selected();
  const list=$('events');list.replaceChildren();
  for(const e of world.events.slice(-20).reverse()){
    const row=document.createElement('li');
    const person=world.people.find(resident=>resident.id===e.ids?.[0]);
    const label=document.createElement(person?'button':'span');
    label.textContent=e.text;
    if(person)label.onclick=()=>{$('person').value=person.id;$('journal').close();render();};
    const sub=document.createElement('small');
    const causes=describeCauses(e);
    sub.textContent=when(e.tick)+(causes.length?' · 起因：'+causes.join(' → '):'');
    row.append(label,sub);list.append(row);
  }
  if(!world.events.length){
    const row=document.createElement('li');row.textContent='小镇还没有留下记录。';list.append(row);
  }
  $('memoryTitle').textContent=p.name+' 的记忆';
  const connections=world.people.map(other=>({other,score:p.trust[other.id]||0}))
    .filter(({score})=>score!==0).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)).slice(0,5);
  $('connections').replaceChildren(...connections.map(({other,score})=>
    storyNode('span',`${other.name} · ${score>0?'+':''}${score}`)));
  $('connections').hidden=!connections.length;
  $('memories').replaceChildren();
  const memories=NPCMemory.recall(world,p.id).slice(0,8);
  for(const memory of memories){
    const item=document.createElement('li');item.textContent=memory.interpretation;$('memories').append(item);
  }
  if(!memories.length){
    const item=document.createElement('li');item.textContent='目前没有可回顾的经历。';$('memories').append(item);
  }
}
function renderFollow(){
  const root=world.events.find(event=>event.id===watched);
  const text=$('follow');
  text.replaceChildren();
  if(!root){
    text.textContent='选一位居民，拨动一次命运，再看看事情会怎么发展。';
    return;
  }
  const outcome=world.events.findLast(e=>e.parent===root.id&&e.type!=='suspicion');
  const result=world.events.findLast(e=>e.type==='moment-favor'&&e.parent===outcome?.id)??outcome;
  const pending=world.pending.some(e=>e.parent===root.id)||TownMoments.active(world)?.root===root.id||TownWishes.activeRoot(world,root.id)||TownRelations.activeRoot(world,root.id);
  const badge=document.createElement('strong');
  badge.textContent=pending?'追踪中':result?'后续':'已发生';
  text.append(badge,document.createTextNode(result?.text??root.text));
}
function render(){
  const p=selected(),night=world.tick%48<12||world.tick%48>=40;
  $('clock').textContent=when(world.tick);
  $('skyIcon').textContent=world.power?'◐':world.weather==='小雪'?'❄':world.weather==='细雨'?'☂':night?'☾':'☀';
  $('skyIcon').title=world.power?'停电':world.weather;
  $('tokens').textContent=`今天还有 ${world.tokens} 次`;
  TownMap.portrait($('portrait'),p);
  $('wishPreview').textContent=`${p.name}：${personalThought(p)}`;
  document.querySelectorAll('[data-kind]').forEach(button=>button.disabled=!Town.canAct(world,p,button.dataset.kind));
  if(world.tokens<=0)choosingPlace=false;
  $('redirect').disabled=world.tokens<=0;
  $('redirect').setAttribute('aria-expanded',String(choosingPlace));
  $('destinations').hidden=!choosingPlace;
  $('openSchool').hidden=choosingPlace;
  renderRail();
  if($('moment').open)renderMoment();
  if($('wish').open)renderWish();
  $('mapHint').textContent=choosingPlace?`给 ${p.name} 点一个目的地`:'点击居民打开档案';
  const moment=TownMoments.active(world);
  const latest=world.events.findLast(e=>e.type!=='town');
  $('mapStory').hidden=choosingPlace||(!latest&&!moment);
  $('mapStoryLabel').textContent=moment?.state==='open'?'偶遇':moment?'赴约':'镇讯';
  if(moment){
    const scene=TownMoments.sceneFor(moment);
    $('mapStoryText').textContent=`${Town.places[scene.place].name} · ${scene.title}`;
  }else $('mapStoryText').textContent=latest?.text||'';
  $('unread').hidden=!latest||latest.id<=seenStory;
  renderBoard();
  if($('stories').open)renderStories();
  if($('journal').open)renderJournal();
  renderFollow();
  paint();
}
function advance(){
  Town.step(world);
  tickProgress=0;
  if(motion.matches)resetCrowd();
  save();render();
}
function scheduleNext(delay=Math.max(100,(1-tickProgress)*tickDuration())){
  clearTimeout(timer);
  if(running&&!document.hidden&&!modalOpen())timer=setTimeout(()=>{advance();scheduleNext();},delay);
}
function setRunning(next){
  running=next;
  manualUntil=0;
  $('auto').textContent=running?'Ⅱ':'▶';
  $('auto').setAttribute('aria-pressed',String(running));
  $('auto').setAttribute('aria-label',running?'暂停时间':'继续时间');
  $('auto').title=running?'暂停时间':'继续时间';
  scheduleNext();
  refreshMotion();
}
function intervene(kind,place){
  const before=world.sequence;
  if(!Town.influence(world,selected().id,kind,place))return;
  watched=before+1;
  choosingPlace=false;
  beep();save();render();
}
function openJournal(){
  seenStory=world.sequence;
  $('unread').hidden=true;
  renderJournal();
  $('journal').showModal();
  clearTimeout(timer);
  refreshMotion();
}
$('step').onclick=()=>{advance();manualUntil=performance.now()+7200;scheduleNext();refreshMotion();};
$('auto').onclick=()=>setRunning(!running);
$('speed').onclick=()=>{fast=!fast;$('speed').textContent=fast?'3×':'1×';scheduleNext();};
function showHomeMode(){
  $('homeView').setAttribute('aria-pressed',String(interiors));
  $('homeView').textContent=interiors?'屋内':'外观';
  $('homeView').setAttribute('aria-label',interiors?'屋内视图':'建筑外观');
}
$('homeView').onclick=()=>{
  interiors=!interiors;
  localStorage.setItem(KEY+':interiors',interiors?'on':'off');
  showHomeMode();paint();
};
showHomeMode();
$('person').onchange=render;
$('redirect').onclick=()=>{choosingPlace=!choosingPlace;render();};
$('openJournal').onclick=openJournal;
$('mapStory').onclick=()=>{
  if(TownMoments.active(world))openMoment();
  else openJournal();
};
$('closeJournal').onclick=()=>$('journal').close();
function openStories(school=false){
  schoolBoard=school;
  $('storiesTitle').textContent=school?'微光小学':'镇务告示';
  renderStories();$('stories').showModal();scheduleNext();refreshMotion();
}
$('openStories').onclick=()=>openStories();
$('openSchool').onclick=()=>openStories(true);
$('closeStories').onclick=()=>$('stories').close();
function openMoment(){renderMoment();$('moment').showModal();scheduleNext();refreshMotion();}
$('closeMoment').onclick=()=>$('moment').close();
$('openRail').onclick=()=>{$('rail').showModal();renderRail();scheduleNext();refreshMotion();};
$('closeRail').onclick=()=>$('rail').close();
function openResidentProfile(){
  renderWish();
  $('wish').showModal();
  scheduleNext();
  refreshMotion();
}
$('openWish').onclick=openResidentProfile;
$('closeWish').onclick=()=>$('wish').close();
for(const id of ['journal','stories','moment','rail','wish'])$(id).addEventListener('close',()=>{scheduleNext();refreshMotion();});
$('sound').onclick=async()=>{
  if(audio){await audio.close();audio=null;}else{audio=new AudioContext();await audio.resume();beep();}
  const label=audio?'关闭音效':'开启音效';
  $('sound').setAttribute('aria-pressed',String(!!audio));
  $('sound').setAttribute('aria-label',label);
  $('sound').title=label;
};
for(const button of document.querySelectorAll('[data-kind]'))button.onclick=()=>intervene(button.dataset.kind);
$('export').onclick=()=>{
  const link=document.createElement('a');
  link.href=URL.createObjectURL(new Blob([JSON.stringify({...world,watchedEvent:watched},null,2)],{type:'application/json'}));
  link.download='god-dice-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
};
$('importButton').onclick=()=>$('import').click();
$('import').onchange=async event=>{
  try{
    const file=event.target.files[0];if(!file)return;
    const data=JSON.parse(await file.text());
    if(!Town.valid(data))throw new Error();
    Town.upgrade(data);
    const newWatch=Number.isInteger(data.watchedEvent)?data.watchedEvent:null;
    if(!SaveManager.save(localStorage,KEY,{...data,savedAt:Date.now()},Town.valid))throw new Error();
    world=data;watched=newWatch;seenStory=world.sequence;choosingPlace=false;
    resetCrowd();populateResidents();
    render();$('notice').textContent='已恢复存档。';
  }catch{$('notice').textContent='存档无效或无法写入。';}
  finally{event.target.value='';}
};
window.addEventListener('resize',paint);
document.addEventListener('visibilitychange',()=>{scheduleNext();refreshMotion();});
motion.addEventListener('change',()=>{if(motion.matches){resetCrowd();paint();}refreshMotion();});
window.addEventListener('pagehide',save);
save();render();
setRunning(true);
