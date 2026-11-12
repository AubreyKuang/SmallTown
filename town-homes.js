'use strict';

const TownHomes=(()=>{
  const buildings=[
    {x:76,y:133,w:91,base:209,edge:'#536d81',path:[[94,215],[93,288],[101,315]]},
    {x:176,y:132,w:99,base:208,edge:'#a76756',path:[[207,215],[207,284],[209,313]]},
    {x:108,y:211,w:87,base:275,edge:'#89565d',path:[[151,280],[149,314]]},
    {x:216,y:211,w:81,base:281,edge:'#7d6a84',path:[[260,285],[259,315]]}
  ];
  const house=id=>buildings[Math.floor((TownSchool.household(id)-1)/6)];
  const inside=(b,x,y)=>x>=b.x+1&&x<=b.x+b.w-1&&y>=b.y+12&&y<=b.base;
  const rooms=buildings.flatMap(building=>Array.from({length:6},(_,index)=>{
    const width=(building.w-10)/3;
    const left=building.x+5+(index%3)*width;
    const floor=building.base-(index<3?29:4);
    const x=left+width/2;
    return {left,width,floor,rest:[[x-3,floor-5],[x+2,floor-5]],sleep:[[left+6,floor-8]],
      read:[[left+width-6,floor-7]],food:[[x+4,floor-6],[x-1,floor-6]]};
  }));
  const room=id=>rooms[TownSchool.household(id)-1];
  const shared=new Map(TownSchool.roster.map(({id})=>{
    const {left,width,floor}=room(id);
    return [id,{bed:[[left+16,floor-14]],desk:[[left+width-7,floor-13]],rest:[[left+13,floor-12],[left+9,floor-13]]}];
  }));
  function stops(id,activity){
    if(shared.has(id)){
      const space=shared.get(id);
      return activity==='sleep'?space.bed:['read','homework'].includes(activity)?space.desk:space.rest;
    }
    const space=room(id);
    if(activity==='sleep')return space.sleep;
    if(activity==='read')return space.read;
    if(['breakfast','cook','lunch'].includes(activity))return space.food;
    return space.rest;
  }
  const contains=(id,x,y)=>inside(house(id),x,y);
  const hit=(x,y)=>buildings.some(building=>inside(building,x,y));
  function approach(id){
    const b=house(id);
    return [...b.path].reverse();
  }
  function draw(ctx,lit,{polygon,ellipse,line}){
    for(const [index,b] of buildings.entries()){
      const {x,y,w,base,edge}=b;
      const roofY=y+13;
      const box=(left,top,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(left,top,width,height);};
      ellipse(ctx,x+w*.54,base+1,w*.57,8,'#3e533743');
      polygon(ctx,[[x+w,roofY],[x+w+7,roofY-4],[x+w+7,base-5],[x+w,base]],edge);
      box(x,roofY,w,base-roofY,'#685548');
      box(x+3,roofY+2,w-6,base-roofY-5,lit?'#f7dba2':'#e6ccaa');
      const crown=[[[x-4,roofY],[x+w*.37,y-9],[x+w+4,roofY]],
        [[x-4,roofY],[x+14,y],[x+w-8,y],[x+w+4,roofY]],
        [[x-4,roofY],[x+10,y-2],[x+w-11,y-2],[x+w+4,roofY]],
        [[x-4,roofY],[x+w*.48,y-6],[x+w+4,roofY]]][index];
      polygon(ctx,crown,edge);
      line(ctx,[[x-2,roofY+1],[x+w+2,roofY+1]],'#f3dcb297',1.5);
      for(const [i,r] of rooms.slice(index*6,index*6+6).entries()){
        const {left,width,floor}=r;
        box(left,floor-20,width-1,20,['#ead7ad','#e4c4ad','#dce1b4'][(i+index)%3]);
        for(let plank=0;plank<3;plank++)box(left+1,floor-5+plank*2,width-2,1,'#b38e68');
        box(left+width-2,floor-21,1.8,21,'#98775c');
        box(left+1,floor-14,10,11,'#967051');
        box(left+2,floor-13,8,8,['#93a7b4','#c78478','#a4ab70'][index%3]);
        box(left+3,floor-13,6,3,'#f7eed0');
        if(TownSchool.roster.some(member=>member.family===index*6+i+1)){
          box(left+12,floor-19,8,5,'#9d8264');box(left+13,floor-18,6,3,'#dbc387');
        }
        const tx=left+width-10;
        box(tx,floor-12,8,8,'#a27856');
        box(tx-1,floor-13,10,2,'#c29a6d');
        if(i%3===0){
          box(tx+2,floor-16,4,4,'#f7d797');
          ellipse(ctx,tx+4,floor-16,2.7,1.3,'#fff0bc');
        }else if(i%3===1){
          box(tx+1,floor-15,5,2,'#70835e');
          box(tx+2,floor-16,4,1,'#eee1b7');
        }else{
          box(tx+2,floor-16,4,4,'#bc8460');
          ellipse(ctx,tx+4,floor-17,3,2,'#729060');
        }
        box(left+1,floor+1,width-2,1.8,'#796353');
      }
    }
  }
  return {stops,contains,hit,approach,draw};
})();
