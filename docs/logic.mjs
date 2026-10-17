export const defaults={unit:'in',desk:{w:914.4,d:762,h:609.6,load:36.2874,cable:76.2,front:152.4,gap:50.8},selected:['oev143','14n2','14m4'],layout:'overlay'};
export function fit(m,desk){
 const dim=m.dim.value, mass=m.mass.value;
 const width=dim?desk.w-dim.w:null;
 const depth=dim?desk.d-desk.cable-desk.front-dim.d:null;
 const height=dim?desk.h-dim.h:null;
 const load=mass!==null?desk.load-mass:null;
 const values=[width,depth,height,load];
 return {width,depth,height,load,status:values.some(x=>x!==null&&x<0)?'over':values.some(x=>x===null)?'unknown':'fits'};
}
export function combinedFit(ms,desk){
 if(!ms.length)return {status:'empty',width:null,depth:null,height:null,load:null};
 const knownDim=ms.every(m=>m.dim.value), knownMass=ms.every(m=>m.mass.value!==null);
 const width=knownDim?desk.w-ms.reduce((s,m)=>s+m.dim.value.w,0)-desk.gap*(ms.length-1):null;
 const depth=knownDim?desk.d-desk.cable-desk.front-Math.max(...ms.map(m=>m.dim.value.d)):null;
 const height=knownDim?desk.h-Math.max(...ms.map(m=>m.dim.value.h)):null;
 const load=knownMass?desk.load-ms.reduce((s,m)=>s+m.mass.value,0):null;
 const vals=[width,depth,height,load];
 return {status:vals.some(x=>x!==null&&x<0)?'over':vals.some(x=>x===null)?'unknown':'fits',width,depth,height,load};
}
export function filterModels(models,f,desk){return models.filter(m=>{
 if(f.search&&!`${m.brand} ${m.name}`.toLowerCase().includes(f.search.toLowerCase()))return false;
 if(f.brand!=='all'&&m.brand!==f.brand)return false;
 if(f.size==='compact'&&m.nominal.value>15)return false;
 if(f.size==='large'&&m.nominal.value<19)return false;
 if(f.rgb==='stock'&&!['builtin','adapter'].includes(m.rgb))return false;
 if(f.rgb==='bnc'&&m.rgb!=='builtin')return false;
 if(f.rgb==='possible'&&m.rgb==='none')return false;
 if(f.rgb==='none'&&m.rgb!=='none')return false;
 if(f.tvl>0&&(!m.tvlComparable||m.tvl.value===null||m.tvl.value<f.tvl))return false;
 if(f.depth>0&&(!m.dim.value||m.dim.value.d>f.depth))return false;
 if(f.mass>0&&(m.mass.value===null||m.mass.value>f.mass))return false;
 if(f.fits&&fit(m,desk).status!=='fits')return false;
 return true;
});}
export const inToMm=x=>x*25.4;
export const mmToIn=x=>x/25.4;
export const lbToKg=x=>x/2.2046226218;
export const kgToLb=x=>x*2.2046226218;
export function cleanSaved(v,models){
 const d=structuredClone(defaults);
 if(!v||typeof v!=='object')return d;
 if(['in','mm'].includes(v.unit))d.unit=v.unit;
 if(['overlay','side'].includes(v.layout))d.layout=v.layout;
 if(Array.isArray(v.selected))d.selected=[...new Set(v.selected)].filter(id=>models.some(m=>m.id===id)).slice(0,4);
 for(const k of Object.keys(d.desk)){const n=v.desk?.[k];if(Number.isFinite(n)&&(['cable','front','gap'].includes(k)?n>=0:n>0)&&n<=10000)d.desk[k]=n;}
 return d;
}
