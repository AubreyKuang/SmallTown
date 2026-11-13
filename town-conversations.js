'use strict';

const TownConversations=(()=>{
  const casual=[
    ['各自的去处','你接下来往哪边走？','我想先在这儿待一会儿。难得路上不用赶。','那我陪你站一小会儿。'],
    ['街边的声音','我上次坐在街边，才发现每家关门的声音都不一样。','商街那几扇门最好认，隔半条街都能听见。','下回你指给我听。'],
    ['聊聊近况','你最近是不是挺忙的？','还好。只是做完一件，又想起下一件。','哪天路过，叫我一起歇一会儿。'],
    ['给自己留点空','你会把休息也写在日程上吗？','会。不写的话，一转眼一天就过去了。','那我今天也给自己留半小时。']
  ];
  const weather={
    细雨:['细雨','刚才还只是飘雨，现在袖口都湿了。','沿屋檐走吧，拐角那里有一段淋不到。','行，我也正想慢一点。'],
    小雪:['下雪','你看，路边的雪开始积起来了。','刚才我看见几串脚印，转到拐角就没有了。','可能是跑到屋里暖手去了。']
  };
  const student=[
    ['课间的事','你记得我们说要去操场看什么吗？','记得，先去找围墙边那棵树。','好，这次先说好在哪里碰头。'],
    ['放学以后','回去之前，我还想在外头待一会儿。','那就多走一小段，天还没黑呢。','好，走到拐角就回家。'],
    ['课本上的折角','你也把喜欢的那一页折起来了？','嗯，可我现在每一页都有折角。','那你挑一页，明天念给我听。']
  ];
  const person=(w,id)=>w.people.find(p=>p.id===id);
  function exchange(topic,first,second,lines,event){
    return {topic,source:event?.id??null,lines:lines.map((text,i)=>({speaker:i%2?second.id:first.id,text}))};
  }
  function reaction(listener,lines){
    return lines[listener.temperament==='skeptic'?2:listener.temperament==='generous'?1:0];
  }
  function publicStory(w,event,a,b){
    const participants=(event.ids??[]).map(id=>person(w,id)).filter(Boolean);
    const [subject]=participants;
    const mover=participants.find(p=>p===a||p===b);
    const other=mover===a?b:a;
    switch(event.type){
      case 'build-move-in': {
        if(!subject)return null;
        const street=TownBuild.plots[subject.homePlot]?.name??'新屋那一带';
        if(mover)return exchange('新邻居',other,mover,[
          `${mover.name}，听说你刚搬到${street}？`,'对，箱子还没拆完。刚才出门差点忘了带新家的钥匙。',
          reaction(other,['认准门牌就好，第一次回来我也走过头。','有箱子抬不动就来喊我，我认得那条路。','那边的门牌晚上不太好认，记个路标更稳。']),
          '我得记一下。下次碰见你，我再跟你打招呼。'
        ],event);
        const names=participants.map(p=>p.name).join(' 和 ');
        return exchange('新邻居',a,b,[
          `听说 ${names} 搬进${street}的新屋了。`,
          reaction(b,['我路过的时候去打个招呼。','刚搬来肯定忙，要不要改天给他们带点面包？','你见到人了？我可一直只见过那间空屋。']),
          '有机会当面认识一下吧。以后在路上说不定天天碰见。'
        ],event);
      }
      case 'build-ready': {
        const street=TownBuild.plots[event.plot]?.name;
        return exchange('新房落成',a,b,[
          street?`听说${street}那边的新屋竣工了。`:'听说那栋新屋终于收拾好了。',
          '门还没开吧？等有人住进去，那条路晚上就有灯了。','等搬家那天过去看看。'
        ],event);
      }
      case 'festival-arrival':
        return exchange('鹿野到站了',a,b,[
          '你看见鹿野从午后的车上下来了吗？','还没。听说他提着手风琴，待会儿要去广场。','我等下路过广场，看看赶不赶得上。'
        ],event);
      case 'visitor-arrival':
        return exchange('早班车上的旅客',a,b,[
          event.visitorName?`听说 ${event.visitorName} 坐早班车来了。`:'听说今天早班车带来了客人。',
          '这么早就到了？车站外头的长椅倒是个歇脚的地方。','等路过车站，看看能不能打个招呼。'
        ],event);
      case 'supply-delivery':
        return exchange('商街的新面包',a,b,[
          '听说商街刚到了一批面包。','这会儿赶过去，纸袋提在手里大概还是暖的。','那你走前头，我还没想好买哪种。'
        ],event);
      case 'supply-close':
        return exchange('今天的面包摊',a,b,[
          '你听说了吗？面包摊收摊了。','又错过了。我还想着挑个脆边的呢。','明早路过的时候，记得先问几点出炉。'
        ],event);
      case 'festival-held':
        return exchange(event.festivalName,a,b,[
          `广场刚办完${event.festivalName}，你去了吗？`,
          event.ids.includes(b.id)?'去了。站在喷泉边，身边都是熟面孔。':'我那会儿有事。下回得早点在日历上画一笔。',
          '回头看看日报吧。也许还有熟人在上面。'
        ],event);
      case 'blackout':
        return exchange('镇上停电',a,b,[
          '听说镇上停电了。你家手电放哪儿了？',
          reaction(b,['大概在门边，我回去找找。','在门边。你家要是找不着，先来拿我的。','手电在，电池有没有电还得先试试。']),
          '好，回去先看一眼。'
        ],event);
      case 'snowman':
        if(!subject)return null;
        return exchange('路边的雪人',a,b,[
          `听说 ${subject.name} 他们堆了个歪脖子的雪人。你路过看见了吗？`,
          '还没。要是鼻子掉了，我可以给它捡颗松果。','走，天黑以前去看看。'
        ],event);
      case 'meteor':
        return exchange('广场上的流星',a,b,[
          '你听说广场上有人看见流星了吗？','听说了。我总是刚低头，别人就喊我快看。','下回找张长椅，坐着慢慢等。'
        ],event);
      case 'travel-depart':
      case 'travel-return':
        if(!subject)return null;
        return exchange('列车来往',a,b,[
          `听说 ${subject.name} ${event.type==='travel-return'?'坐火车回镇了':'坐火车去了外地'}。`,
          event.type==='travel-return'?'下次碰见，我想问问外头这几天是什么样。':'出门两天，回来总有点新鲜事可讲吧。',
          '留着等见面的时候问。'
        ],event);
    }
    return null;
  }
  function overheard(event,a,b){
    if(!['gossip','rumor'].includes(event.type)||!event.claim)return null;
    const [from,to]=event.ids??[];
    const teller=a.id===from?a:b,listener=teller===a?b:a;
    if(teller.id!==from||listener.id!==to)return null;
    const quote=text=>text.replace(/[。！？]$/,'');
    return exchange('刚才那句传闻',listener,teller,event.misheard?[
      `等一下，你刚才的意思是「${quote(event.misheard)}」？`,
      `我转述的那句是「${quote(event.claim)}」。我也是听来的。`,
      '原来是我听岔了。还是等当事人自己开口吧。'
    ]:[
      '刚才那件事，你是亲眼看见的？',
      `我听到的说法是「${quote(event.claim)}」。到底怎样，得问当事人。`,
      '那我先记着，见到人再问。'
    ],event);
  }
  function moneyStory(event,a,b){
    if(!['treat','loan','repay'].includes(event.type)||!(event.amount>0))return null;
    const [payer]=event.ids??[];
    const first=a.id===payer?a:b,second=first===a?b:a;
    if(first.id!==payer)return null;
    if(event.type==='treat'){
      if(event.ids.includes(second.id))return exchange('上次那顿点心',second,first,[
        '上次你请客，我都忘了问，花了多少？',`一共 ${event.amount} 元。几个人一起坐着，比我自己在家吃热闹多了。`,
        reaction(second,['下次轮到我，咱们先说好各点什么。','下次我请。你记得挑你喜欢的。','下次先看价签。想坐下来聊，点一份也行。'])
      ],event);
      if((first.trust[second.id]??0)>=8)return exchange('请客花的钱',first,second,[
        `上回请大家${event.what??'吃点东西'}，我结账花了 ${event.amount} 元。`,
        reaction(second,['够几个人分的？下回先看看菜单吧。','难得聚一次。下回可以轮着请。','下次问清楚单价。人一多，小账也能叠起来。']),
        '嗯，今天我先把这笔记下来。'
      ],event);
      return null;
    }
    if(event.ids[1]!==second.id)return null;
    if(event.type==='loan')return exchange('那笔借款',first,second,[
      `刚借给你的 ${event.amount} 元，够用吗？`,'先够了。等手头宽一点，我来找你。','好，要是有变动，提前跟我说一声。'
    ],event);
    if(event.type==='repay')return exchange('还上的钱',first,second,[
      `我${event.amount<15?'先':''}还了你 ${event.amount} 元。想跟你说声谢，之前那阵子确实周转不开。`,'收到了。下次有事就提前跟我说。','好，这事我心里一直惦记着。'
    ],event);
    return null;
  }
  function create(w,a,b){
    const opportunity=TownCrossroads.clue(w,a,b);
    if(opportunity)return opportunity;
    const choice=Math.min(a.id,b.id)*7+Math.max(a.id,b.id)*11+w.tick;
    if(TownSchool.student(a)&&TownSchool.student(b)){
      const [topic,...lines]=student[choice%student.length];
      return exchange(topic,a,b,lines);
    }
    const options=[];
    const heard=new Set();
    for(let i=w.events.length-1;i>=0;i--){
      const event=w.events[i];
      if(event.tick<w.tick-48)break;
      if(event.type==='road-talk'){
        if(event.ids?.some(id=>id===a.id||id===b.id)){
          heard.add(event.parent);
          heard.add(event.conversationTopic);
        }
        continue;
      }
      if(heard.has(event.id))continue;
      if(event.type==='travel-return'&&event.tick>=w.tick-16){
        const traveler=event.ids?.includes(a.id)?a:event.ids?.includes(b.id)?b:null;
        const recollection=traveler&&NPCMemory.recall(w,traveler.id).find(m=>m.type==='travel-return'&&m.time===event.tick);
        if(recollection&&!heard.has('刚回镇的旅程'))return exchange('刚回镇的旅程',traveler===a?b:a,traveler,[
          '你回来了！这趟火车坐得怎么样？',recollection.interpretation,'改天有空再给我讲讲。'
        ],event);
      }
      const personal=moneyStory(event,a,b)??overheard(event,a,b);
      if(personal&&!heard.has(personal.topic))return personal;
      if(event.tick>=w.tick-32){
        const story=publicStory(w,event,a,b);
        if(!story||heard.has(story.topic))continue;
        if(event.type==='build-move-in'&&event.tick>=w.tick-12)return story;
        if(options.length<4&&!options.some(option=>option.topic===story.topic))options.push(story);
      }
    }
    if(options.length&&(options.length===1||choice%4!==0))return options[choice%options.length];
    const everyday=casual.filter(([topic])=>!heard.has(topic));
    const choices=everyday.length?everyday:casual;
    const [topic,...lines]=Object.hasOwn(weather,w.weather)&&!heard.has(w.weather)?weather[w.weather]:choices[choice%choices.length];
    return exchange(topic,a,b,lines);
  }
  return {create};
})();
