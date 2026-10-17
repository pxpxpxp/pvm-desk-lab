import {models,sources,checked} from './data.mjs';
import {defaults,fit,combinedFit,filterModels,mmToIn,kgToLb,inToMm,lbToKg,cleanSaved} from './logic.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='pvm-desk-lab-v1';
let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
let state=cleanSaved(saved,models);
let filters={search:'',brand:'all',size:'all',rgb:'all',tvl:0,depth:0,mass:0,fits:false};
let view='browse', differences=false, sort='curated', toastTimer;
const selected=()=>state.selected.map(id=>models.find(m=>m.id===id)).filter(Boolean);
const len=n=>n===null?'Not verified':`${(state.unit==='in'?mmToIn(n):n).toFixed(state.unit==='in'?1:0)} ${state.unit}`;
const mass=n=>n===null?'Not verified':`${(state.unit==='in'?kgToLb(n):n).toFixed(1)} ${state.unit==='in'?'lb':'kg'}`;
const area=n=>state.unit==='in'?`${(n/645.16).toFixed(0)} in²`:`${(n/1000000).toFixed(3)} m²`;
function persist(){try{localStorage.setItem(key,JSON.stringify(state));}catch{toast('Browser storage is unavailable; changes remain for this visit.');}}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function go(next,{scroll=true}={}){
 if(!['browse','compare','desk','sources'].includes(next))next='browse';
 view=next;$$('.view').forEach(el=>el.hidden=el.id!==next);
 $$('.tabs a').forEach(el=>{const on=el.dataset.view===next;el.classList.toggle('active',on);on?el.setAttribute('aria-current','page'):el.removeAttribute('aria-current');});
 if(location.hash!==`#${next}`)history.replaceState(null,'',`#${next}`);
 if(scroll)$('.tabs').scrollIntoView({behavior:'smooth',block:'start'});
}
function mini(m){return `<div class="mini-crt ${m.brand==='Olympus'?'cream':''} ${m.nominal.value>=19?'big':''}" aria-hidden="true"><div class="mini-glass"><span class="bars"></span></div><div class="mini-controls"><i></i><i></i><i></i><i></i></div></div>`;}
function evidence(d,{conditional=false}={}){
 if(d.status==='unknown')return `<span class="provenance unknown-text"><i class="dot uncertain"></i> Not verified</span>`;
 if(d.status==='uncertain')return `<span class="provenance unknown-text" title="${esc(d.note)}"><i class="dot uncertain"></i> Uncertain</span>`;
 return `<button class="provenance" data-source="${esc(d.source)}"><i class="dot ${conditional?'uncertain':'verified'}"></i>${conditional?'Documented · conditional':'Verified · source ↗'}</button>`;
}
function cards(){
 let list=filterModels(models,filters,state.desk);
 if(sort==='depth')list.sort((a,b)=>(a.dim.value?.d??Infinity)-(b.dim.value?.d??Infinity));
 if(sort==='weight')list.sort((a,b)=>(a.mass.value??Infinity)-(b.mass.value??Infinity));
 if(sort==='tvl')list.sort((a,b)=>(b.tvlComparable?b.tvl.value:-1)-(a.tvlComparable?a.tvl.value:-1));
 $('#result-count').textContent=`${list.length} of ${models.length} monitors${filters.fits?' · within planner limits':''}`;
 $('#cards').innerHTML=list.length?list.map(m=>{
 const picked=state.selected.includes(m.id);const rgbOk=m.rgb==='builtin'||m.rgb==='adapter';
 return `<article class="card ${picked?'selected':''}"><div class="card-top"><span class="card-index">${String(models.indexOf(m)+1).padStart(2,'0')} / ${esc(m.brand.toUpperCase())}</span><span class="card-class">${m.nominal.value}″ CLASS${m.nominal.status==='uncertain'?' ?':''}</span>${mini(m)}<span class="schematic-label">SCHEMATIC</span></div><div class="card-body"><span class="card-brand">${esc(m.brand.toUpperCase())}</span><h3>${esc(m.name)}</h3><span class="tag">${esc(m.tag)}</span><div class="spec-row"><div><strong>${m.tvl.value!==null?`${m.tvl.value}${m.id==='h150'||m.id==='a130'?'+':''}`:'—'} <small>${m.tvl.value!==null?'TVL':''}</small></strong><small>${m.tvlComparable?'DOCUMENTED RATING':m.id==='2030'?'VTR INPUT ONLY':'RATING NOT VERIFIED'}</small></div><div><strong>${m.dim.value?len(m.dim.value.d):'—'}</strong><small>${m.dim.value?'CABINET DEPTH':'DEPTH NOT VERIFIED'}</small></div></div><div class="connection"><i class="dot ${rgbOk&&m.id!=='ike20'?'verified':'uncertain'}"></i><span>${esc(m.rgbText)}</span></div><div class="card-bottom"><button class="add-button" data-toggle="${m.id}" aria-pressed="${picked}" aria-label="${picked?'Remove':'Add'} ${esc(m.name)} ${picked?'from':'to'} comparison">${picked?'✓ Added':'+ Compare'}</button><button class="details-button" data-detail="${m.id}">Details ↗<span class="sr-only"></span></button></div></div></article>`;
 }).join(''):`<div class="empty"><h3>No monitors match these limits.</h3><p>Try a wider depth or weight limit, or include more connection types.</p><button class="outline" data-reset-filters>Reset filters</button></div>`;
}
function toggle(id){
 if(state.selected.includes(id))state.selected=state.selected.filter(x=>x!==id);
 else {if(state.selected.length>=4){toast('Your comparison holds four monitors. Remove one to add another.');return;}if(!models.some(m=>m.id===id))return;state.selected.push(id);}
 persist();render();
}
function dock(){
 const ms=selected();$('#compare-count').textContent=ms.length;$('#dock-count').textContent=ms.length;
 $('#dock-models').innerHTML=ms.length?ms.map(m=>`<span class="dock-chip">${esc(m.name)}<button data-toggle="${m.id}" aria-label="Remove ${esc(m.name)} from comparison">×</button></span>`).join(''):'<span class="small muted">Choose a monitor to start.</span>';
 $('#dock').hidden=false;
}
const rows=[
 {label:'Nominal screen class',value:m=>`${m.nominal.value}″ class`,data:m=>m.nominal,note:m=>m.nominal.note},
 {label:'Viewable picture diagonal',value:m=>m.viewable.value?`${m.viewable.value.toFixed(m.id==='2030'?1:0)}″`:'Not verified',data:m=>m.viewable,note:m=>m.viewable.note},
 {label:'RGB connection',value:m=>m.rgbText,data:m=>({status:'verified',source:m.sources[0]}),conditional:m=>['card','adapter'].includes(m.rgb),note:m=>m.id==='ike20'?'Verify exact R/RP variant and the seller’s rear connectors.':m.rgb==='card'?'Card must be installed and included.':m.rgb==='adapter'?'Requires the model-specific pinout and an SD RGB source.':''},
 {label:'Component / YPbPr',value:m=>m.component,data:m=>({status:m.id==='ike20'?'unknown':'verified',source:m.sources[0]}),conditional:m=>m.rgb==='card'},
 {label:'Composite / S-Video',value:m=>`Composite: yes · S-Video: ${m.svideo===null?'revision / variant unconfirmed':'yes'}`,data:m=>({status:'verified',source:m.sources[0]}),conditional:m=>m.svideo===null},
 {label:'Horizontal resolution',value:m=>m.tvlText,data:m=>m.tvl,note:m=>m.tvl.note},
 {label:'Tube / mask',value:m=>m.tube,data:m=>({status:m.id==='ike20'?'unknown':'verified',source:m.sources[0]})},
 {label:'Width × height × depth',value:m=>m.dim.value?`${len(m.dim.value.w)} × ${len(m.dim.value.h)} × ${len(m.dim.value.d)}`:'Not verified',data:m=>m.dim,note:m=>m.dim.note},
 {label:'Cabinet footprint (W × D)',value:m=>m.dim.value?area(m.dim.value.w*m.dim.value.d):'Not verified',derived:true},
 {label:'Approximate weight',value:m=>mass(m.mass.value),data:m=>m.mass,note:m=>m.mass.note},
 {label:'Required desk depth',value:m=>m.dim.value?len(m.dim.value.d+state.desk.cable+state.desk.front):'Not verified',derived:true,note:()=>`Cabinet + ${len(state.desk.cable)} rear allowance + ${len(state.desk.front)} front workspace.`},
 {label:'Within my planner limits?',value:m=>statusLabel(fit(m,state.desk).status),derived:true,note:()=> 'Per-monitor calculation, including width, depth, height and remaining load budget.'},
 {label:'Why consider it?',value:m=>m.verdict,assessment:true},
 {label:'Practical tradeoff',value:m=>m.tradeoff,assessment:true},
 {label:'Ask the seller',value:m=>m.check,assessment:true}
];
function statusLabel(status){return {fits:'Within entered limits',over:'Exceeds entered limits',unknown:'Cannot confirm fit',empty:'No models selected'}[status];}
function insights(ms){
 if(ms.length<2)return '';
 const dims=ms.filter(m=>m.dim.value);const weights=ms.filter(m=>m.mass.value!==null);
 const shallow=dims.slice().sort((a,b)=>a.dim.value.d-b.dim.value.d)[0];const light=weights.slice().sort((a,b)=>a.mass.value-b.mass.value)[0];
 const span=dims.length>1?Math.max(...dims.map(m=>m.dim.value.d))-Math.min(...dims.map(m=>m.dim.value.d)):0;
 const all=ms.every(m=>m.dim.value&&m.mass.value!==null);
 return `<div class="compare-insights"><div class="insight"><span>DEPTH SPREAD</span><p>${dims.length>1?`${len(span)} between the shallowest and deepest known cabinets.`:'More documented dimensions are needed.'}</p></div><div class="insight"><span>LIGHTEST DOCUMENTED</span><p>${light?`${esc(light.name)} · ${mass(light.mass.value)}`:'Mass is not verified.'}</p></div><div class="insight"><span>AT YOUR DESK</span><p>${ms.filter(m=>fit(m,state.desk).status==='fits').length} of ${ms.length} within entered limits.${all?'':' Unknowns remain unapproved.'} <button class="text-button" data-view="desk">View planner →</button></p></div></div>`;
}
function comparison(){
 const ms=selected();
 if(!ms.length){$('#comparison').innerHTML='<div class="empty"><h3>Your comparison is empty.</h3><p>Add up to four monitors from the library.</p><button class="outline" data-view="browse">Browse monitors →</button></div>';return;}
 const visible=rows.filter(row=>!differences||ms.length===1||new Set(ms.map(row.value)).size>1);
 $('#comparison').innerHTML=`${insights(ms)}<p class="small muted">Scroll the table horizontally on smaller screens. Sources are linked beneath each documented value; buying advice is labeled assessment.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Side-by-side monitor comparison"><table style="min-width:${165+ms.length*220}px"><thead><tr><th scope="col">${differences?'DIFFERENCES':'SPECIFICATION'}</th>${ms.map(m=>`<th scope="col" style="border-top:3px solid ${m.color}"><div class="table-model"><div><small>${esc(m.brand.toUpperCase())}</small><strong>${esc(m.name)}</strong><button class="text-button" data-detail="${m.id}">Full profile ↗</button></div><button class="remove" data-toggle="${m.id}" aria-label="Remove ${esc(m.name)} from comparison">×</button></div></th>`).join('')}</tr></thead><tbody>${visible.map(row=>`<tr><th scope="row">${row.label}</th>${ms.map(m=>`<td><span class="spec-value">${esc(row.value(m))}</span>${row.data?evidence(row.data(m),{conditional:row.conditional?.(m)}):`<span class="provenance ${row.derived?'derived':''}"><i class="dot ${row.derived?'calculated':'uncertain'}"></i>${row.derived?'Calculated':'Assessment'}</span>`}${row.note?.(m)?`<span class="cell-note">${esc(row.note(m))}</span>`:''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function sourceContent(id){
 const s=sources[id];if(!s)return '';
 return `<span class="eyebrow">${esc(s.type)}</span><h3>${esc(s.title)}</h3><p>${esc(s.note)}</p><a href="${s.url}" target="_blank" rel="noopener noreferrer">Open source ↗</a>${s.mirror?` <a href="${s.mirror}" target="_blank" rel="noopener noreferrer">Alternate copy ↗</a>`:''}<small>${esc(s.pages)} · Checked ${checked}</small>`;
}
function openSource(id){$('#detail-content').innerHTML=`<p class="eyebrow">SOURCE RECORD</p><h2>Where this specification comes from.</h2><div class="detail-source">${sourceContent(id)}</div>`;$('#detail').showModal();}
function detail(id){
 const m=models.find(m=>m.id===id);if(!m)return;
 $('#detail-content').innerHTML=`<p class="eyebrow">${esc(m.brand)} / MONITOR PROFILE</p><h2>${esc(m.name)}</h2><p>${esc(m.verdict)}</p><span class="pill">ASSESSMENT · ${esc(m.tag)}</span><div class="detail-grid"><div><h3>CONNECTION PATH</h3><p>${esc(m.rgbText)}<br>${esc(m.component)}</p></div><div><h3>CABINET / WEIGHT</h3><p>${m.dim.value?`${len(m.dim.value.w)} W × ${len(m.dim.value.h)} H × ${len(m.dim.value.d)} D`:'Dimensions not verified'}<br>${mass(m.mass.value)}</p></div><div><h3>THE TRADEOFF · ASSESSMENT</h3><p>${esc(m.tradeoff)}</p></div><div><h3>ASK THE SELLER</h3><p>${esc(m.check)}</p></div></div><p class="small muted">${esc(m.sd)} Verify the exact source, sync and cable combination before buying. No modification or unverified accessory is assumed.</p><button class="outline" data-toggle="${m.id}">${state.selected.includes(m.id)?'Remove from comparison':'+ Add to comparison'}</button>${m.sources.map(id=>`<div class="detail-source">${sourceContent(id)}</div>`).join('')}`;
 $('#detail').showModal();
}
const deskFields=[['w','Available width','length'],['d','Desk depth','length'],['h','Clear height','length'],['load','Remaining load','mass'],['cable','Rear allowance','length'],['front','Front workspace','length'],['gap','Side-by-side gap','length']];
function deskInputs(){
 $('#desk-fields').innerHTML=deskFields.map(([k,label,type])=>{const val=type==='mass'?(state.unit==='in'?kgToLb(state.desk[k]):state.desk[k]):(state.unit==='in'?mmToIn(state.desk[k]):state.desk[k]);const unit=type==='mass'?(state.unit==='in'?'lb':'kg'):state.unit;return `<label for="desk-${k}">${label} (${unit})<input id="desk-${k}" data-desk="${k}" data-type="${type}" type="number" step="${state.unit==='in'?'0.1':'1'}" min="${['cable','front','gap'].includes(k)?'0':state.unit==='in'?'0.1':'1'}" max="${type==='mass'?500:state.unit==='in'?200:5000}" value="${val.toFixed(state.unit==='in'?1:0)}"><span id="error-${k}" class="field-error" hidden></span></label>`;}).join('');
}
function svgDrawing(ms){
 const ds=state.desk, known=ms.filter(m=>m.dim.value);const side=state.layout==='side';
 if(!ms.length)return '<div class="empty"><h3>Add a monitor to begin planning.</h3><button class="outline" data-view="browse">Choose monitors →</button></div>';
 let positions=[];
 if(side){const total=known.reduce((s,m)=>s+m.dim.value.w,0)+Math.max(0,known.length-1)*ds.gap;let x=(ds.w-total)/2;positions=known.map(m=>{const p={m,x,y:ds.cable};x+=m.dim.value.w+ds.gap;return p;});}
 else positions=known.map(m=>({m,x:(ds.w-m.dim.value.w)/2,y:ds.cable}));
 const minX=Math.min(0,...positions.map(p=>p.x)), maxX=Math.max(ds.w,...positions.map(p=>p.x+p.m.dim.value.w));
 const maxY=Math.max(ds.d,...positions.map(p=>p.y+p.m.dim.value.d));
 const contentW=maxX-minX, contentH=maxY;const pad=Math.max(contentW,contentH)*.09;const textSize=Math.max(contentW,contentH)*.018;
 const title=side?'Selected monitor cabinets placed side by side on your desk':'Alternative monitor cabinet envelopes overlaid on your desk';
 return `<svg viewBox="${minX-pad} ${-pad} ${contentW+2*pad} ${contentH+2*pad}" role="img" aria-label="${title}"><title>${title}</title><desc>Desk width ${len(ds.w)}, depth ${len(ds.d)}. Rear allowance ${len(ds.cable)}, front workspace ${len(ds.front)}. ${known.length} known cabinet envelopes; ${ms.length-known.length} models cannot be drawn because dimensions are unverified.</desc><defs><pattern id="reserve-lines" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M0 15 15 0" stroke="#7e9167" stroke-opacity=".15" stroke-width="2"/></pattern></defs><rect width="${ds.w}" height="${ds.d}" rx="8" fill="#232d21" stroke="#768a63" stroke-width="2"/><rect width="${ds.w}" height="${Math.min(ds.cable,ds.d)}" fill="url(#reserve-lines)"/><rect y="${Math.max(0,ds.d-ds.front)}" width="${ds.w}" height="${Math.min(ds.front,ds.d)}" fill="#a0b7760a" stroke="#788d5f" stroke-dasharray="7 7"/><text x="${ds.w/2}" y="${-pad*.37}" fill="#a8bb98" font-size="${textSize}" text-anchor="middle" font-family="monospace">${len(ds.w)} AVAILABLE WIDTH</text><text x="${ds.w/2}" y="${ds.d+pad*.55}" fill="#a8bb98" font-size="${textSize}" text-anchor="middle" font-family="monospace">FRONT EDGE / ${len(ds.d)} DESK DEPTH</text>${positions.map((p,i)=>`<g><rect x="${p.x}" y="${p.y}" width="${p.m.dim.value.w}" height="${p.m.dim.value.d}" rx="5" fill="${p.m.color}" fill-opacity="${side?'.13':'.035'}" stroke="${p.m.color}" stroke-width="${side?'3':3+i}" stroke-dasharray="${side||i===0?'none':`${12+i*4} ${7+i*3}`}"/><circle cx="${p.x+textSize*1.3}" cy="${p.y+p.m.dim.value.d-textSize*1.4}" r="${textSize*.9}" fill="${p.m.color}"/><text x="${p.x+textSize*1.3}" y="${p.y+p.m.dim.value.d-textSize*1.1}" fill="#172010" text-anchor="middle" font-size="${textSize}" font-family="monospace">${ms.indexOf(p.m)+1}</text></g>`).join('')}</svg><p class="drawing-caption">Hatched area: rear cable allowance · Dashed band: front workspace<br>${side?'All drawn cabinets occupy the desk together.':'Overlays are alternative choices, not monitors occupying the same physical space.'}${ms.length>known.length?'<br>Unverified cabinet dimensions are excluded from the drawing; no size is guessed.':''}</p>`;
}
function margin(value,type='length'){if(value===null)return 'Not verified';return `${type==='mass'?mass(Math.abs(value)):len(Math.abs(value))} ${value<0?'over':'spare'}`;}
function fitCard(title,f,color){return `<article class="fit-card" style="border-top:2px solid ${color}"><h3>${esc(title)}</h3><span class="fit-status ${f.status}">${statusLabel(f.status)}</span><div class="fit-metrics"><span>Width <b>${margin(f.width)}</b></span><span>Depth <b>${margin(f.depth)}</b></span><span>Height <b>${margin(f.height)}</b></span><span>Load <b>${margin(f.load,'mass')}</b></span></div></article>`;}
function planner(){
 const ms=selected();$('#overlay').setAttribute('aria-pressed',state.layout==='overlay');$('#side').setAttribute('aria-pressed',state.layout==='side');
 $('#desk-models').innerHTML=ms.map((m,i)=>`<span class="desk-model-chip"><i style="background:${m.color}"></i>${i+1}. ${esc(m.name)}${!m.dim.value?' · size unknown':''}</span>`).join('')||'<span class="small muted">Nothing selected yet.</span>';
 $('#desk-canvas').innerHTML=svgDrawing(ms);
 $('#desk-summary').innerHTML=`${state.layout==='side'&&ms.length?`<div class="fit-cards">${fitCard('Combined layout · all selected monitors',combinedFit(ms,state.desk),'#b8b5ff')}</div>`:''}<div class="fit-cards">${ms.map(m=>fitCard(m.name,fit(m,state.desk),m.color)).join('')}</div>`;
}
function sourcesList(){$('#source-list').innerHTML=Object.entries(sources).map(([id,s])=>`<article class="source" id="source-${id}"><span>${esc(s.type)}</span><h3>${esc(s.title)}</h3><p>${esc(s.note)}</p><p>${esc(s.pages)}</p><a href="${s.url}" target="_blank" rel="noopener noreferrer">View document ↗</a>${s.mirror?`<a href="${s.mirror}" target="_blank" rel="noopener noreferrer">Alternate copy ↗</a>`:''}</article>`).join('');}
function render(){cards();dock();comparison();planner();}
function resetFilters(){filters={search:'',brand:'all',size:'all',rgb:'all',tvl:0,depth:0,mass:0,fits:false};$('#search').value='';for(const id of ['brand','size','rgb'])$(`#${id}`).value='all';$('#tvl').value='0';$('#max-depth').value='';$('#max-mass').value='';$('#fits-only').checked=false;cards();}
function units(){
 $('#units').innerHTML=`${state.unit==='in'?'in / lb':'mm / kg'} <span>⇄</span>`;
 $$('.length-unit').forEach(el=>el.textContent=state.unit);$$('.mass-unit').forEach(el=>el.textContent=state.unit==='in'?'lb':'kg');
 $('#max-depth').value=filters.depth?(state.unit==='in'?mmToIn(filters.depth):filters.depth).toFixed(state.unit==='in'?1:0):'';
 $('#max-mass').value=filters.mass?(state.unit==='in'?kgToLb(filters.mass):filters.mass).toFixed(1):'';
 deskInputs();
}
document.addEventListener('click',event=>{
 const target=event.target.closest('[data-view],[data-toggle],[data-detail],[data-source],[data-reset-filters]');if(!target)return;
 if(target.dataset.view){event.preventDefault();go(target.dataset.view);}
 else if(target.dataset.toggle){const wasDialog=$('#detail').open;toggle(target.dataset.toggle);if(wasDialog){$('#detail').close();}}
 else if(target.dataset.detail)detail(target.dataset.detail);
 else if(target.dataset.source)openSource(target.dataset.source);
 else resetFilters();
});
$('#detail .close').addEventListener('click',()=>$('#detail').close());
$('#detail').addEventListener('click',event=>{if(event.target===$('#detail')){const r=$('#detail').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#detail').close();}});
$('#units').addEventListener('click',()=>{state.unit=state.unit==='in'?'mm':'in';persist();units();render();});
$('#reset-filters').addEventListener('click',resetFilters);
$('#search').addEventListener('input',event=>{filters.search=event.target.value;cards();});
for(const id of ['brand','size','rgb'])$(`#${id}`).addEventListener('change',event=>{filters[id]=event.target.value;cards();});
$('#tvl').addEventListener('change',event=>{filters.tvl=Number(event.target.value)||0;cards();});
for(const [id,field,convert] of [['max-depth','depth',inToMm],['max-mass','mass',lbToKg]])$(`#${id}`).addEventListener('input',event=>{const num=Number(event.target.value);if(event.target.value!==''&&(!Number.isFinite(num)||num<=0)){event.target.setCustomValidity('Enter a positive value or leave blank.');event.target.reportValidity();return;}event.target.setCustomValidity('');filters[field]=event.target.value===''?0:state.unit==='in'?convert(num):num;cards();});
$('#fits-only').addEventListener('change',event=>{filters.fits=event.target.checked;cards();});
$('#sort').addEventListener('change',event=>{sort=event.target.value;cards();});
$('#differences').addEventListener('change',event=>{differences=event.target.checked;comparison();});
$('#desk-fields').addEventListener('input',event=>{
 const el=event.target,k=el.dataset.desk;if(!k)return;const number=Number(el.value);const error=$(`#error-${k}`);
 if(el.value===''||!Number.isFinite(number)||number<Number(el.min)||number>Number(el.max)){el.classList.add('input-invalid');el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',`error-${k}`);error.hidden=false;error.textContent=`Enter ${el.min}–${el.max}. Planner retains the last valid value.`;return;}
 el.classList.remove('input-invalid');el.removeAttribute('aria-invalid');error.hidden=true;
 state.desk[k]=state.unit==='in'?(el.dataset.type==='mass'?lbToKg(number):inToMm(number)):number;persist();render();
});
$('#reset-desk').addEventListener('click',()=>{state.desk=structuredClone(defaults.desk);persist();deskInputs();render();toast('Example dimensions restored. Enter your own measurements before deciding.');});
for(const id of ['overlay','side'])$(`#${id}`).addEventListener('click',()=>{state.layout=id;persist();planner();});
window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
units();sourcesList();render();go(location.hash.slice(1)||'browse',{scroll:false});
