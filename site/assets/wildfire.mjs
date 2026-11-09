import {atmosphereAt,chapterProgress,paletteAt,paletteColorsAt} from './wildfire-progress.mjs';

const world = document.querySelector('.wildfire-world');
const toggle = document.querySelector('.atmosphere-toggle');
if (world && toggle) {
  const body = document.body;
  const layers = Object.fromEntries(['char','heat','fire','embers'].map(name => [name,world.querySelector('.atmo-'+name)]));
  const passage = document.querySelector('.wildfire-passage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 660px)');
  const connection = navigator.connection;
  let enabled = true, nearWorks = false, charReady = false, fireReady = false;
  let pendingFrame = 0, maxScroll = 1, triggerTop = 0, renderer, loading = false, failed = false;
  let anchors = [[0,0],[1,1]];
  let paletteStep = -1;
  const paintedColours = {};
  try { enabled = sessionStorage.getItem('cuidu-atmosphere') !== 'off'; } catch {}
  const lite = () => reduced.matches || Boolean(connection?.saveData);
  const asset = (name,folder='optimized') => new URL('./'+folder+'/'+name, import.meta.url).href;
  // All visual states share chapter anchors. CSS fallback receives the same values.
  const native = () => false;

  function setEngine() {
    world.dataset.engine = !enabled ? 'off' : lite() ? 'reduced-opacity' : renderer && !failed ? 'webgl-heat-haze' : native() ? 'css-scroll-timeline' : 'scroll-fallback';
  }
  async function prepareRenderer() {
    if (!enabled || lite() || !nearWorks || renderer || loading || failed) return;
    loading = true;
    try {
      const {createWildfireRenderer} = await import('./wildfire-renderer.mjs');
      if (!enabled || lite()) return;
      renderer = await createWildfireRenderer({world,passage,asset,compact:()=>small.matches,onFailure:()=>{
        failed=true; setEngine(); schedule();
      }});
      setEngine(); schedule();
    } catch (error) {
      failed = true; setEngine();
      console.warn('Wildfire: using the static atmosphere fallback.',error.message);
    } finally { loading=false; }
  }
  function prepareAssets() {
    if (!enabled || !nearWorks) return;
    if (!charReady) {
      layers.char.style.backgroundImage = `url("${asset('suito-casting-background-'+(small.matches?1024:1600)+'.webp','game-backgrounds')}")`;
      charReady = true;
    }
    if (!lite() && !fireReady) {
      layers.fire.style.backgroundImage = `url("${asset('effect_fire-512.webp')}")`;
      fireReady = true;
    }
    world.dataset.ready = 'true';
    prepareRenderer();
  }
  const trigger = document.querySelector('#works .chapter-room');
  nearWorks = trigger.getBoundingClientRect().top < window.innerHeight + 100;
  const proximity = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      nearWorks = true; prepareAssets(); proximity.disconnect();
    }
  }, {rootMargin:'0px 0px 100px 0px'});
  proximity.observe(trigger);

  function paint() {
    pendingFrame = 0;
    if (document.hidden) { renderer?.setActive(false); return; }
    // Anchor links and fast scrolling can jump completely past the observer's box.
    if (!nearWorks && window.scrollY + window.innerHeight + 100 >= triggerTop) {
      nearWorks=true; prepareAssets(); proximity.disconnect();
    }
    const progress = chapterProgress(window.scrollY,anchors);
    const palette = paletteAt(progress);
    if (body.dataset.palette !== palette) body.dataset.palette = palette;
    // At most 256 positions across the full page; unchanged tokens never invalidate styles.
    // Adjacent samples differ by only a colour level or two, avoiding chapter-sized jumps.
    const nextPaletteStep = Math.round(progress * 256);
    if (nextPaletteStep !== paletteStep) {
      paletteStep = nextPaletteStep;
      for (const [name,colour] of Object.entries(paletteColorsAt(paletteStep/256))) {
        if (paintedColours[name] === colour) continue;
        body.style.setProperty('--'+name,colour);
        paintedColours[name] = colour;
      }
    }
    const state = atmosphereAt(progress);
    if (enabled && !native()) {
      for (const name of ['char','heat','fire','embers']) layers[name].style.opacity = state[name].toFixed(3);
      if (!lite()) {
        layers.fire.style.transform = `translate3d(0,${state.fireY.toFixed(2)}%,0)`;
        layers.embers.style.transform = `translate3d(0,${state.embersY.toFixed(2)}%,0)`;
      }
    }
    renderer?.update(state,window.scrollY);
    renderer?.setActive(enabled && !lite() && !failed && state.fire > .004);
  }
  function schedule() { if (!pendingFrame && !document.hidden) pendingFrame = requestAnimationFrame(paint); }
  function measure() {
    maxScroll = Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    triggerTop = trigger.getBoundingClientRect().top + window.scrollY;
    anchors = [[0,0]];
    for (const [selector,progress] of [['#works',.08],['#wildfire',.25],['#process',.36],['#stage-energy',.62],['#stage-grading',.73],['#stage-delivery',.83],['#reflection',.9],['#credits',.97]]) {
      const node=document.querySelector(selector);
      if (!node) continue;
      const y=Math.max(0,Math.min(maxScroll-1,node.getBoundingClientRect().top+window.scrollY-100));
      if (y>anchors.at(-1)[0]) anchors.push([y,progress]);
    }
    anchors.push([maxScroll,1]);
    renderer?.measure(); schedule();
  }
  function configure() {
    for (const layer of Object.values(layers)) { layer.style.opacity=''; layer.style.transform=''; }
    body.classList.toggle('wildfire-native',enabled && native());
    body.classList.toggle('wildfire-off',!enabled);
    body.classList.toggle('wildfire-lite',lite());
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.querySelector('.effect-label').textContent = enabled?'Effects on':'Effects off';
    document.dispatchEvent(new CustomEvent('cuidu:effectschange',{detail:{enabled,reduced:lite()}}));
    if (!enabled || lite()) renderer?.setActive(false);
    setEngine(); prepareAssets(); measure();
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('pageshow',measure);
  window.addEventListener('pagehide',()=>renderer?.setActive(false));
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) {
      cancelAnimationFrame(pendingFrame); pendingFrame=0; renderer?.setActive(false);
    } else measure();
  });
  const resize = new ResizeObserver(measure); resize.observe(body);
  toggle.addEventListener('click',()=>{
    enabled = !enabled;
    try { sessionStorage.setItem('cuidu-atmosphere',enabled?'on':'off'); } catch {}
    configure();
  });
  reduced.addEventListener('change',configure);
  small.addEventListener('change',measure);
  connection?.addEventListener?.('change',configure);
  configure(); toggle.hidden=false;
}
