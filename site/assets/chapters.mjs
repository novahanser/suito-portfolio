import {applyTitleArtwork} from './title-artwork.mjs';

// Progressive enhancement: the unenhanced document keeps every media slot readable.
applyTitleArtwork();
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection;
const tokens = getComputedStyle(root);
const ease = tokens.getPropertyValue('--ease-out').trim();
const revealEase = tokens.getPropertyValue('--ease-expo').trim();
const uiDuration = parseFloat(tokens.getPropertyValue('--t-ui')) || 220;
const revealDuration = parseFloat(tokens.getPropertyValue('--t-reveal')) || 800;
const active = new Set();
let effectsEnabled = true;
try { effectsEnabled = sessionStorage.getItem('cuidu-atmosphere') !== 'off'; } catch {}
root.dataset.motion = effectsEnabled ? 'on' : 'off';

function canMove() {
  return effectsEnabled && !reduced.matches && !connection?.saveData && root.dataset.input !== 'keyboard';
}
function motion(element, frames, options = {}, onFinish) {
  if (!canMove() || !element?.animate) { onFinish?.(); return; }
  // Repeated inputs replace their own entrance; no queues or hidden final states.
  for (const running of active) if (running.effect?.target === element) running.cancel();
  const animation = element.animate(frames, {duration:uiDuration,easing:ease,...options});
  active.add(animation);
  animation.oncancel = () => active.delete(animation);
  animation.onfinish = () => { active.delete(animation); onFinish?.(); };
  return animation;
}
function settle() {
  for (const animation of [...active]) {
    try { animation.finish(); } catch { animation.cancel(); }
  }
}
document.addEventListener('keydown', () => { root.dataset.input = 'keyboard'; settle(); }, {capture:true});
document.addEventListener('pointerdown', () => { root.dataset.input = 'pointer'; }, {capture:true,passive:true});
document.addEventListener('cuidu:effectschange', event => {
  effectsEnabled = event.detail.enabled;
  root.dataset.motion = effectsEnabled ? 'on' : 'off';
  if (!effectsEnabled || event.detail.reduced) settle();
});
reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
connection?.addEventListener?.('change', () => { if (connection.saveData) settle(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });

const rail = document.querySelector('.chapter-rail');
const tabs = [...rail.querySelectorAll('[role=tab]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const marker = rail.querySelector('.chapter-marker');
let selected = 0;
function selectChapter(index, animate = false) {
  const direction = index > selected ? 1 : -1;
  const changed = index !== selected;
  selected = index;
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    if (i !== index) panels[i].querySelectorAll('video').forEach(video => video.pause());
    panels[i].hidden = i !== index;
  });
  marker.style.transform = `translateX(${index * 100}%)`;
  if (animate && changed) motion(panels[index], [
    {opacity:.4,transform:`translateX(${direction * 12}px)`},
    {opacity:1,transform:'translateX(0)'}
  ]);
}
function rememberWork(index) {
  history.replaceState(history.state, '', '#' + panels[index].id);
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', event => {
    selectChapter(index, event.detail > 0);
    rememberWork(index);
  });
  tab.addEventListener('keydown', event => {
    const offsets = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1};
    let next;
    if (event.key in offsets) next = (index + offsets[event.key] + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); selectChapter(next); rememberWork(next); tabs[next].focus({preventScroll:true});
  });
});
selectChapter(0);

// Work links open their tab before the browser follows the section anchor.
function selectWorkFromHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const panel = document.getElementById(id)?.closest('.work-panel');
  const index = panels.indexOf(panel);
  if (index >= 0) selectChapter(index);
}
selectWorkFromHash();
window.addEventListener('hashchange', selectWorkFromHash);
document.querySelectorAll('[data-work-target]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const index = panels.findIndex(panel => panel.id === link.dataset.workTarget);
    if (index < 0) return;
    selectChapter(index);
    panels[index].focus({preventScroll:true});
  });
});
document.querySelector('.chapter-panels').dataset.enhanced = 'true';
rail.hidden = false;

// Enhancing the work tabs removes two panels from layout. Restore a direct
// section link once fonts settle, unless the reader has already interacted.
if (location.hash) {
  let interacted = false;
  const stopRestoring = () => { interacted = true; };
  for (const event of ['wheel','touchstart','pointerdown','keydown'])
    document.addEventListener(event,stopRestoring,{once:true,passive:true,capture:true});
  document.fonts.ready.then(() => requestAnimationFrame(() => {
    if (interacted) return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    document.getElementById(id)?.scrollIntoView({behavior:'instant',block:'start'});
  }));
}

const menu = document.querySelector('.mobile-menu');
menu.addEventListener('toggle', () => {
  if (menu.open) motion(menu.querySelector('nav'),[{opacity:.5,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],{duration:180});
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click',()=>{ menu.open = false; }));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open && !document.querySelector('dialog[open]')) { menu.open = false; menu.querySelector('summary').focus(); }
});
matchMedia('(max-width:660px)').addEventListener('change', event => { if (!event.matches) menu.open = false; });

document.querySelectorAll('details.evidence,details.outline').forEach(details => {
  details.addEventListener('toggle', () => {
    if (details.open) motion(details.querySelector('.evidence-body,ol'),[
      {opacity:.5,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}
    ],{duration:180});
  });
});

// Each item is visible before enhancement and after interruption. Nothing waits hidden for an observer.
if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal.unobserve(entry.target);
      const node = entry.target;
      const type = node.dataset.reveal;
      const siblings = node.parentElement.querySelectorAll(':scope > [data-reveal]');
      const delay = Math.min(3, Math.max(0,[...siblings].indexOf(node))) * 70;
      const from = type === 'image' ? {opacity:.65,clipPath:'inset(5% 0 5% 0)',transform:'scale(1.02)'}
        : node.matches('.evidence') ? {transform:'translateY(12px)'}
        : type === 'copy' ? {opacity:.5}
        : {opacity:.4,transform:`translateY(${type === 'row' ? 12 : 20}px)`};
      const to = type === 'image' ? {opacity:1,clipPath:'inset(0 0 0 0)',transform:'scale(1)'}
        : node.matches('.evidence') ? {transform:'translateY(0)'}
        : type === 'copy' ? {opacity:1} : {opacity:1,transform:'translateY(0)'};
      motion(node,[from,to],{duration:type === 'row' ? 650 : revealDuration,delay,easing:revealEase,fill:'backwards'});
    }
  },{rootMargin:'0px 0px -8% 0px',threshold:.08});
  document.querySelectorAll('[data-reveal]').forEach(node => {
    if (node.getBoundingClientRect().top >= window.innerHeight * .92) reveal.observe(node);
  });

  const links = [...document.querySelectorAll('.site-nav a,.mobile-menu nav a[href^="#"]')];
  const navigation = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a,b)=>b.boundingClientRect.top-a.boundingClientRect.top);
    if (!visible.length) return;
    const id = visible[0].target.id === 'wildfire' ? 'works' : visible[0].target.id;
    links.forEach(link => {
      if (link.getAttribute('href') === '#'+id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  },{rootMargin:'-12% 0px -72% 0px'});
  document.querySelectorAll('#project,#works,#wildfire,#process,#reflection,#credits').forEach(section=>navigation.observe(section));

  // Journal stage tracking is shared with the compact mobile directory.
}

if (!location.hash && window.scrollY < 40) {
  document.querySelectorAll('.hero .title-fallback > span').forEach((letter,index) => motion(letter,[
    {opacity:.6,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}
  ],{duration:650,delay:index*70,easing:revealEase,fill:'backwards'}));
  motion(document.querySelector('.hero-art-window'),[
    {opacity:.7,clipPath:'inset(3% 0 3% 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}
  ],{duration:revealDuration,delay:100,easing:revealEase,fill:'backwards'});
}
