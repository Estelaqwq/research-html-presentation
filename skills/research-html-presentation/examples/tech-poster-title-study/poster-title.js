const posterSlots=[{x:0,y:64,size:272,angle:0},{x:177,y:11,size:245,angle:0},{x:373,y:130,size:204,angle:0},{x:516,y:60,size:284,angle:0}];
function titleSlots(count){
 if(count===4)return posterSlots;
 const factors=[1.1,.93,.83,1.12,.9,1.04],base=Math.min(215,690/(Math.max(1,count)*.79));let cursor=8;
 return Array.from({length:count},(_,i)=>{const size=base*factors[i%factors.length],slot={x:cursor,y:[43,17,70,27,51,11][i%6],size,angle:0};cursor+=size*.79;return slot;});
}
function renderPosterTitle(main,subtitle){
 const root=document.querySelector('.poster-title');const chars=Array.from(main),slots=titleSlots(chars.length);
 root.replaceChildren();root.setAttribute('aria-label',main+'，'+subtitle);
 chars.forEach((char,i)=>{const n=document.createElement('span'),s=slots[i];n.className='poster-glyph'+(i===1?' is-gold':'');n.textContent=char;n.style.cssText=`left:${s.x}px;top:${s.y}px;font-size:${s.size}px;transform:none;--letter-index:${i};`;root.append(n);});
 const em=document.createElement('em');em.className='poster-subtitle';em.textContent=subtitle;root.append(em);
 const glint=document.createElement('i');glint.className='title-glint';glint.setAttribute('aria-hidden','true');root.append(glint);
}
