'use strict';

// Pixel-style keepsake cards for the daily paper and achievements, drawn on a canvas and saved as PNG.
const TownCards=(()=>{
  const W=360,H=520,SCALE=2;
  function frame(ctx,accent){
    ctx.fillStyle='#2c4236';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fbf1d8';ctx.fillRect(12,12,W-24,H-24);
    // A stepped pixel border.
    ctx.fillStyle=accent;
    for(let x=12;x<W-12;x+=8){ctx.fillRect(x,12,4,4);ctx.fillRect(x+4,H-16,4,4);}
    for(let y=12;y<H-12;y+=8){ctx.fillRect(12,y+4,4,4);ctx.fillRect(W-16,y,4,4);}
    ctx.fillStyle='#2c4236';
    for(const [x,y] of [[12,12],[W-20,12],[12,H-20],[W-20,H-20]])ctx.fillRect(x,y,8,8);
  }
  function wrap(ctx,text,x,y,width,line,limit=99){
    let row='',rows=0;
    for(const ch of String(text)){
      // Closing punctuation stays on the line it ends instead of starting a new one.
      const hang='，。、”）！？：；,.!?)'.includes(ch);
      if(ch==='\n'||(!hang&&ctx.measureText(row+ch).width>width)){
        ctx.fillText(row,x,y);y+=line;rows++;row=ch==='\n'?'':ch;
        if(rows>=limit)return y;
      }else row+=ch;
    }
    if(row){ctx.fillText(row,x,y);y+=line;}
    return y;
  }
  function pixelIcon(ctx,x,y,size,color,glyph){
    ctx.fillStyle=color;
    const u=size/8;
    const shape=['00111100','01111110','11111111','11111111','11111111','11111111','01111110','00111100'];
    shape.forEach((row,j)=>[...row].forEach((bit,i)=>{if(bit==='1')ctx.fillRect(x+i*u,y+j*u,u,u);}));
    ctx.fillStyle='#fff6dc';ctx.font=`700 ${size*.5}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(glyph,x+size/2,y+size/2+1);
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
  }
  function canvas(){
    const c=document.createElement('canvas');c.width=W*SCALE;c.height=H*SCALE;
    const ctx=c.getContext('2d');ctx.scale(SCALE,SCALE);ctx.imageSmoothingEnabled=false;
    return {c,ctx};
  }
  const serif='"Songti SC","Noto Serif CJK SC",Georgia,serif',sans='"PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  function paper(p){
    const {c,ctx}=canvas();
    frame(ctx,'#b98a46');
    ctx.fillStyle='#2c4236';ctx.font=`700 30px ${serif}`;ctx.textAlign='center';
    ctx.fillText('微光镇日报',W/2,62);
    ctx.font=`13px ${sans}`;ctx.fillStyle='#6a5a3c';
    ctx.fillText(`第 ${p.day+1} 天 · ${p.weekday} · ${p.weather}${p.power?' · 停电':''}`,W/2,84);
    ctx.fillStyle='#2c4236';ctx.fillRect(32,94,W-64,3);ctx.fillRect(32,99,W-64,1);
    ctx.textAlign='left';
    let y=124;
    if(p.special){ctx.fillStyle='#a5452f';ctx.font=`700 13px ${sans}`;y=wrap(ctx,p.special,32,y,W-64,18,2)+4;}
    ctx.fillStyle='#22352c';ctx.font=`700 20px ${serif}`;y=wrap(ctx,p.headline.title,32,y,W-64,26,3);
    ctx.font=`14px ${sans}`;ctx.fillStyle='#3e4a3a';y=wrap(ctx,p.headline.text,32,y+2,W-64,20,4)+6;
    for(const section of p.sections){
      if(y>H-70)break;
      ctx.fillStyle='#b98a46';ctx.fillRect(32,y-10,6,6);
      ctx.fillStyle='#7a5a2c';ctx.font=`700 12px ${sans}`;ctx.fillText(section.label,44,y-3);
      ctx.fillStyle='#3e4a3a';ctx.font=`12px ${sans}`;y=wrap(ctx,section.text,32,y+14,W-64,17,3)+8;
    }
    ctx.fillStyle='#8a7a5a';ctx.font=`11px ${sans}`;ctx.textAlign='center';
    ctx.fillText('⚄ 上帝扔骰子 · 微光镇',W/2,H-30);
    return c;
  }
  function badge(a,day,town){
    const {c,ctx}=canvas();
    frame(ctx,a.color);
    ctx.fillStyle='#6a5a3c';ctx.font=`13px ${sans}`;ctx.textAlign='center';
    ctx.fillText(a.rare?'★ 稀有纪念卡 ★':'纪念卡',W/2,56);
    pixelIcon(ctx,W/2-64,80,128,a.color,a.icon);
    ctx.textAlign='center';ctx.fillStyle='#22352c';ctx.font=`700 28px ${serif}`;ctx.fillText(a.name,W/2,262);
    ctx.font=`14px ${sans}`;ctx.fillStyle='#3e4a3a';ctx.textAlign='left';
    let y=wrap(ctx,a.text,48,300,W-96,22,3);
    if(town){ctx.fillStyle='#6a5a3c';ctx.font=`12px ${sans}`;y=wrap(ctx,town,48,y+10,W-96,18,6);}
    ctx.textAlign='center';ctx.fillStyle='#8a7a5a';ctx.font=`12px ${sans}`;
    ctx.fillText(`微光镇 · 第 ${day+1} 天解锁`,W/2,H-48);
    ctx.font=`11px ${sans}`;ctx.fillText('⚄ 上帝扔骰子',W/2,H-30);
    return c;
  }
  function download(c,name){
    c.toBlob(blob=>{
      if(!blob)return;
      const link=document.createElement('a');
      link.href=URL.createObjectURL(blob);link.download=name;link.click();
      setTimeout(()=>URL.revokeObjectURL(link.href),1000);
    },'image/png');
  }
  return {paper,badge,download,pixelIcon};
})();
