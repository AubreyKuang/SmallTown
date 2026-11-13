'use strict';

const TownSupply=(()=>{
  const demand=8, arrival=18, close=36, initialCoins=8;
  const depots={
    square:{name:'广场货棚',place:'square',x:631,y:401,travel:5,cost:0},
    station:{name:'站边货棚',place:'station',x:736,y:477,travel:3,cost:12}
  };
  const stops={station:{place:'station',x:839,y:472},bakery:{place:'bakery',x:433,y:229},market:{place:'market',x:770,y:246}};
  const day=w=>Math.floor(w.tick/48);
  const make=()=>({coins:initialCoins,depot:'square',nextDepot:null,lastDay:-1,run:null});
  const current=w=>w.supply?.run?.day===day(w)?w.supply.run:null;
  const stage=w=>current(w)?.stage??(w.tick%48>=close?'closed':'waiting');
  const peopleAt=(w,place)=>w.people.filter(p=>p.place===place&&!TownSchool.student(p)&&
    ['work','walk','shop','coffee','rest','visit','lunch'].includes(p.activity));
  const worker=(w,place)=>peopleAt(w,place).find(p=>p.job===place)??peopleAt(w,place)[0];
  const dayStart=w=>w.tick-w.tick%48;
  function startLeg(w,run,stage,person,travel){
    run.stage=stage;
    run.leg={person:person.id,from:w.tick,to:w.tick+Math.max(1,travel-(run.helper===person.id?2:0))};
  }
  function sell(state,run){
    const amount=Math.min(4,run.bread);
    run.sold+=amount;run.bread-=amount;state.coins+=amount;
  }
  function step(w,log,remember){
    const hour=w.tick%48;
    if(hour<arrival||hour>close)return;
    const state=w.supply??=make();
    if(state.lastDay!==day(w)){
      state.lastDay=day(w);
      state.depot=state.nextDepot??state.depot;
      state.nextDepot=null;
      state.run={day:day(w),stage:'unload',flour:4,bread:0,sold:0,helper:null};
      log('早班列车带来了四袋面粉。',null,'supply-arrival',[]);
    }
    const run=state.run;
    if(['served','short'].includes(run.stage))return;
    if(hour===close){
      run.stage=run.sold>=demand?'served':'short';
      delete run.leg;
      log(run.stage==='served'?`商街卖完了今天的 ${run.sold} 个面包。`:`收市时商街只卖出 ${run.sold} 个面包，今天需要 ${demand} 个。`,null,'supply-close',[]);
      return;
    }
    const weatherDelay=w.weather==='细雨'?3:w.weather==='小雪'?2:0;
    const depot=depots[state.depot];
    const {leg}=run;
    if(leg&&w.tick<leg.to)return;
    const atStation=()=>peopleAt(w,'station').find(p=>p.id===run.helper)??worker(w,'station');
    switch(run.stage){
      case 'unload': {
        const carrier=atStation();
        if(carrier)startLeg(w,run,'inbound',carrier,depot.travel+weatherDelay);
        break;
      }
      case 'inbound':
      case 'oven-wait': {
        const baker=peopleAt(w,'bakery').find(p=>p.job==='bakery');
        if(!baker){run.stage='oven-wait';delete run.leg;break;}
        startLeg(w,run,'baking',baker,4);
        if(run.helper){
          const helper=w.people.find(p=>p.id===run.helper);
          const source=log(`${helper.name} 帮 ${baker.name} 把面粉赶在开炉前送到了。`,run.helpEvent,'supply-help',[baker.id,helper.id]);
          if(helper!==baker)remember(baker,helper,'supply-help',.65,`今天多亏 ${helper.name} 把面粉及时送来。`,source,75);
        }
        break;
      }
      case 'baking':
        run.bread=run.flour*2;run.flour=0;
        run.stage='pickup';delete run.leg;
        break;
      case 'pickup': {
        const carrier=worker(w,'bakery')??worker(w,'market');
        if(carrier)startLeg(w,run,'outbound',carrier,2+weatherDelay);
        break;
      }
      case 'outbound':
        run.stage='market';delete run.leg;
        log(`今天的 ${run.bread} 个面包送到了商街。`,null,'supply-delivery',[]);
        sell(state,run);
        break;
      case 'market':
        sell(state,run);
        break;
    }
  }
  function helper(w){
    const run=current(w);
    if(!run||!['unload','inbound'].includes(run.stage)||run.helper||!w.tokens)return null;
    if(run.stage==='inbound'&&run.leg.to-w.tick<=1)return null;
    return peopleAt(w,'station').find(p=>p.id!==run.leg?.person)??null;
  }
  function assist(w,id,log){
    const person=helper(w);
    if(!person||person.id!==id)return false;
    const run=current(w);
    run.helper=id;w.tokens--;
    if(run.stage==='inbound'){
      const leg=run.leg;
      leg.offset=fraction(leg,w.tick);
      leg.from=w.tick;
      leg.to=Math.max(w.tick+1,leg.to-2);
    }
    run.helpEvent=log(`你让 ${person.name} 搭把手，面粉可以更早送到。`,null,'supply-intervene',[id]);
    return run.helpEvent;
  }
  function build(w){
    const state=w.supply??=make();
    if(state.depot==='station'||state.nextDepot||state.coins<depots.station.cost)return false;
    state.coins-=depots.station.cost;
    state.nextDepot='station';
    return true;
  }
  function route(w,run){
    if(run.stage==='outbound')return [stops.bakery,stops.market];
    const depot=depots[w.supply.depot];
    return [stops.station,depot,stops.bakery];
  }
  const fraction=(leg,tick)=>(leg.offset??0)+(1-(leg.offset??0))*Math.max(0,Math.min(1,(tick-leg.from)/(leg.to-leg.from)));
  const paths=new Map();
  function cargo(w,progress){
    const run=current(w),leg=run?.leg;
    if(!leg||!['inbound','outbound'].includes(run.stage))return null;
    const key=`${run.stage}:${w.supply.depot}:${leg.person%5}`;
    if(!paths.has(key)){
      const points=route(w,run);
      const segments=points.slice(1).flatMap((to,i)=>TownMap.route({...points[i],resident:{id:leg.person}},to));
      paths.set(key,TownMap.plan(segments));
    }
    const path=paths.get(key);
    const f=fraction(leg,w.tick+progress);
    const [x,y]=TownMap.position(path,f);
    return {person:leg.person,x,y,kind:run.stage==='inbound'?'flour':'bread'};
  }
  function assignment(w,p,routine){
    const run=current(w),leg=run?.leg;
    if(leg?.person!==p.id||w.tick>leg.to)return routine;
    if(w.tick===leg.to)return {place:run.stage==='outbound'?'market':'bakery',activity:'work'};
    return run.stage==='baking'?{place:'bakery',activity:'breadBake'}:
      {place:run.stage==='inbound'?'station':'bakery',activity:'breadCart'};
  }
  function valid(w){
    if(w.supply==null)return true;
    const s=w.supply,r=s.run;
    const int=n=>Number.isSafeInteger(n)&&n>=0;
    const resident=id=>w.people.some(p=>p.id===id);
    return int(s.coins)&&Object.hasOwn(depots,s.depot)&&(s.nextDepot===null||s.nextDepot==='station')&&
      (r===null?s.lastDay===-1:r&&int(s.lastDay)&&s.lastDay<=day(w)&&r.day===s.lastDay&&
        ['unload','inbound','oven-wait','baking','pickup','outbound','market','served','short'].includes(r.stage)&&
        [r.flour,r.bread,r.sold].every(int)&&(r.helper===null||resident(r.helper)&&int(r.helpEvent)&&r.helpEvent>0&&r.helpEvent<=w.sequence)&&
        (['inbound','outbound','baking'].includes(r.stage)?
          r.leg&&resident(r.leg.person)&&int(r.leg.from)&&int(r.leg.to)&&r.leg.to>r.leg.from&&(r.leg.offset==null||Number.isFinite(r.leg.offset)&&r.leg.offset>=0&&r.leg.offset<=1):!r.leg));
  }
  const pendingHelp=(w,root)=>{
    const run=current(w);
    return run?.helpEvent===root&&['unload','inbound','oven-wait'].includes(run.stage);
  };
  return {pendingHelp,demand,arrival,close,initialCoins,depots,dayStart,current,stage,step,helper,assist,build,cargo,assignment,valid};
})();
