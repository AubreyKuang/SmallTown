'use strict';

const TownRoutines=(()=>{
  const labels={
    sleep:'在家睡觉',breakfast:'在家准备早餐',read:'在家看书',cook:'在家做饭',rest:'在家休息',
    walk:'散步',coffee:'喝咖啡',shop:'买东西',lunch:'吃午饭',work:'在上班',commute:'等班车',
    teach:'正在上课',class:'听课',prepare:'准备上课',recess:'在操场玩',indoorRecess:'室内课间',homework:'在家写作业',play:'放学后玩耍',
    stars:'在广场看星星',project:'准备镇务',visit:'临时改道',wish:'为自己的事留了时间',
    date:'赴约',dateOvertime:'还在收摊，惦记着约会',dateRepair:'和恋人见面，把话说清楚',
    learnTune:'在喷泉边学一段曲子',shareTune:'在广场哼起上次的曲子',
    party:'参加广场派对',festival:'在广场看风铃',concert:'在广场听演奏',welcomeGuest:'在车站接鹿野',
    crossroads:'为碰面留了时间',meet:'赴一个约定',meteor:'在广场看流星',experiment:'在广场守着一枚硬币',lecture:'在广场听 Newton 演讲',speech:'在广场演讲',
    twilight:'坐在灯笺旁',trainWait:'在候车室等车',trainBoard:'正在上车',trainReturn:'刚下火车',away:'这两天不在小镇',moveIn:'刚下车，准备搬进新家',breadCart:'在推车送货',breadBake:'在烤今天的面包'
  };
  const at=(place,activity)=>({place,activity});
  const hourTick=tick=>tick%48;
  function shift(p,tick){
    const day=Math.floor(tick/48),start=17+(p.id*5)%7;
    return {start,end:start+12+(p.id*7)%5,off:(day+p.id*3)%8===0,bus:p.id%3===2||p.id%7===1};
  }
  function canDelay(w,p){
    const work=shift(p,w.tick),time=hourTick(w.tick);
    return !work.off&&work.bus&&time>=14&&time<work.start&&(p.delay??0)<work.start+w.tick-time;
  }
  // Independent choices per resident and day. Forecasting never consumes the world's event RNG.
  function pick(p,tick,salt,size){
    const day=Math.floor(tick/48);
    const n=Math.imul(p.id+37,0x45d9f3b)^Math.imul(day+salt,0x119de1f3);
    return ((n^(n>>>16))>>>0)%size;
  }
  function leisure(w,p,part){
    const outside=p.habit==='forest'?'forest':p.habit==='square'?'square':p.id%2?'forest':'square';
    const choices=[
      at('homes',p.id%2?'read':'rest'),at('homes','cook'),at(outside,'walk'),
      at(p.habit==='cafe'?'cafe':outside,p.habit==='cafe'?'coffee':'walk'),
      at('market','shop'),at('cafe','coffee')
    ];
    if(w.weather!=='晴朗')choices.splice(2,2,at('homes','read'),at('cafe','coffee'));
    if(p.mood<45)choices.push(at('homes','rest'),at('homes','read'));
    return choices[pick(p,w.tick,part,choices.length)];
  }
  function daily(w,p){
    const time=hourTick(w.tick),work=shift(p,w.tick);
    const wake=12+(p.id*7)%6,bed=42+(p.id*5)%6;
    if(time<wake||time>=bed)return at('homes','sleep');
    const lunch=23+(p.id*3)%5;
    const firstBreak=work.off?wake+2+(p.id%3):work.end;
    const secondBreak=firstBreak+3+p.id%5;
    if(!work.off){
      if(p.delay>w.tick&&time>=work.start-1)return at('station','commute');
      if(time>=work.start&&time<work.end){
        if(time>=lunch&&time<lunch+2&&p.id%5!==0){
          return at(['homes','bakery','square','cafe'][p.id%4], 'lunch');
        }
        return at(p.job,'work');
      }
      if(work.bus&&time<work.start&&time>=Math.min(work.start-1,Math.max(18,work.start-3)))return at('station','commute');
    }
    if(time<firstBreak){
      if(time>=work.start-3&&p.id%5===0&&!work.off)return at('cafe','coffee');
      return work.off?at('homes',time<wake+2?'breakfast':'read'):at('homes','breakfast');
    }
    if(work.off&&time<firstBreak+5&&w.weather==='晴朗'&&p.id%3===0)return at('forest','walk');
    if(time>=bed-2)return at('homes',p.id%2?'read':'rest');
    return leisure(w,p,time<secondBreak?1:time<secondBreak+4?2:3);
  }
  return {daily,shift,canDelay,labels};
})();
