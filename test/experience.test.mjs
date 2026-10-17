// This harness executes app rendering and event handlers without a browser.
// It does not certify layout, browser focus behavior, or visual appearance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
class Element {
 constructor(id='',dataset={}){this.id=id;this.dataset=dataset;this.innerHTML='';this.textContent='';this.value='';this.checked=false;this.hidden=false;this.open=false;this.listeners={};this.attrs={};const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,b)=>b?classes.add(x):classes.delete(x),contains:x=>classes.has(x)};}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 async fire(name,target=this,extra={}){for(const fn of this.listeners[name]||[])await fn({target,preventDefault(){},...extra});}
 setAttribute(k,v){this.attrs[k]=String(v);}removeAttribute(k){delete this.attrs[k];}
 scrollIntoView(){}showModal(){this.open=true;}close(){this.open=false;}
 closest(){return this;}setCustomValidity(s){this.validityText=s;}reportValidity(){}
 getBoundingClientRect(){return {left:0,right:1000,top:0,bottom:1000};}
}
const html=fs.readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');
const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
const tabs=['browse','compare','desk','sources'].map(v=>new Element('',{view:v}));
const views=['browse','compare','desk','sources'].map(v=>elements.get(v));
const document=new Element();
document.querySelector=s=>{if(s.startsWith('#')){const id=s.slice(1).split(' ')[0];if(s==='#detail .close'){if(!elements.has('close'))elements.set('close',new Element());return elements.get('close');}if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);}if(s==='.tabs')return new Element();throw Error('Unhandled selector '+s);};
document.querySelectorAll=s=>s==='.view'?views:s==='.tabs a'?tabs:s==='.length-unit'?[new Element()]:s==='.mass-unit'?[new Element()]:[];
const storage=new Map();
Object.assign(globalThis,{document,window:new Element(),location:{hash:''},history:{replaceState(a,b,hash){globalThis.location.hash=hash;}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
const el=id=>elements.get(id),click=dataset=>document.fire('click',new Element('',dataset));
await import('../docs/app.mjs');
test('initial render, filter and empty-state recovery',async()=>{
 assert.match(el('result-count').textContent,/10 of 10/);assert.match(el('cards').innerHTML,/OEV143/);assert.equal(el('browse').hidden,false);assert.equal(el('compare').hidden,true);
 el('search').value='oev';await el('search').fire('input');assert.match(el('result-count').textContent,/1 of 10/);
 el('search').value='badmodel';await el('search').fire('input');assert.match(el('cards').innerHTML,/No monitors match/);
 await el('reset-filters').fire('click');assert.match(el('result-count').textContent,/10 of 10/);
});
test('navigation and differences-only table rendering',async()=>{
 await click({view:'compare'});assert.equal(el('compare').hidden,false);assert.equal(el('browse').hidden,true);assert.equal(location.hash,'#compare');assert.match(el('comparison').innerHTML,/min-width:825px/);
 const all=el('comparison').innerHTML;el('differences').checked=true;await el('differences').fire('change');assert.ok(el('comparison').innerHTML.length<all.length);assert.ok(!el('comparison').innerHTML.includes('Tube / mask'));
 el('differences').checked=false;await el('differences').fire('change');
});
test('shortlist updates everywhere, enforces four and permits empty selection',async()=>{
 await click({toggle:'2030'});assert.equal(el('dock-count').textContent,4);assert.match(el('comparison').innerHTML,/PVM-2030/);assert.match(el('desk-models').innerHTML,/PVM-2030/);
 await click({toggle:'h150'});assert.equal(el('dock-count').textContent,4);assert.match(el('toast').textContent,/four monitors/);
 for(const id of ['oev143','14n2','14m4','2030'])await click({toggle:id});
 assert.equal(el('dock-count').textContent,0);assert.match(el('comparison').innerHTML,/comparison is empty/);assert.match(el('desk-canvas').innerHTML,/Add a monitor/);
 for(const id of ['14n2','20m2','ike20'])await click({toggle:id});
});
test('source records and monitor profiles open and close',async()=>{
 await click({source:'p2030'});assert.equal(el('detail').open,true);assert.match(el('detail-content').innerHTML,/560 TVL/);await el('close').fire('click');assert.equal(el('detail').open,false);
 await click({detail:'h150'});assert.match(el('detail-content').innerHTML,/IF-C01COMG/);await el('close').fire('click');
});
test('planner updates valid input, retains invalid last value, converts units and stores settings',async()=>{
 await click({view:'desk'});assert.equal(el('desk').hidden,false);
 const input=new Element('desk-d',{desk:'d',type:'length'});input.value='15';input.min='.1';input.max='200';await el('desk-fields').fire('input',input);
 assert.match(el('desk-summary').innerHTML,/Exceeds entered limits/);const before=el('desk-canvas').innerHTML;
 input.value='-10';await el('desk-fields').fire('input',input);assert.equal(el('desk-canvas').innerHTML,before);assert.equal(input.attrs['aria-invalid'],'true');
 input.value='40';await el('desk-fields').fire('input',input);assert.equal(input.attrs['aria-invalid'],undefined);
 await el('units').fire('click');assert.match(el('units').innerHTML,/mm \/ kg/);assert.match(el('desk-fields').innerHTML,/value="1016"/);
 await el('side').fire('click');assert.match(el('desk-summary').innerHTML,/Combined layout/);assert.match(el('desk-summary').innerHTML,/Cannot confirm fit/);assert.match(el('desk-canvas').innerHTML,/Unverified cabinet dimensions are excluded/);
 const saved=JSON.parse([...storage.values()][0]);assert.equal(saved.layout,'side');assert.equal(saved.unit,'mm');assert.equal(saved.desk.d,1016);assert.deepEqual(saved.selected,['14n2','20m2','ike20']);
 await el('reset-desk').fire('click');assert.match(el('toast').textContent,/Example dimensions restored/);
});
test('document contracts: labels, viewport, local module assets and no duplicate IDs',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.match(html,/name="viewport"/);assert.match(html,/<html lang="en">/);assert.match(html,/<dialog id="detail">/);assert.match(html,/aria-live="polite"/);
 for(const file of ['style.css','app.mjs','data.mjs','logic.mjs'])assert.ok(fs.existsSync(new URL('../docs/'+file,import.meta.url)));
 for(const id of ['search','brand','size','rgb','tvl','max-depth','max-mass','fits-only','sort','differences'])assert.ok(html.includes(`id="${id}"`));
});
