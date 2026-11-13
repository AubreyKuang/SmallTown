'use strict';

const TownMusic=(()=>{
  // Eight measures in C major. Each note is [beat, MIDI pitch, duration in beats].
  const melody=[
    [[.5,76,1],[2,79,.75],[3,81,.9]],
    [[.5,79,1.3],[2.5,76,.7],[3.5,74,.7]],
    [[0,72,1.25],[1.75,76,.65],[2.75,79,1.1]],
    [[1,77,.8],[2.5,74,1.1]],
    [[.5,76,.8],[1.5,81,1.2],[3,84,.9]],
    [[.5,83,1.2],[2,79,1],[3.5,76,.8]],
    [[.5,77,1],[2,76,.9],[3,74,.8]],
    [[0,72,1.7],[2.75,67,.8]]
  ];
  const harmony=[
    [48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,57],
    [45,52,55,60],[40,47,55,59],[41,48,53,57],[48,55,62,64]
  ];
  const beat=60/72, measure=4*beat;
  const frequency=midi=>440*2**((midi-69)/12);
  const voices={
    wood:{partials:[[1,1],[2,.18],[3,.045]],attack:.026,release:.44},
    keys:{partials:[[1,1],[2,.12],[3,.05]],attack:.075,release:.75},
    pad:{partials:[[1,1],[2,.08]],attack:.32,release:.95}
  };
  function create(){
    let context=null,master=null,timer=null,enabled=false,hidden=false,night=false;
    let next=0,bar=0;
    const live=new Set();
    function tone(at,pitch,length,volume,voice){
      const {partials,attack,release}=voices[voice];
      for(const [harmonic,weight] of partials){
        const osc=context.createOscillator(),amp=context.createGain();
        osc.frequency.value=frequency(pitch)*harmonic;
        const hold=at+Math.max(attack+.02,length*(harmonic===1?.65:.3));
        const end=hold+release;
        amp.gain.setValueAtTime(.0001,at);
        amp.gain.exponentialRampToValueAtTime(volume*weight,at+attack);
        amp.gain.exponentialRampToValueAtTime(volume*weight*.28,hold);
        amp.gain.exponentialRampToValueAtTime(.0001,end);
        osc.connect(amp).connect(master);
        live.add(osc);
        osc.onended=()=>{live.delete(osc);osc.disconnect();amp.disconnect();};
        osc.start(at);osc.stop(end+.02);
      }
    }
    function schedule(){
      if(!enabled||hidden||context?.state!=='running')return;
      if(next<context.currentTime)next=context.currentTime+.05;
      while(next<context.currentTime+.2){
        const index=bar%melody.length;
        const chord=harmony[index];
        tone(next,chord[0],2.2*beat,night?.078:.105,'pad');
        tone(next+.16,chord[2],2.6*beat,night?.05:.063,'pad');
        tone(next+1.5*beat,chord[1]+12,1.2*beat,.09,'keys');
        if(!night)tone(next+2.7*beat,chord[3],beat,.076,'keys');
        for(const [offset,pitch,length] of night?melody[index].slice(0,1):melody[index]){
          tone(next+offset*beat,night?pitch-12:pitch,length*beat,night?.125:.19,night?'keys':'wood');
        }
        bar++;
        next+=measure;
      }
    }
    function sync(){
      if(!context)return;
      const playing=enabled&&!hidden&&context.state==='running';
      if(playing&&timer!==null)return;
      if(!playing&&timer===null)return;
      const at=context.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(playing?.23:0,at,.055);
      if(playing){
        next=at+.075;
        schedule();
        timer=setInterval(schedule,80);
      }else{
        clearInterval(timer);timer=null;
        for(const osc of live)osc.stop(at+.24);
        live.clear();
      }
    }
    async function toggle(){
      if(enabled){enabled=false;sync();return false;}
      try{
        if(!context){
          context=new AudioContext();
          master=context.createGain();master.gain.value=0;
          master.connect(context.destination);
          context.addEventListener('statechange',sync);
        }
        if(context.state!=='running')await context.resume();
        enabled=context.state==='running';
        sync();
      }catch{enabled=false;sync();}
      return enabled;
    }
    return {
      toggle,
      setTime(tick){const halfHour=tick%48;night=halfHour<13||halfHour>=38;},
      setHidden(value){hidden=value;sync();}
    };
  }
  return {create};
})();
