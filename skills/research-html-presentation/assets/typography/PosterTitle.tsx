import './poster-title.css';
import {useRef, useState, useEffect, type CSSProperties} from 'react';
import {usePresentationEditor} from './runtime/editor/EffectiveContent';

const anchors=[{x:0,y:64,s:272},{x:177,y:11,s:245},{x:373,y:130,s:204},{x:516,y:60,s:284}];
export function PosterTitle({editId='cover.title',text='数智研析'}:{editId?:string;text?:string}){
 const editor=usePresentationEditor();
 const value=editor.values.get(editId)?.text??text;
 const [typing,setTyping]=useState(false);
 const ref=useRef<HTMLHeadingElement>(null);
 const field=editor.registry.fields.find(f=>f.editId===editId);
 const editable=!!(editor.available&&editor.editing&&field);
 useEffect(()=>{if(!editable)setTyping(false)},[editable]);
 const chars=Array.from(value);
 const slots=chars.length===4?anchors:chars.map((_,i)=>({x:i*730/Math.max(chars.length,1),y:i%2?40:76,s:Math.min(272,840/Math.max(chars.length,1)*1.23)}));
 function commit(){const next=ref.current?.textContent??value;editor.commitText(editId,next);setTyping(false)}
 return <h1 ref={ref} className={`poster-title ${typing?'is-typing':''}`} data-title-audit="true" data-title-mode="single-line" data-edit-id={editId} data-editor-component-bound="true" data-edit-target-id={field?.targetId} data-edit-field="title" contentEditable={editable} suppressContentEditableWarning spellCheck={false} aria-label={value} onFocus={()=>{if(editable){editor.select(editId);setTyping(true)}}} onClick={e=>{if(editable){e.stopPropagation();editor.select(editId)}}} onBlur={commit} onPaste={e=>{if(!editable)return;e.preventDefault();const str=e.clipboardData.getData('text/plain');const sel=window.getSelection();if(sel?.rangeCount){const range=sel.getRangeAt(0);range.deleteContents();range.insertNode(document.createTextNode(str));range.collapse(false)}}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();ref.current?.blur()}if(e.key==='Escape'){e.preventDefault();if(ref.current)ref.current.textContent=value;setTyping(false);ref.current?.blur()}}}>
 {typing?value:chars.map((c,i)=><span key={`${i}-${c}`} className={`poster-glyph ${i===1?'is-gold':''}`} style={{left:slots[i].x,top:slots[i].y,fontSize:slots[i].s,transform:'none'} as CSSProperties}>{c}</span>)}
 </h1>
}
