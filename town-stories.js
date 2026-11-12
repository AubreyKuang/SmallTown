'use strict';

const TownStories=(()=>{
  const stories=[
    {title:'微光夜市',intro:'Mina 想给夜市加一处让人愿意停下来的摊位。',host:4,plans:[
      {name:'面包长桌',place:'market',skill:'bakery',description:'烤出一炉面包，在商业街摆张长桌。',keepsake:'夜市面包牌',result:'商街摆起长桌，面包刚出炉就分完了。'},
      {name:'广场灯会',place:'square',skill:'generous',description:'在广场挂纸灯，请一位热心的邻居帮忙。',keepsake:'广场纸灯',result:'广场亮起纸灯，几位邻居留下来交换故事。'}]},
    {title:'没写地址的包裹',intro:'Newton 在站台捡到一个只有名字的旧包裹。',host:3,plans:[
      {name:'站台寻人',place:'station',skill:'station',description:'找熟悉车站的人帮忙查问乘客。',keepsake:'旧车票',result:'车站的熟客认出收件人的名字，包裹赶上了末班车。'},
      {name:'咖啡厅招领',place:'cafe',skill:'generous',description:'请一位热心的居民在咖啡厅帮忙接待。',keepsake:'手写招领牌',result:'失主在咖啡厅认出了包裹，留下了一张亲笔道谢的卡片。'}]},
    {title:'河岸的纪念',intro:'Iris 找到一张老照片，想把当年的河岸故事留在镇上。',host:7,plans:[
      {name:'树林故事牌',place:'forest',skill:'generous',description:'请人一起选一处林间小径，把故事写到木牌上。',keepsake:'林间故事牌',result:'两人立好木牌，后来散步的人也能读到那张照片的来历。'},
      {name:'广场照片墙',place:'square',skill:'market',description:'请熟悉商街的居民筹措相框，在广场展出。',keepsake:'老照片墙',result:'广场挂上第一张照片，几个邻居也答应带来自己的旧相片。'}]},
    {title:'放学后的小约定',intro:'Marin 想在放学后留一个角落，让愿意留下的孩子一起做点东西。',host:TownSchool.teacher,plans:[
      {name:'操场观察角',place:'schoolyard',skill:'market',description:'请商街的居民找来花盆和种子，在操场边做一个观察角。',keepsake:'校园观察花坛',result:'孩子们把自己认得的花草画到标签上，插在了新花坛里。'},
      {name:'教室故事会',place:'school',skill:'generous',description:'找一位热心邻居来读故事，孩子们轮流给故事接一个结尾。',keepsake:'校园故事书架',result:'教室添了一个故事书架，孩子们留下了各自写的结尾。'}]}
  ];
  const schoolIndex=stories.length-1;
  const total=stories.length*2;
  const day=w=>Math.floor(w.tick/48);
  const deadline=(day,index)=>(day+1)*48+(index===schoolIndex?31:35);
  const active=w=>w.townStory?.result===null?w.townStory:null;
  const resident=(w,id)=>w.people.find(person=>person.id===id);
  const planFor=story=>stories[story.story].plans[story.plan];
  const offer=(w,school=false)=>{
    const index=school?schoolIndex:day(w)%schoolIndex;
    return {index,...stories[index],deadline:deadline(day(w),index)};
  };
  function eligible(w,story,helper){
    const host=resident(w,stories[story.story].host);
    if(!helper||helper===host||TownSchool.student(helper))return false;
    const skill=planFor(story).skill;
    const trust=(helper.trust[host.id]||0)+NPCMemory.influence(w,helper.id,host.id)*10;
    return trust>=-8&&(helper.job===skill||helper.temperament===skill||trust>=7);
  }
  function start(w,plan,helperId,log,school){
    const choice=offer(w,school),helper=resident(w,helperId);
    if(active(w)||w.townStory?.day===day(w)||!Number.isInteger(plan)||!choice.plans[plan]||!helper||helper.id===choice.host||TownSchool.student(helper))return false;
    const time=choice.deadline;
    const story={story:choice.index,plan,helper:helperId,day:day(w),time,invited:false,result:null};
    story.root=log(`${resident(w,choice.host).name} 决定筹备「${choice.plans[plan].name}」，想请 ${helper.name} 搭把手。`,null,'story-start',[choice.host,helperId]);
    w.townStory=story;
    return true;
  }
  function invite(w,log){
    const story=active(w);
    if(!story||story.invited||w.tokens<1||w.tick>=story.time||!eligible(w,story,resident(w,story.helper)))return false;
    w.tokens--;
    story.invited=true;
    log(`${resident(w,story.helper).name} 答应把时间留出来。`,story.root,'story-invite',[story.helper]);
    return true;
  }
  function destination(w,p){
    const story=w.townStory;
    if(!story||w.tick<story.time-2||w.tick>story.time+1||story.result==='missed')return;
    if(p.id===stories[story.story].host||(story.invited&&p.id===story.helper))return planFor(story).place;
    if(story.story===schoolIndex&&story.result==='done'&&TownSchool.student(p)&&(p.id+story.day)%2===0)return planFor(story).place;
  }
  function settle(w,log,remember){
    const story=active(w);
    if(!story||w.tick<story.time)return;
    const host=resident(w,stories[story.story].host),helper=resident(w,story.helper),plan=planFor(story);
    const there=host.place===plan.place&&helper.place===plan.place;
    const success=there&&eligible(w,story,helper);
    story.result=success?'done':'missed';
    const text=success?`${host.name} 和 ${helper.name} 完成了「${plan.name}」。${plan.result}`:
      !there?`「${plan.name}」没有办成。${host.place!==plan.place?host.name:helper.name} 没能在约定时间到场。`:
        `「${plan.name}」没能办成。${helper.name} 到了现场，还是没答应帮忙。`;
    const source=log(text,story.root,success?'story-done':'story-missed',[host.id,helper.id]);
    if(!success)return;
    w.keepsakes??=[];
    const key=story.story*2+story.plan;
    if(!w.keepsakes.includes(key))w.keepsakes.push(key);
    for(const p of [host,helper])p.mood=Math.min(100,p.mood+12);
    remember(host,helper,'town-project',.8,`我和 ${helper.name} 一起完成了${plan.name}。`,source);
    remember(helper,host,'town-project',.75,`${host.name} 找我搭手，我们把${plan.name}办成了。`,source);
  }
  function valid(w){
    const s=w.townStory;
    const validStory=s==null||(Number.isInteger(s.story)&&Number.isInteger(s.plan)&&Number.isInteger(s.day)&&s.day>=0&&
      stories[s.story]?.plans[s.plan]&&(s.story===schoolIndex||s.story===s.day%schoolIndex)&&s.time===deadline(s.day,s.story)&&s.day<=day(w)&&resident(w,s.helper)&&s.helper!==stories[s.story].host&&
      Number.isInteger(s.root)&&s.root>0&&s.root<=w.sequence&&typeof s.invited==='boolean'&&[null,'done','missed'].includes(s.result));
    return validStory&&(w.keepsakes==null||(Array.isArray(w.keepsakes)&&new Set(w.keepsakes).size===w.keepsakes.length&&
      w.keepsakes.every(key=>Number.isInteger(key)&&key>=0&&key<total)));
  }
  return {stories,offer,active,planFor,eligible,start,invite,destination,settle,valid,total};
})();
