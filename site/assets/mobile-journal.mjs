const nav=document.querySelector('.process-nav');
const toggle=nav?.querySelector('.process-nav-toggle');
const narrow=matchMedia('(max-width:800px)');
const links=[...nav.querySelectorAll('a[href^="#stage-"]')];
const stages=links.map(a=>document.querySelector(a.getAttribute('href')));
const indexLabel=nav.querySelector('.stage-current-index');
const nameLabel=nav.querySelector('.stage-current-name');
let stageObserver,resizeFrame;
function setCurrent(index){
  links.forEach((link,i)=>i===index?link.setAttribute('aria-current','step'):link.removeAttribute('aria-current'));
  indexLabel.textContent=`${String(index+1).padStart(2,'0')} / ${String(stages.length).padStart(2,'0')}`;
  nameLabel.textContent=links[index].textContent.replace(/^\s*\d+\s*/,'').trim();
}
function closeStages(restoreFocus=false){
  nav.dataset.expanded='false';toggle.setAttribute('aria-expanded','false');
  if(restoreFocus)toggle.focus({preventScroll:true});
}
toggle.hidden=false;nav.dataset.compact='true';closeStages();
toggle.addEventListener('click',()=>{
  const expanded=toggle.getAttribute('aria-expanded')!=='true';
  toggle.setAttribute('aria-expanded',String(expanded));nav.dataset.expanded=String(expanded);
});
links.forEach((link,index)=>link.addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  closeStages();setCurrent(index);
  if(narrow.matches&&event.detail===0){stages[index].tabIndex=-1;stages[index].focus({preventScroll:true});}
}));
document.addEventListener('pointerdown',event=>{if(nav.dataset.expanded==='true'&&!nav.contains(event.target))closeStages();},{passive:true});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&nav.dataset.expanded==='true'&&!document.querySelector('dialog[open]')){event.preventDefault();closeStages(true);}
});
nav.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(!nav.contains(document.activeElement))closeStages();}));
function observeStages(){
  stageObserver?.disconnect();
  const headerHeight=document.querySelector('.site-header').offsetHeight;
  const offset=Math.min(innerHeight-2,headerHeight+(narrow.matches?86:34));
  const update=()=>{
    let index=0;
    stages.forEach((stage,i)=>{if(stage.getBoundingClientRect().top<=offset+2)index=i;});
    setCurrent(index);
  };
  update();
  if('IntersectionObserver' in window){
    stageObserver=new IntersectionObserver(update,{rootMargin:`-${offset}px 0px -${Math.max(0,innerHeight-offset-2)}px 0px`,threshold:0});
    stages.forEach(stage=>stageObserver.observe(stage));
  }
}
observeStages();
window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(observeStages);},{passive:true});
narrow.addEventListener('change',()=>{closeStages();observeStages();});
document.fonts.ready.then(observeStages);

// No autoplay and no drag emulation: the browser owns touch/trackpad scrolling.
for(const gallery of document.querySelectorAll('[data-frame-gallery]')){
  const track=gallery.querySelector('.frame-track'),cards=[...track.children];
  const previous=gallery.querySelector('[data-frame-prev]'),next=gallery.querySelector('[data-frame-next]');
  if(!previous||!next)continue;
  const count=gallery.querySelector('.frame-count');
  let current=0,pending;
  function sync(){
    const step=cards[1].offsetLeft-cards[0].offsetLeft;
    if(!step)return;
    current=Math.max(0,Math.min(cards.length-1,Math.round(track.scrollLeft/step)));
    count.textContent=`${String(current+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
    previous.disabled=current===0;next.disabled=current===cards.length-1;
  }
  function go(index){
    const target=Math.max(0,Math.min(cards.length-1,index));
    const smooth=!matchMedia('(prefers-reduced-motion:reduce)').matches&&document.documentElement.dataset.motion!=='off'&&document.documentElement.dataset.input!=='keyboard';
    track.scrollTo({left:cards[target].offsetLeft-cards[0].offsetLeft,behavior:smooth?'smooth':'instant'});
  }
  previous.addEventListener('click',()=>go(current-1));next.addEventListener('click',()=>go(current+1));
  track.addEventListener('scroll',()=>{cancelAnimationFrame(pending);pending=requestAnimationFrame(sync);},{passive:true});
  track.addEventListener('keydown',event=>{
    if(event.target!==track)return;
    if(event.key==='ArrowRight'){event.preventDefault();go(current+1);}
    else if(event.key==='ArrowLeft'){event.preventDefault();go(current-1);}
    else if(event.key==='Home'){event.preventDefault();go(0);}
    else if(event.key==='End'){event.preventDefault();go(cards.length-1);}
  });
  gallery.dataset.galleryReady='true';
  if('ResizeObserver' in window)new ResizeObserver(sync).observe(track);
}
