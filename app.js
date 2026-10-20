const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { series: 4, parallel: 4, bypass: true, model: 'single', language: 'en', irradiance: Array(16).fill(1000), selected: null, points: [], temps: [] };
const defaults = { voc: 49.8, isc: 13.9, vmp: 41.7, imp: 13.2, gamma: -0.35, ratedTemp: 65 };
const controls = Object.fromEntries(Object.keys(defaults).map(k => [k, $('#' + k)]));
const tr = (zh,en) => state.language === 'zh' ? zh : en;
const modelContent = {
  single:{zh:'单二极管五参数模型',en:'Single-Diode Five-Parameter Model',labelZh:'单二极管等效方程',labelEn:'Single-diode equivalent equation',formula:'I = I<sub>ph</sub> − I<sub>0</sub>{exp[(U + IR<sub>s</sub>)/(nV<sub>t</sub>)] − 1}<wbr> − (U + IR<sub>s</sub>)/R<sub>sh</sub>'},
  double:{zh:'双二极管模型',en:'Double-Diode Model',labelZh:'双二极管等效方程',labelEn:'Double-diode equivalent equation',formula:'I = I<sub>ph</sub> − I<sub>01</sub>(e<sup>x₁</sup> − 1)<wbr> − I<sub>02</sub>(e<sup>x₂</sup> − 1)<wbr> − (U + IR<sub>s</sub>)/R<sub>sh</sub>'},
  engineering:{zh:'工程指数模型',en:'Engineering Exponential Model',labelZh:'工程指数近似方程',labelEn:'Engineering exponential approximation',formula:'I(U) = I<sub>sc</sub>[1 − (U/U<sub>oc</sub>)<sup>κ</sup>],<wbr> &nbsp; κ = ln(1 − I<sub>mp</sub>/I<sub>sc</sub>)<wbr>/ln(V<sub>mp</sub>/V<sub>oc</sub>)'}
};

function updateModelFormula(){
  const m=modelContent[state.model];
  $('#formulaLabelOne').textContent=state.language==='zh'?m.labelZh:m.labelEn;$('#formulaOne').innerHTML=m.formula;
  $('#formulaLabelTwo').textContent=tr('阵列输出功率','PV array output power');
}

function updateLanguage(){
  document.documentElement.lang=state.language==='zh'?'zh-CN':'en';document.body.classList.toggle('lang-en',state.language==='en');
  document.title=tr('PV·LAB · 看见阴影如何改变光伏阵列特性','PV·LAB · See How Shading Changes PV Array Characteristics');
  const set=(s,zh,en)=>{const el=$(s);if(el)el.textContent=tr(zh,en)};
  $('.brand').setAttribute('aria-label',tr('回到顶部','Back to top'));$('.method').setAttribute('aria-label',tr('光伏模块模型与方程','PV module model and equations'));$('#modelSelect').setAttribute('aria-label',tr('光伏模块等效数学模型','PV module equivalent mathematical model'));$('#controlPanel').setAttribute('aria-label',tr('光伏阵列参数配置','PV array parameter configuration'));
  set('#topbarTagline','看见阴影如何改变光伏阵列特性','See How Shading Changes PV Array Characteristics');set('#modelHeading','光伏模块等效模型','PV Module Equivalent Model');set('#parameterHeading','参数配置','Parameter Configuration');set('#electricalHeading','每个光伏模块的电气参数','Electrical Parameters of Each PV Module');
  const opts=$$('#modelSelect option');Object.values(modelContent).forEach((m,i)=>opts[i].textContent=state.language==='zh'?m.zh:m.en);
  const fieldLabels=$$('.topology-fields label>span');if(fieldLabels[0])fieldLabels[0].textContent=tr('每串模块数','Modules per String');if(fieldLabels[1])fieldLabels[1].textContent=tr('并联支路数','Parallel Strings');
  const legends=$$('fieldset legend');if(legends[0])legends[0].textContent=tr('阵列拓扑','Array Topology');
  $('.bypass-switch b').textContent=tr('旁路二极管','Bypass Diodes');
  const sections=$$('.parameter-section h4');if(sections[1])sections[1].textContent=tr('热特性参数','Thermal Parameters');if(sections[2])sections[2].textContent=tr('快速辐照度场景','Irradiance Presets');
  const paramLabels=$$('.parameter b');const pz=['开路电压 V<sub>oc</sub>','短路电流 I<sub>sc</sub>','MPP 电压 V<sub>mp</sub>','MPP 电流 I<sub>mp</sub>','P<sub>max</sub> 温度系数','额定工作温度'];const pe=['Open-circuit Voltage V<sub>oc</sub>','Short-circuit Current I<sub>sc</sub>','MPP Voltage V<sub>mp</sub>','MPP Current I<sub>mp</sub>','P<sub>max</sub> Temperature Coefficient','Rated Operating Temperature'];paramLabels.forEach((el,i)=>el.innerHTML=state.language==='zh'?pz[i]:pe[i]);
  const metricLabels=$$('.metrics article>span');const mz=['阵列结构','全局最大功率','MPP 电压 / 电流','最高模块温度','阵列状态'],me=['Array Topology','Global Maximum Power','MPP Voltage / Current','Highest Module Temperature','Array Status'];metricLabels.forEach((el,i)=>el.textContent=state.language==='zh'?mz[i]:me[i]);
  set('#chartATitle','辐照度与阵列拓扑','Irradiance & Array Topology');set('#chartBTitle','P–U 功率特性','P–U Power Characteristic');set('#chartCTitle','光伏模块实际温度','Actual PV Module Temperature');set('#chartDTitle','I–U 电流特性','I–U Current Characteristic');set('#averageLabel','平均辐照度 (AVG)','AVERAGE IRRADIANCE (AVG)');
  $('#chartBLegend').innerHTML='<i class="power-line"></i>'+tr('光伏阵列P-U特性曲线','PV Array P–U Characteristic');$('#chartDLegend').innerHTML='<i class="current-line"></i>'+tr('光伏阵列I-U特性曲线','PV Array I–U Characteristic');$('#ambientLegend').innerHTML='<i class="ambient-line"></i>25 °C '+tr('环境温度','Ambient Temperature');$('#ratedLegend').innerHTML='<i class="rated-line"></i><b id="ratedLabel">'+params().ratedTemp+' °C</b> '+tr('额定温度','Rated Temperature');
  $('.parameter-note').textContent=tr('环境温度固定为 25 °C，所有PV模块共用该环境温度参数。','Ambient temperature is fixed at 25 °C; all PV modules share this ambient-temperature parameter.');$('#resetParams').innerHTML='<span aria-hidden="true">↺</span><span>'+tr('恢复默认模块参数','Restore Default Module Parameters')+'</span>';$('#downloadData').textContent=tr('↓ 下载运行数据 CSV','↓ Download Run Data CSV');
  const presetText=state.language==='zh'?['均匀','行阴影','对角阴影','随机云影']:['Uniform','Row Shade','Diagonal Shade','Random Cloud'];$$('[data-preset]').forEach((b,i)=>b.textContent=presetText[i]);
  $('footer span').textContent=tr('基于光伏模块连续 I–U 模型与稳态热特性估算','Continuous PV module I–U models with steady-state thermal estimation');
  $('#languageToggle').innerHTML=state.language==='zh'?'<strong>中</strong><i></i><span>EN</span>':'<strong>EN</strong><i></i><span>中</span>';$('#languageToggle').setAttribute('aria-label',tr('Switch to English','切换到中文'));
  updateModelFormula();render();
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function activeIndices() { const out=[]; for(let p=0;p<state.parallel;p++) for(let s=0;s<state.series;s++) out.push(p*4+s); return out; }
function params(){ const p={}; for(const k in controls) p[k]=Number(controls[k].value)||defaults[k]; p.vmp=Math.min(p.vmp,p.voc*.96); p.imp=Math.min(p.imp,p.isc*.99); return p; }
function enforceElectricalBounds(){
  const voc=clamp(Number(controls.voc.value)||defaults.voc,10,80),isc=clamp(Number(controls.isc.value)||defaults.isc,1,30);
  controls.vmp.max=String(voc);controls.imp.max=String(isc);
  if(Number(controls.vmp.value)>voc)controls.vmp.value=String(voc);
  if(Number(controls.imp.value)>isc)controls.imp.value=String(isc);
}

function moduleTemperature(g, stringAvg, bypassed, p){
  const normalRise = 20 * Math.pow(g/1000,.82);
  const mismatch = Math.max(0, stringAvg-g)/1000;
  const reverseHeating = state.bypass ? (bypassed ? 4 + 7*mismatch : 8*mismatch) : 80*Math.pow(mismatch,1.12);
  return 25 + normalRise + reverseHeating;
}

function moduleVoltageAtCurrent(current, irradiance, p, bypassEnabled){
  const g = Math.max(.02, irradiance / 1000);
  const isc = p.isc * g;
  const imp = Math.min(p.imp * g, isc * .985);
  const voc = p.voc * (.90 + .10 * g);
  const vmp = Math.min(p.vmp * (.94 + .06 * g), voc * .96);
  if(current <= isc){
    const baseShape = Math.log(Math.max(.001, 1 - imp / isc)) / Math.log(clamp(vmp / voc, .05, .98));
    const shape = state.model === 'double' ? baseShape * .9 : state.model === 'engineering' ? baseShape * 1.12 : baseShape;
    return voc * Math.pow(Math.max(0, 1 - current / isc), 1 / shape);
  }
  const over = (current - isc) / Math.max(p.isc, .001);
  return bypassEnabled ? -.52 * (1 - Math.exp(-over * 35)) : -p.voc * .42 * Math.pow(over, .72);
}

function stringVoltageAtCurrent(current, branch, p){
  let voltage = 0;
  for(let s=0;s<state.series;s++) voltage += moduleVoltageAtCurrent(current, state.irradiance[branch*4+s], p, state.bypass);
  return voltage;
}

function derive(){
  const p=params(), temps=Array(16).fill(null), bypassed=new Set();
  for(let branch=0;branch<state.parallel;branch++){
    const ids=Array.from({length:state.series},(_,s)=>branch*4+s);
    const avg=ids.reduce((a,i)=>a+state.irradiance[i],0)/ids.length;
    const max=Math.max(...ids.map(i=>state.irradiance[i]));
    ids.forEach(i=>{ if(state.bypass && state.irradiance[i] < Math.max(350,max*.62)) bypassed.add(i); });
    ids.forEach(i=>temps[i]=moduleTemperature(state.irradiance[i],avg,bypassed.has(i),p));
  }
  state.temps=temps;
  const active=activeIndices(), arrayAvg=active.reduce((sum,i)=>sum+state.irradiance[i],0)/active.length/1000;
  const vmax=p.voc*state.series*(.9+.1*arrayAvg)*1.01, n=360, points=[];
  for(let j=0;j<=n;j++){
    const v=vmax*j/n; let totalI=0;
    if(!state.bypass){
      const effectiveIsc=Array.from({length:state.parallel},(_,branch)=>{
        const gs=Array.from({length:state.series},(_,s)=>state.irradiance[branch*4+s]/1000);
        return p.isc*Math.min(...gs);
      }).reduce((a,b)=>a+b,0);
      const modelFactor=state.model==='double'?.92:state.model==='engineering'?1.1:1;
      const shape=Math.max(2,(Math.log(Math.max(.001,1-p.imp/p.isc))/Math.log(clamp(p.vmp/p.voc,.05,.98)))*modelFactor);
      totalI=effectiveIsc*Math.max(0,1-Math.pow(v/Math.max(vmax/1.01,.001),shape));
    }else{
      for(let branch=0;branch<state.parallel;branch++){
        let lo=0, hi=p.isc*1.22;
        if(stringVoltageAtCurrent(0,branch,p)<v){ hi=0; }
        else for(let iter=0;iter<42;iter++){
          const mid=(lo+hi)/2;
          if(stringVoltageAtCurrent(mid,branch,p)>v) lo=mid; else hi=mid;
        }
        totalI+=(lo+hi)/2;
      }
    }
    points.push({v,i:totalI,p:v*totalI});
  }
  state.points=points; return {p,bypassed};
}

function moduleColor(g){ const t=clamp((g-100)/1100,0,1); return `hsl(${155-40*(1-t)} ${30+35*t}% ${30+12*t}%)`; }
function tempColor(t,p){ if(t>p.ratedTemp)return '#d8473f'; if(t>p.ratedTemp-10)return '#ef6c35'; return '#069ca0'; }

const SVG_NS='http://www.w3.org/2000/svg';
function svgNode(name,attrs={},text=''){
  const node=document.createElementNS(SVG_NS,name);
  Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
  if(text)node.textContent=text;
  return node;
}

function renderArray(info){
  const svg=$('#arraySvg'); svg.replaceChildren();
  const xs=[100,260,420,580],ys=[82,194,306,418],topY=28,bottomY=472,moduleW=108,moduleH=72,bypassOffset=70;
  const busEnd=660;
  svg.append(svgNode('line',{x1:xs[0],y1:topY,x2:busEnd,y2:topY,class:'svg-bus'}));
  svg.append(svgNode('line',{x1:xs[0],y1:bottomY,x2:busEnd,y2:bottomY,class:'svg-bus'}));
  [['+',topY],['−',bottomY]].forEach(([label,y])=>{
    svg.append(svgNode('circle',{cx:busEnd,cy:y,r:16,class:'svg-terminal'}));
    svg.append(svgNode('text',{x:busEnd,y:Number(y)+6,class:'svg-terminal-label'},label));
  });
  for(let branch=0;branch<4;branch++){
    const x=xs[branch],stringActive=branch<state.parallel;
    svg.append(svgNode('line',{x1:x,y1:topY,x2:x,y2:bottomY,class:'svg-string-wire'+(stringActive?'':' inactive')}));
    for(let s=0;s<4;s++){
      const i=branch*4+s, active=branch<state.parallel&&s<state.series, g=state.irradiance[i], t=state.temps[i];
      const y=ys[s],bypassed=active&&info.bypassed.has(i),hot=active&&t>info.p.ratedTemp;
      const group=svgNode('g',{class:'svg-module'+(active?'':' inactive')+(hot?' hot':''),'data-module-index':i,role:'button',tabindex:active?'0':'-1','aria-label':tr(`支路 ${branch+1} 模块 ${s+1}，${g} W/m²`,`String ${branch+1}, module ${s+1}, ${g} W/m²`)});
      const diodeX=x+bypassOffset,diodeColor=!state.bypass?'#9aa59f':bypassed?'#ef6c35':'#0e6b56';
      if(active){
        group.append(svgNode('path',{d:`M ${x} ${y-moduleH/2} H ${diodeX} V ${y+moduleH/2} H ${x}`,class:'svg-bypass-path',stroke:diodeColor}));
        group.append(svgNode('polygon',{points:`${diodeX-9},${y+9} ${diodeX+9},${y+9} ${diodeX},${y-7}`,class:'svg-diode-triangle',fill:diodeColor}));
        group.append(svgNode('line',{x1:diodeX-10,y1:y-12,x2:diodeX+10,y2:y-12,class:'svg-diode-bar',stroke:diodeColor}));
      }
      const face=svgNode('rect',{x:x-moduleW/2,y:y-moduleH/2,width:moduleW,height:moduleH,rx:4,class:'svg-module-face'});
      group.append(face);
      const pad=7,gap=3,cellW=(moduleW-pad*2-gap*2)/3,cellH=(moduleH-pad*2-gap*2)/3;
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)group.append(svgNode('rect',{x:x-moduleW/2+pad+col*(cellW+gap),y:y-moduleH/2+pad+row*(cellH+gap),width:cellW,height:cellH,rx:1,class:'svg-cell',fill:active?moduleColor(g):'#6e7a75'}));
      if(active){
        const pillX=x-moduleW/2-42,pillY=y-moduleH/2-12;
        group.append(svgNode('rect',{x:pillX,y:pillY,width:52,height:26,rx:13,class:'svg-temp-pill',fill:tempColor(t||25,info.p)}));
        group.append(svgNode('text',{x:pillX+26,y:pillY+18,class:'svg-temp-label'},`${Math.round(t)}°C`));
        const activate=()=>openEditor(i,face);
        group.addEventListener('click',activate);
        group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
      }
      svg.append(group);
    }
  }
  const ids=activeIndices(); $('#avgIrradiance').textContent=Math.round(ids.reduce((a,i)=>a+state.irradiance[i],0)/ids.length);
  const editor=$('#irradianceEditor');
  if(state.selected!==null&&!editor.hidden)requestAnimationFrame(()=>{const face=svg.querySelector(`[data-module-index="${state.selected}"] .svg-module-face`);if(face)positionEditor(face);});
}

function niceMax(v){ const pow=Math.pow(10,Math.floor(Math.log10(Math.max(v,1)))); return Math.ceil(v/pow/2)*2*pow; }
function drawLineChart(canvas, data, yKey, color, yLabel, tooltip){
  const dpr=devicePixelRatio||1, rect=canvas.getBoundingClientRect(); canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
  const c=canvas.getContext('2d'); c.scale(dpr,dpr); const w=rect.width,h=rect.height,m={l:48,r:18,t:12,b:34},pw=w-m.l-m.r,ph=h-m.t-m.b;
  const xmax=Math.max(...data.map(d=>d.v)), ymax=niceMax(Math.max(...data.map(d=>d[yKey]))*1.03);
  c.font='10px "Times New Roman", "Microsoft YaHei", serif'; c.lineWidth=1;
  for(let k=0;k<=4;k++){const y=m.t+ph*k/4;c.strokeStyle='#e4e7df';c.beginPath();c.moveTo(m.l,y);c.lineTo(w-m.r,y);c.stroke();c.fillStyle='#7b8883';c.textAlign='right';c.fillText((ymax*(1-k/4)).toFixed(ymax<100?0:0),m.l-7,y+3)}
  for(let k=0;k<=5;k++){const x=m.l+pw*k/5;c.strokeStyle='#edf0e9';c.beginPath();c.moveTo(x,m.t);c.lineTo(x,h-m.b);c.stroke();c.fillStyle='#7b8883';c.textAlign='center';c.fillText((xmax*k/5).toFixed(0),x,h-m.b+16)}
  c.font='600 14px "Times New Roman", "Microsoft YaHei", serif';c.fillStyle='#52645e';c.textAlign='center';c.fillText(tr('PV阵列电压 U (V)','PV Array Voltage U (V)'),m.l+pw/2,h-4);c.save();c.translate(14,m.t+ph/2);c.rotate(-Math.PI/2);c.fillText(yLabel,0,0);c.restore();
  c.beginPath(); data.forEach((d,i)=>{const x=m.l+d.v/xmax*pw,y=m.t+(1-d[yKey]/ymax)*ph;i?c.lineTo(x,y):c.moveTo(x,y)}); c.strokeStyle=color;c.lineWidth=2.5;c.stroke();
  let best=data.reduce((a,d)=>d.p>a.p?d:a,data[0]);
  const bestY=yKey==='p'?best.p:best.i, gx=m.l+best.v/xmax*pw, gy=m.t+(1-bestY/ymax)*ph;
  c.fillStyle=color;c.beginPath();c.arc(gx,gy,4.5,0,Math.PI*2);c.fill();
  const label=yKey==='p'?`GMPP ${best.v.toFixed(1)} V / ${best.p.toFixed(0)} W`:`GMPP ${best.v.toFixed(1)} V / ${best.i.toFixed(1)} A`;
  c.font='700 14px "Times New Roman", "Microsoft YaHei", serif'; const labelW=c.measureText(label).width+14;
  const lx=clamp(gx+8,m.l,w-m.r-labelW),ly=clamp(gy-27,m.t,h-m.b-22);c.fillStyle='rgba(255,253,247,.94)';c.strokeStyle=color;c.lineWidth=1;c.fillRect(lx,ly,labelW,21);c.strokeRect(lx,ly,labelW,21);c.fillStyle='#0d2927';c.textAlign='left';c.fillText(label,lx+7,ly+15);
  canvas.onmousemove=e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,idx=clamp(Math.round((x-m.l)/pw*(data.length-1)),0,data.length-1),d=data[idx];tooltip.style.display='block';tooltip.style.left=clamp(x+10,5,w-105)+'px';tooltip.style.top=clamp(e.clientY-r.top-45,5,h-45)+'px';tooltip.innerHTML=`U ${d.v.toFixed(1)} V<br>${yKey==='p'?'P '+d.p.toFixed(0)+' W':'I '+d.i.toFixed(2)+' A'}`}; canvas.onmouseleave=()=>tooltip.style.display='none';
}

function drawTemps(canvas,p){
  const ids=Array.from({length:16},(_,i)=>i), activeSet=new Set(activeIndices()), vals=ids.map(i=>activeSet.has(i)?state.temps[i]:0); const dpr=devicePixelRatio||1,r=canvas.getBoundingClientRect();canvas.width=r.width*dpr;canvas.height=r.height*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);
  const w=r.width,h=r.height,m={l:44,r:16,t:12,b:38},pw=w-m.l-m.r,ph=h-m.t-m.b,ymax=Math.max(80,niceMax(Math.max(...vals,p.ratedTemp)+6));
  for(let k=0;k<=4;k++){const y=m.t+ph*k/4;c.strokeStyle='#e4e7df';c.beginPath();c.moveTo(m.l,y);c.lineTo(w-m.r,y);c.stroke();c.fillStyle='#7b8883';c.font='10px "Times New Roman", "Microsoft YaHei", serif';c.textAlign='right';c.fillText((ymax*(1-k/4)).toFixed(0),m.l-7,y+3)}
  const ay=m.t+(1-25/ymax)*ph;c.setLineDash([5,4]);c.strokeStyle='#00a6a6';c.beginPath();c.moveTo(m.l,ay);c.lineTo(w-m.r,ay);c.stroke();c.setLineDash([]);
  const ry=m.t+(1-p.ratedTemp/ymax)*ph;c.setLineDash([5,4]);c.strokeStyle='#d8473f';c.beginPath();c.moveTo(m.l,ry);c.lineTo(w-m.r,ry);c.stroke();c.setLineDash([]);
  const step=pw/ids.length,bw=Math.max(8,step*.56);ids.forEach((id,k)=>{const value=activeSet.has(id)?state.temps[id]:0,x=m.l+step*k+(step-bw)/2,y=m.t+(1-value/ymax)*ph;c.fillStyle=activeSet.has(id)?tempColor(value,p):'#d8ddd3';c.fillRect(x,y,bw,m.t+ph-y);c.fillStyle='#65756f';c.font='10px "Times New Roman", "Microsoft YaHei", serif';c.textAlign='center';c.fillText(`PV${id+1}`,x+bw/2,h-m.b+14)});c.fillStyle='#52645e';c.save();c.translate(14,m.t+ph/2);c.rotate(-Math.PI/2);c.font='600 14px "Times New Roman", "Microsoft YaHei", serif';c.textAlign='center';c.fillText(tr('模块温度 (°C)','Module Temperature (°C)'),0,0);c.restore();
  canvas.onmousemove=e=>{const rr=canvas.getBoundingClientRect(),x=e.clientX-rr.left,k=clamp(Math.floor((x-m.l)/step),0,ids.length-1),id=ids[k],value=activeSet.has(id)?state.temps[id]:0,tip=$('#tempTooltip');tip.style.display='block';tip.style.left=clamp(x+10,5,w-110)+'px';tip.style.top=clamp(e.clientY-rr.top-42,5,h-45)+'px';tip.innerHTML=`PV${id+1}<br>${value.toFixed(1)} °C`};canvas.onmouseleave=()=>$('#tempTooltip').style.display='none';
}

function render(){
  const info=derive(), ids=activeIndices(), best=state.points.reduce((a,d)=>d.p>a.p?d:a,state.points[0]), maxT=Math.max(...ids.map(i=>state.temps[i]));
  renderArray(info); $('#metricTopology').textContent=`${state.series}S × ${state.parallel}P`;$('#metricPower').textContent=`${best.p.toFixed(0)} W`;$('#metricMpp').textContent=`${best.v.toFixed(1)} V / ${best.i.toFixed(1)} A`;$('#metricTemp').textContent=`${maxT.toFixed(1)} °C`;$('#ratedLabel').textContent=`${info.p.ratedTemp} °C`;
  const status=$('#metricStatus'); if(maxT>info.p.ratedTemp){const n=ids.filter(i=>state.temps[i]>info.p.ratedTemp).length;status.textContent=tr(`热斑风险 · ${n} 块超温`,`Hot-spot risk · ${n} overheated`);status.className='warning'}else if(info.bypassed.size){status.textContent=tr(`${info.bypassed.size} 个旁路二极管导通`,`${info.bypassed.size} bypass diodes conducting`);status.className='safe'}else{status.textContent=tr('运行正常','Normal operation');status.className='safe'}
  drawLineChart($('#puChart'),state.points,'p','#ef6c35',tr('PV阵列功率 P (W)','PV Array Power P (W)') ,$('#puTooltip'));drawLineChart($('#iuChart'),state.points,'i','#6657d9',tr('PV阵列电流 I (A)','PV Array Current I (A)') ,$('#iuTooltip'));drawTemps($('#tempChart'),info.p);
}

function downloadCsv(){
  const info=derive(), activeSet=new Set(activeIndices());
  const rows=[
    ['PV Array Curve Studio'],
    ['Exported At',new Date().toISOString()],
    ['Equivalent Model',modelContent[state.model].en],
    ['Modules per String',state.series],
    ['Parallel Strings',state.parallel],
    ['Bypass Diodes',state.bypass?'Enabled':'Disabled'],
    ['Open-circuit Voltage Voc (V)',info.p.voc],
    ['Short-circuit Current Isc (A)',info.p.isc],
    ['MPP Voltage Vmp (V)',info.p.vmp],
    ['MPP Current Imp (A)',info.p.imp],
    ['Pmax Temperature Coefficient (%/C)',info.p.gamma],
    ['Rated Operating Temperature (C)',info.p.ratedTemp],
    [],
    ['Curve Data'],
    ['PV Array Voltage (V)','PV Array Current (A)','PV Array Power (W)'],
    ...state.points.map(point=>[point.v.toFixed(4),point.i.toFixed(4),point.p.toFixed(4)]),
    [],
    ['PV Module Data'],
    ['PV Module','Active','Irradiance (W/m2)','Actual Temperature (C)','Bypass Diode Conducting'],
    ...Array.from({length:16},(_,index)=>[
      `PV${index+1}`,
      activeSet.has(index)?'Yes':'No',
      activeSet.has(index)?state.irradiance[index]:'',
      activeSet.has(index)&&Number.isFinite(state.temps[index])?state.temps[index].toFixed(2):0,
      activeSet.has(index)&&info.bypassed.has(index)?'Yes':'No'
    ])
  ];
  const csvValue=value=>{const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text};
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvValue).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='pv-array-curve-data.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
}

function positionEditor(moduleEl){const editor=$('#irradianceEditor'),card=$('.array-card'),mr=moduleEl.getBoundingClientRect(),cr=card.getBoundingClientRect(),half=Math.max(100,editor.offsetWidth/2);editor.style.left=`${clamp(mr.left+mr.width/2-cr.left,half+6,cr.width-half-6)}px`;editor.style.top=`${mr.top-cr.top-7}px`}
function openEditor(i,moduleEl){state.selected=i;const editor=$('#irradianceEditor');editor.hidden=false;positionEditor(moduleEl);$('#editorHint').textContent=tr('辐照度','Irradiance');$('#irradianceRange').value=$('#irradianceNumber').value=state.irradiance[i]}
function setSelected(v){if(state.selected===null)return;state.irradiance[state.selected]=clamp(Number(v)||100,100,1200);$('#irradianceRange').value=$('#irradianceNumber').value=state.irradiance[state.selected];$$('.preset-buttons button').forEach(b=>b.classList.remove('active'));render()}
$('#irradianceRange').addEventListener('input',e=>setSelected(e.target.value));$('#irradianceNumber').addEventListener('input',e=>setSelected(e.target.value));
document.addEventListener('pointerdown',e=>{const editor=$('#irradianceEditor');if(!editor.hidden&&!editor.contains(e.target)&&!e.target.closest('.svg-module'))editor.hidden=true});
$('#seriesCount').addEventListener('change',e=>{state.series=Number(e.target.value);state.selected=null;$('#irradianceEditor').hidden=true;render()});$('#parallelCount').addEventListener('change',e=>{state.parallel=Number(e.target.value);state.selected=null;$('#irradianceEditor').hidden=true;render()});
$('#bypassToggle').addEventListener('change',e=>{state.bypass=e.target.checked;render()});
Object.values(controls).forEach(el=>el.addEventListener('input',()=>{enforceElectricalBounds();render()}));$('#resetParams').addEventListener('click',()=>{for(const k in controls)controls[k].value=defaults[k];enforceElectricalBounds();render()});
$('#downloadData').addEventListener('click',downloadCsv);
const presets={uniform:()=>Array(16).fill(1000),row:()=>Array.from({length:16},(_,i)=>i%4===2?280:1000),diagonal:()=>Array.from({length:16},(_,i)=>i%4===Math.floor(i/4)?350:1000),random:()=>Array.from({length:16},()=>Math.round((250+Math.random()*750)/10)*10)};
function applyPreset(name){state.irradiance=presets[name]();$$('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));render()}
$$('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>applyPreset(btn.dataset.preset)));
$('#modelSelect').addEventListener('change',e=>{state.model=e.target.value;updateModelFormula();render()});
$('#languageToggle').addEventListener('click',()=>{state.language=state.language==='zh'?'en':'zh';updateLanguage()});
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(render,120)});enforceElectricalBounds();updateLanguage();

