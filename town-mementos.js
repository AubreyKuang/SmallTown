'use strict';

const TownMementos=(()=>{
  // Positions sit beside paths and doors, outside resident stopping points.
  const objects={
    bakery:{x:474,y:228,place:'bakery',name:'面包店',art:'paper'},
    station:{x:838,y:497,place:'station',name:'火车站',art:'paper'},
    school:{x:777,y:88,place:'school',name:'微光小学',art:'book'},
    square:{x:615,y:337,place:'square',name:'中央广场',art:'lantern'},
    market:{x:817,y:254,place:'market',name:'商业街',art:'lantern'},
    tune:{x:471,y:399,place:'square',name:'中央广场',art:'music'}
  };
  const details=[
    {
      choices:[
        ['bakery','炉边的脆皮配方','Bob 说面包边还可以再脆一点。Alice 在配方边写下「多烤两分钟」，把它夹在炉边。'],
        ['bakery','配方背面的几句话','改签腾出了一整个晚上。Bob 吃完一整片才给出意见，Alice 把几句话都写在了配方背面。'],
        ['station','站台边的面包纸袋','Bob 另外留了一只纸袋，袋口写着两人在站台试吃的事。剩下的面包已经包好，等 Alice 带上晚班车。']
      ],
      later:['bakery','摊开的手写食谱','Alice 回来后把邻镇的食谱摊开。Bob 说完那天怎么没赶上，两人把下次试吃的日期写在页角。']
    },
    {
      choices:[
        ['school','折了角的旧故事书','Newton 赶在放学前送回了书。最后一页折了个角，几个猜中结尾的孩子在旁边画了星星。'],
        ['station','画着站台的书签','Marin 到车站取书时，Newton 夹进一张小书签。后来他又画了一张，留在候车室外。']
      ],
      later:['school','孩子们猜的结尾','故事书迟了一天才到。Marin 把孩子们猜过的结尾装订在一起，放在学校门边。']
    },
    {
      choices:[
        ['square','广场上的第一盏灯','Iris 帮 Owen 收好摊，两人赶在天黑前把灯挂了起来。后来路过广场的人也能看见它。'],
        ['market','摊位旁的灯笺','Owen 腾出一只手扶绳子，最后一位客人留下来看灯亮。Iris 把灯笺留在了摊位边。']
      ],
      later:['square','系着新绳的灯笺','那晚没来得及挂好。第二天 Owen 带来新绳，两人趁天还亮，把灯笺系在广场边。']
    }
  ];
  function fromStory(w,id){
    const state=w.crossroads?.[id];
    if(state?.phase!=='done')return null;
    const ending=TownCrossroads.ending(w,String(id));
    if(!ending)return null;
    const detail=ending.route==='later'?details[id].later:details[id].choices[state.choice];
    if(!detail)return null;
    const [spot,title,text]=detail;
    return {...objects[spot],id,title,text,tick:ending.tick};
  }
  function list(w){
    const items=details.map((_,id)=>fromStory(w,id)).filter(Boolean);
    if(w.festivalTune?.phase==='done'&&w.festivalTune.played<=w.tick){
      items.push({...objects.tune,id:'tune',title:'喷泉边的四句旋律',tick:w.festivalTune.played,
        text:'鹿野把 Pip 自己加的那一句写进了曲谱。广场边留着一份抄本，第四句旁画着一滴水。'});
    }
    return items.sort((a,b)=>b.tick-a.tick);
  }
  function draw(ctx,item,night,{ellipse,line,polygon}){
    const {x,y,art}=item;
    ellipse(ctx,x,y+3,8,3,'#3a30275c');
    if(art==='lantern'){
      line(ctx,[[x+5,y+4],[x+5,y-11],[x,y-11],[x,y-7]],'#684d37',2);
      if(night)ellipse(ctx,x,y-3,13,10,'#ffe09952');
      ellipse(ctx,x,y-3,4.5,5,'#925848');
      ellipse(ctx,x,y-3,3,3.9,'#ffcd77');
      return;
    }
    polygon(ctx,[[x-8,y-5],[x+6,y-6],[x+9,y+1],[x-6,y+2]],art==='book'?'#925452':'#906b4c');
    polygon(ctx,[[x-6,y-7],[x+5,y-8],[x+7,y-1],[x-5,y]],'#ffebbb');
    line(ctx,[[x-3,y-5],[x+3,y-6]],'#a38261',.8);
    line(ctx,[[x-2,y-3],[x+4,y-4]],'#a38261',.8);
    if(art==='music')ellipse(ctx,x+3,y-4,1.6,1.1,'#96617f');
  }
  return {list,draw};
})();
