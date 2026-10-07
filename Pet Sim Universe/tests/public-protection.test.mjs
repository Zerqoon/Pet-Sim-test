import test from 'node:test';
import assert from 'node:assert/strict';
import {enablePublicProtection} from '../public/data/public-protection.js';

function target(kind='text') {
  return {nodeType:1,attributes:{},setAttribute(name,value){this.attributes[name]=value;},closest(selector){
    if(kind==='input'&&selector.includes('input'))return this;
    if(kind==='textarea'&&selector.includes('textarea'))return this;
    if(kind==='image'&&selector.includes('img'))return this;
    if(kind==='artwork'&&selector.includes('.card-art'))return this;
    return null;
  }};
}
function fixture() {
  const image=target('image');
  const document=Object.assign(new EventTarget(),{activeElement:null,selection:null,querySelectorAll:()=>[image],getSelection(){return this.selection;}});
  const cleanup=enablePublicProtection(document);
  function emit(type,properties={},node=target()) {
    const event=new Event(type,{cancelable:true,bubbles:true});
    Object.defineProperty(event,'target',{value:node});
    for(const [key,value] of Object.entries(properties))Object.defineProperty(event,key,{value});
    document.dispatchEvent(event);return event.defaultPrevented;
  }
  return {document,image,emit,cleanup};
}
const selection=image=>({isCollapsed:false,rangeCount:1,getRangeAt:()=>({cloneContents:()=>({querySelector:()=>image})})});

test('right-click menus are prevented throughout the public page',()=>{
  const f=fixture();assert.equal(f.emit('contextmenu'),true);assert.equal(f.emit('contextmenu',{},target('image')),true);assert.equal(f.emit('contextmenu',{},target('input')),true);
});
test('images retain async decoding and delegated protection covers dynamically rendered artwork',()=>{
  const f=fixture();assert.equal(f.image.attributes.draggable,'false');assert.equal(f.image.attributes.decoding,'async');
  const laterImage=target('image');assert.equal(f.emit('dragstart',{},laterImage),true);assert.equal(f.emit('copy',{},laterImage),true);assert.equal(f.emit('cut',{},laterImage),true);assert.equal(f.emit('dragstart',{},target('artwork')),true);
});
test('common Windows/Linux and Mac inspect, console, source and save shortcuts are prevented',()=>{
  const f=fixture();const keys=[{key:'F12'},{key:'ContextMenu'},{key:'F10',shiftKey:true},...['I','J','C','K'].map(key=>({key,ctrlKey:true,shiftKey:true})),...['i','j','c','k'].map(key=>({key,metaKey:true,altKey:true})),...['u','s'].flatMap(key=>[{key,ctrlKey:true},{key,metaKey:true},{key,metaKey:true,altKey:true}])];
  for(const keyspec of keys)assert.equal(f.emit('keydown',keyspec),true,JSON.stringify(keyspec));
});
test('copying a selection containing artwork is blocked without preventing normal text or redeem codes',()=>{
  const f=fixture();f.document.selection=selection(f.image);assert.equal(f.emit('copy'),true);assert.equal(f.emit('keydown',{key:'c',ctrlKey:true}),true);assert.equal(f.emit('keydown',{key:'x',metaKey:true}),true);
  f.document.selection=selection(null);assert.equal(f.emit('copy'),false);assert.equal(f.emit('keydown',{key:'c',ctrlKey:true}),false);assert.equal(f.emit('keydown',{key:'c',metaKey:true}),false);
});
test('search/calculator editing and the existing Copy Code textarea fallback remain available',()=>{
  const f=fixture();f.document.selection=selection(f.image);
  for(const kind of ['input','textarea']){const input=target(kind);f.document.activeElement=input;assert.equal(f.emit('copy',{},input),false);assert.equal(f.emit('cut',{},input),false);for(const key of ['a','c','v','x','z'])assert.equal(f.emit('keydown',{key,ctrlKey:true},input),false);assert.equal(f.emit('keydown',{key:'c',metaKey:true},input),false);}
});
test('ordinary navigation, search, card actions and keyboard focus are not intercepted',()=>{
  const f=fixture();for(const keyspec of [{key:'/'},{key:'Tab'},{key:'Enter'},{key:'Escape'},{key:'ArrowDown'},{key:'r',ctrlKey:true},{key:'p',ctrlKey:true}])assert.equal(f.emit('keydown',keyspec),false);
  assert.equal(f.emit('click',{},target('image')),false);assert.equal(f.emit('dragstart',{},target('input')),false);
});
test('protected shortcuts cannot reach app handlers and disposal restores normal event behavior',()=>{
  const f=fixture();let handled=0;f.document.addEventListener('keydown',()=>handled++);f.emit('keydown',{key:'F12'});assert.equal(handled,0);f.emit('keydown',{key:'Tab'});assert.equal(handled,1);f.cleanup();assert.equal(f.emit('keydown',{key:'F12'}),false);assert.equal(handled,2);assert.equal(f.emit('contextmenu'),false);
});
test('an unavailable or failed selection API does not break normal form actions',()=>{
  const f=fixture();f.document.getSelection=()=>{throw Error('No selection');};assert.equal(f.emit('copy'),false);assert.equal(f.emit('dragstart',{},target('image')),true);assert.equal(f.emit('keydown',{key:'F12'}),true);
});
