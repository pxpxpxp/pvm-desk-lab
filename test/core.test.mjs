import test from 'node:test';
import assert from 'node:assert/strict';
import {models,sources} from '../docs/data.mjs';
import {defaults,fit,combinedFit,filterModels,cleanSaved,inToMm,mmToIn,lbToKg,kgToLb} from '../docs/logic.mjs';
const by=id=>models.find(m=>m.id===id), desk=structuredClone(defaults.desk);
const blank={search:'',brand:'all',size:'all',rgb:'all',tvl:0,depth:0,mass:0,fits:false};
test('required model coverage, unique identities, source integrity',()=>{
 assert.equal(models.length,10);assert.equal(new Set(models.map(m=>m.id)).size,10);
 for(const name of ['OEV143','PVM-14N2U','PVM-20M2U','PVM-2030'])assert.ok(models.some(m=>m.name===name));
 assert.ok(models.some(m=>m.brand==='JVC'));assert.ok(models.some(m=>m.brand==='Ikegami'));
 for(const m of models){for(const id of m.sources)assert.ok(sources[id]);for(const k of ['nominal','viewable','dim','mass','tvl']){assert.ok(['verified','uncertain','unknown'].includes(m[k].status));if(m[k].status==='verified')assert.ok(sources[m[k].source]);}}
});
test('RGB filters preserve hardware and adapter distinctions',()=>{
 const stock=filterModels(models,{...blank,rgb:'stock'},desk);assert.ok(stock.includes(by('2030')));assert.ok(!stock.includes(by('h150')));assert.ok(!stock.includes(by('a130')));
 const possible=filterModels(models,{...blank,rgb:'possible'},desk);assert.ok(possible.includes(by('h150')));assert.ok(!possible.includes(by('a13')));
 const bnc=filterModels(models,{...blank,rgb:'bnc'},desk);assert.ok(!bnc.includes(by('2030')));assert.ok(bnc.includes(by('oev143')));
});
test('numeric filters exclude unknowns and incomparable VTR TVL',()=>{
 const high=filterModels(models,{...blank,tvl:500},desk);assert.ok(!high.includes(by('2030')));assert.ok(!high.includes(by('ike20')));assert.ok(high.includes(by('14n2')));
 assert.deepEqual(filterModels(models,{...blank,tvl:800},desk).map(m=>m.id),['14m4']);
 assert.ok(!filterModels(models,{...blank,depth:450},desk).includes(by('ike20')));
 assert.deepEqual(filterModels(models,{...blank,mass:10},desk).map(m=>m.id),['a13']);
});
test('combined search, manufacturer, size, depth and weight filters',()=>{
 assert.deepEqual(filterModels(models,{...blank,brand:'Sony',size:'compact',depth:420,mass:16,search:'n2'},desk).map(m=>m.id),['14n2']);
 assert.equal(filterModels(models,{...blank,search:'not-a-monitor'},desk).length,0);
 assert.deepEqual(filterModels(models,{...blank,size:'large'},desk).map(m=>m.id),['20m2','2030','ike20']);
});
test('fit checks cabinet, cable, front space, height and remaining load',()=>{
 const m=by('oev143');assert.equal(fit(m,desk).status,'fits');
 const exact={w:346,d:431+76+152,h:340,load:17,cable:76,front:152,gap:0};assert.equal(fit(m,exact).status,'fits');
 for(const field of ['w','d','h','load']){const below={...exact,[field]:exact[field]-.001};assert.equal(fit(m,below).status,'over',field);}
 assert.equal(fit(by('ike20'),desk).status,'unknown');
 assert.ok(!filterModels(models,{...blank,fits:true},desk).includes(by('ike20')));
});
test('side-by-side uses sum of widths, gap, max depth/height and combined mass',()=>{
 const ms=[by('14n2'),by('14m2')],d={w:750,d:700,h:400,load:40,cable:75,front:150,gap:50};
 const f=combinedFit(ms,d);assert.equal(f.status,'fits');assert.equal(f.width,8);assert.equal(f.depth,44);assert.equal(f.height,60);assert.equal(f.load,8.3);
 assert.equal(combinedFit(ms,{...d,w:741}).status,'over');assert.equal(combinedFit(ms,{...d,load:30}).status,'over');
 assert.equal(combinedFit([by('ike20'),by('14n2')],d).status,'unknown');assert.equal(combinedFit([],d).status,'empty');
});
test('unit conversion round trips preserve underlying physical dimensions',()=>{
 for(const value of [0,.1,3,16.3,36,80]){assert.ok(Math.abs(mmToIn(inToMm(value))-value)<1e-10);assert.ok(Math.abs(kgToLb(lbToKg(value))-value)<1e-8);}
});
test('saved settings reject corrupt inputs while retaining valid selection and small budgets',()=>{
 const got=cleanSaved({unit:'mm',layout:'side',selected:['2030','2030','bogus','a13'],desk:{w:-1,d:'700',h:Infinity,load:.1,cable:0,front:NaN}},models);
 assert.deepEqual(got.selected,['2030','a13']);assert.equal(got.desk.w,desk.w);assert.equal(got.desk.load,.1);assert.equal(got.desk.cable,0);assert.equal(got.unit,'mm');
 assert.equal(cleanSaved({selected:models.map(m=>m.id)},models).selected.length,4);
 assert.deepEqual(cleanSaved(null,models),defaults);
});
