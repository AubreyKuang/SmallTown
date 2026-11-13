'use strict';

const TownConversations=(()=>{
  const newsTopics={
    'build-ready':['新房落成','那栋房子终于收拾好了','等搬家那天，路上就多两张熟面孔了。'],
    'build-move-in':['新邻居','镇上来了新邻居','碰到他们的时候，我去打个招呼。'],
    'visitor-arrival':['早班车上的旅客','今天早班车带来了客人','坐那么久的车，下来总得先找个地方歇一歇。'],
    'supply-delivery':['商街的新面包','商街刚收到一批面包','那我得去看看，晚一点好吃的就被挑走了。'],
    'supply-close':['今天的面包摊','面包摊今天收摊了','明早路过的时候，我再看看他们今天烤什么。'],
    'blackout':['镇上停电','听说镇上停电了','那我回去先把手电放在门边。'],
    'travel-return':['坐火车回镇的人','刚有人从外地回来了','下次在站台遇到，问问外头最近是什么样。']
  };
  const casual=[
    ['各自的去处','你接下来往哪边走？','我想先在这儿待一会儿。难得路上不用赶。','那我陪你站一小会儿。'],
    ['小镇的下午','我发现坐在街边，比从街上走过去能听到更多声音。','我上次坐了一会儿，才发现每家关门的声音都不一样。','那下回你指给我听。'],
    ['聊聊近况','你最近是不是挺忙的？','还好。只是有些事在心里排了队，做完一件又想起下一件。','哪天路过，叫我一起歇一会儿。']
  ];
  const weather={
    细雨:['细雨','刚才还只是飘雨，现在袖口都湿了。','沿屋檐走吧，拐角那里有一段淋不到。','行，我也正想慢一点。'],
    小雪:['下雪','你看，路边的雪开始积起来了。','刚才我看见几串脚印，转到拐角就没有了。','可能是跑到屋里暖手去了。']
  };
  const student=[
    ['课间的事','课间的时候，你还记得我们说要做什么吗？','记得。等有空我们去操场看看。','好，这次先说好在哪里碰头。'],
    ['放学以后','回去之前，我还想在外头待一会儿。','那就多走一小段，天还没黑呢。','好，走到拐角就回家。']
  ];
  function create(w,a,b){
    const choice=(Math.min(a.id,b.id)*7+Math.max(a.id,b.id)*11+w.tick);
    function exchange(topic,lines,speakers=[a,b,a],source=null){
      return {topic,source,lines:lines.map((text,i)=>({speaker:speakers[i].id,text}))};
    }
    if(TownSchool.student(a)&&TownSchool.student(b)){
      const [topic,...lines]=student[choice%student.length];
      return exchange(topic,lines);
    }
    const news=w.events.filter(event=>Object.hasOwn(newsTopics,event.type)&&event.tick>=w.tick-32).slice(-4);
    const returnee=w.events.findLast(event=>event.type==='travel-return'&&event.tick>=w.tick-16&&
      (event.ids.includes(a.id)||event.ids.includes(b.id)));
    if(returnee){
      const traveler=returnee.ids.includes(a.id)?a:b,listener=traveler===a?b:a;
      const recollection=NPCMemory.recall(w,traveler.id).find(memory=>memory.type==='travel-return'&&memory.time===returnee.tick);
      if(recollection)return exchange('刚回镇的旅程',[
        '你回来了！这趟火车坐得怎么样？',recollection.interpretation,'改天有空再给我讲讲。'
      ],[listener,traveler,listener],returnee.id);
    }
    if(news.length&&choice%3!==0){
      const event=news[choice%news.length], [topic,opener,reply]=newsTopics[event.type];
      return exchange(topic,[`你听说了吗？${opener}。`,reply],[a,b],event.id);
    }
    const [topic,...lines]=Object.hasOwn(weather,w.weather)?weather[w.weather]:casual[choice%casual.length];
    return exchange(topic,lines);
  }
  return {create};
})();
