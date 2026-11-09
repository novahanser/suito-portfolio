// A single, small WebGL background pass. Only explicitly marked background art is sampled.
// Student media, title artwork, text and interface controls remain in the foreground DOM.
// Art and colour texture: the user's supplied Rotaeno reference assets.
const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() { v_uv = a_position * .5 + .5; gl_Position = vec4(a_position,0.,1.); }
`;

const fragmentSource = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_forest, u_charred, u_art, u_fireTex, u_noise, u_characterMask;
uniform vec2 u_view, u_backgroundRatios;
uniform float u_time, u_char, u_heat, u_fire, u_sceneMode, u_artPosition;

float noise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return texture2D(u_noise, (cell + f + .5) / 256.).r;
}
float fbm(vec2 p) {
  return .56 * noise(p) + .28 * noise(p * 2.03 + 17.4) + .16 * noise(p * 4.11 + 43.7);
}
vec2 cover(vec2 uv, vec2 box, float ratio, float position) {
  float aspect = box.x / box.y;
  vec2 scale = vec2(min(1., aspect / ratio), min(1., ratio / aspect));
  return uv * scale + (1. - scale) * vec2(position, .5);
}
vec3 fireColour(float core, vec3 detail) {
  vec3 colour = mix(vec3(.94,.105,.012), vec3(1.,.53,.055), smoothstep(0.,.38,core));
  colour = mix(colour, vec3(1.,.94,.67), smoothstep(.52,1.,core));
  return mix(colour, detail, .18) * (.83 + .23 * detail.g);
}
vec4 flame(vec2 p, float height, float time, float seed) {
  float bend = fbm(vec2(p.x * 5.6 + seed, p.y * 4.8 - time * .65)) - .5;
  vec2 flow = vec2(p.x * 18. + bend * 3.4, p.y * 4.8 - time * 1.65);
  float body = fbm(flow + seed);
  float fingers = fbm(vec2(p.x * 8.5 + bend, p.y * 2.5 - time * .8) + seed);
  float fuel = fbm(vec2(p.x * 7. + seed,seed));
  float field = .52 + fuel * .42 - p.y / height + (body - .45) * 1.48 + fingers * .16;
  vec2 uv = vec2(p.x * 1.3 + bend * .24 + seed, p.y * .9 - time * .18);
  vec3 detail = texture2D(u_fireTex, uv).rgb;
  float density = smoothstep(.015,.105,field) * smoothstep(.025,.72,detail.g + field * .3);
  float core = clamp(field * .95 + detail.g * .22, 0., 1.);
  return vec4(fireColour(core,detail), density);
}
float sparks(vec2 uv, float time) {
  vec2 p = vec2(uv.x * 17., uv.y * 10. - time * .62);
  vec2 cell = floor(p);
  float seed = noise(cell * 7. + 69.);
  vec2 centre = vec2(.2 + .6 * seed + sin(time * 1.7 + seed * 31.) * .11, .25 + .5 * noise(cell + 151.));
  vec2 d = fract(p) - centre;
  d.x *= u_view.x / u_view.y * 10. / 17.;
  float core = exp(-dot(d * vec2(1.,.7), d * vec2(1.,.7)) * 1800.);
  float glow = exp(-dot(d,d) * 210.) * .17;
  return (core + glow) * step(.72,seed) * (1. - smoothstep(.2,.95,uv.y));
}
void main() {
  vec2 uv = v_uv;
  vec2 p = vec2(uv.x * u_view.x / u_view.y, uv.y);
  float strength = u_fire / .82;
  float height = .13 + .29 * strength;
  float edge = .72 + .28 * pow(abs(uv.x - .5) * 2., 1.3);
  vec2 sceneUV = cover(uv, u_view, 2520. / 1080., u_artPosition);
  vec2 protection = vec2(0.);
  vec3 protectedScene = vec3(0.);
  if (u_sceneMode > .5) {
    // The mask is registered to the uncropped artwork. It shares exactly the
    // artwork's cover/position mapping on desktop and portrait screens.
    protection = texture2D(u_characterMask,sceneUV).rg;
  }
  vec2 hotUV = uv;
  if (uv.y < height + .35) {
    float shimmer = 1. - smoothstep(height * .55, height + .35, uv.y);
    shimmer *= u_heat * (.4 + .6 * fbm(vec2(p.x * 8., p.y * 4. - u_time * .6)));
    shimmer *= 1. - protection.g;
    vec2 waves = vec2(
      fbm(vec2(p.x * 25., p.y * 9. - u_time * 2.2)) - .5,
      fbm(vec2(p.x * 19. + 73., p.y * 13. - u_time * 1.8)) - .5
    );
    // CSS-pixel displacement; the upper canopy and all DOM text stay still.
    hotUV = clamp(uv + waves * vec2(28.,9.) * shimmer / u_view, .001, .999);
  }
  vec2 forestUV = cover(hotUV, u_view, u_backgroundRatios.x, .5);
  vec2 charredUV = cover(hotUV, u_view, u_backgroundRatios.y, .5);
  vec3 background = mix(texture2D(u_forest,forestUV).rgb, texture2D(u_charred,charredUV).rgb, u_char);
  float glow = exp(-uv.y * 3.8) * u_heat;
  background *= mix(1.,.52,u_char);
  background *= mix(vec3(1.),vec3(1.06,.76,.55),u_heat * .5);
  background += vec3(.29,.06,.008) * glow;

  // The canvas lives inside the chapter background while that chapter is visible.
  // Browser compositing scrolls the image; the 30 fps shader only animates local heat.
  if (u_sceneMode > .5) {
    vec2 hotSceneUV = cover(hotUV, u_view, 2520. / 1080., u_artPosition);
    vec3 art = texture2D(u_art,clamp(hotSceneUV,.001,.999)).rgb;
    // Only the original background texture supplies colour. The supplied
    // cutout contributes coverage data and is never drawn as a second image.
    protectedScene = mix(background,texture2D(u_art,clamp(sceneUV,.001,.999)).rgb,.88);
    background = mix(background, art, .88);
  }

  if (uv.y < .75) {
    float smoke = fbm(vec2(p.x * 7., p.y * 6. - u_time * .32));
    float smokeMask = smoothstep(.08,.3,uv.y) * (1. - smoothstep(.35,.75,uv.y));
    background = mix(background,vec3(.12,.095,.075),smoke * smokeMask * u_fire * .16);
  }
  if (uv.y < height * 1.4) {
    vec4 rear = flame(p, height * edge, u_time, 12.7);
    vec4 front = flame(p, height * .64 * edge, u_time * 1.13, 73.1);
    float emission = smoothstep(0.,.72,strength);
    background = 1. - (1. - background) * (1. - rear.rgb * rear.a * emission * .86);
    background = mix(background,front.rgb,front.a * emission * .8);
  }
  if (uv.y < .95) background += vec3(1.,.39,.065) * sparks(uv,u_time) * strength * .85;
  background = mix(background,protectedScene,protection.r);
  gl_FragColor = vec4(background,1.);
}
`;

export function renderBudget(width, height, compact = false, low = false) {
  const w = Math.max(1, Number.isFinite(width) ? width : 1);
  const h = Math.max(1, Number.isFinite(height) ? height : 1);
  const maxPixels = low ? 160000 : compact ? 240000 : 460000;
  const scale = Math.min(compact ? .85 : .8, 1200 / w, 1000 / h, Math.sqrt(maxPixels / (w*h)));
  return {width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(h*scale)),fps:low?20:compact?24:30};
}

export async function createWildfireRenderer({world, passage, asset, compact, onFailure}) {
  const chapterBackground = passage.querySelector('[data-background-art]');
  const characterMaskURL = chapterBackground?.dataset.characterMask;
  const sceneSurface = chapterBackground?.parentElement;
  if (world.dataset.effectLayer !== 'background' || !chapterBackground) throw new Error('Missing background layer');
  const canvas = document.createElement('canvas');
  canvas.className = 'wildfire-canvas';
  canvas.dataset.effectLayer = 'background';
  canvas.dataset.characterMask = characterMaskURL ? 'enabled' : 'none';
  canvas.setAttribute('aria-hidden','true');
  canvas.hidden = true;
  world.insertBefore(canvas, world.querySelector('.atmo-vignette'));
  const gl = canvas.getContext('webgl', {alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power',preserveDrawingBuffer:false});
  if (!gl) { canvas.remove(); throw new Error('WebGL unavailable'); }
  const textures = [];
  let program, buffer, disposed = false, active = false, contextLost = false;
  let frame = 0, lastDraw = 0, elapsed = 0, previous = 0, draws = 0;
  let slowFrames = 0, sampledFrames = 0, low = false, budget;
  let width = 1, height = 1, passageTop = 0, passageHeight = 1;
  let state = {char:0,heat:0,fire:0}, sceneMode = false;
  const uniforms = {};

  function shader(type,source) {
    const item = gl.createShader(type);
    gl.shaderSource(item,source); gl.compileShader(item);
    return item;
  }
  function texture(image, unit, repeat = false) {
    const item = gl.createTexture(); textures.push(item);
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D,item);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    return item;
  }
  async function load(url) {
    const image = new Image(); image.decoding = 'async'; image.src = url;
    await image.decode(); return image;
  }
  function softenBackground(image) {
    // Blur the three background textures once, before upload. The live flame pass
    // keeps its existing sample count and does not blur text, media or fire details.
    const softened = document.createElement('canvas');
    softened.width = image.naturalWidth; softened.height = image.naturalHeight;
    const context = softened.getContext('2d');
    if (!context || !('filter' in context)) return image;
    context.drawImage(image,0,0);
    context.filter = 'blur(1.25px)';
    context.drawImage(image,0,0);
    return softened;
  }
  function release() {
    for (const item of textures) gl.deleteTexture(item);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
  }
  function setActive(value) {
    const next = Boolean(value) && !disposed && !contextLost;
    if (next === active) return;
    active = next;
    if (!active) {
      canvas.hidden = true;
      document.body.classList.remove('wildfire-gpu');
      world.dataset.gpu = 'inactive';
    }
    canvas.dataset.running = String(active);
    if (!active) {
      cancelAnimationFrame(frame); frame = 0; lastDraw = 0; previous = 0;
      canvas.dataset.frames = String(draws);
    } else if (!frame) frame = requestAnimationFrame(tick);
  }
  function fail() {
    contextLost = true; setActive(false); onFailure?.();
  }
  canvas.addEventListener('webglcontextlost',event => { event.preventDefault(); fail(); });
  // Keep the stable CSS fallback after a lost context; don't repeatedly allocate GPU resources.
  try {
    const vs = shader(gl.VERTEX_SHADER,vertexSource);
    const fs = shader(gl.FRAGMENT_SHADER,fragmentSource);
    program = gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs);
    gl.bindAttribLocation(program,0,'a_position'); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    for (const name of ['view','backgroundRatios','time','char','heat','fire','sceneMode','artPosition','forest','charred','art','fireTex','noise','characterMask']) {
      uniforms[name] = gl.getUniformLocation(program,'u_'+name);
    }
    const size = compact()?1024:1600;
    const images = await Promise.all([
      load(world.querySelector('.atmo-forest').currentSrc || asset('spring-forest-day-'+size+'.webp','game-backgrounds')),
      load(asset('suito-casting-background-'+size+'.webp','game-backgrounds')),
      load(chapterBackground.currentSrc || asset('cg_conflict_fire-'+size+'.webp')),
      load(asset('effect_fire-512.webp')),
      characterMaskURL ? load(new URL(characterMaskURL,document.baseURI).href) : Promise.resolve(null)
    ]);
    if (contextLost) throw new Error('Context lost during asset loading');
    images.slice(0,4).forEach((image,i) => texture(i<3?softenBackground(image):image,i,i===3));
    const neutralMask = document.createElement('canvas');
    neutralMask.width = neutralMask.height = 1;
    texture(images[4] || neutralMask,5);
    gl.uniform2f(uniforms.backgroundRatios,images[0].naturalWidth/images[0].naturalHeight,images[1].naturalWidth/images[1].naturalHeight);
    // One deterministic 256px noise texture; no image downloads or per-frame CPU noise.
    const data = new Uint8Array(256*256*4);
    let seed = 712367;
    for (let i=0;i<data.length;i+=4) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      data[i] = data[i+1] = data[i+2] = seed & 255; data[i+3] = 255;
    }
    const item = gl.createTexture(); textures.push(item);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D,item);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
    ['forest','charred','art','fireTex','noise','characterMask'].forEach((name,i) => gl.uniform1i(uniforms[name],i));
    gl.uniform1f(uniforms.sceneMode,0);
  } catch (error) { release(); canvas.remove(); throw error; }

  function measure() {
    const rect = passage.getBoundingClientRect();
    passageTop = rect.top + window.scrollY; passageHeight = rect.height;
    sizeSurface();
  }
  function sizeSurface() {
    width = world.clientWidth; height = sceneMode ? passageHeight : world.clientHeight;
    budget = renderBudget(width,height,compact(),low);
    // Disclosures and work tabs change page height, not the background's render surface.
    if (canvas.width !== budget.width || canvas.height !== budget.height) {
      canvas.width = budget.width; canvas.height = budget.height;
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    gl.uniform2f(uniforms.view,width,height);
    gl.uniform1f(uniforms.artPosition,compact()?.58:.5);
    canvas.dataset.resolution = canvas.width+'×'+canvas.height;
    canvas.dataset.fpsCap = String(budget.fps);
    canvas.dataset.quality = low?'economy':'balanced';
  }
  function tick(now) {
    frame = 0;
    if (!active || document.hidden || contextLost) { setActive(false); return; }
    if (previous) elapsed += Math.min((now-previous)/1000,.08);
    previous = now;
    const interval = 1000 / budget.fps;
    if (!lastDraw || now-lastDraw >= interval-1) {
      if (lastDraw) {
        sampledFrames++;
        if (now-lastDraw > interval * 1.6) slowFrames++;
      }
      const delta = now-lastDraw;
      lastDraw = now - (delta >= interval ? delta % interval : 0);
      gl.uniform1f(uniforms.time,elapsed);
      gl.uniform1f(uniforms.char,state.char); gl.uniform1f(uniforms.heat,state.heat); gl.uniform1f(uniforms.fire,state.fire);
      gl.drawArrays(gl.TRIANGLES,0,3);
      if (canvas.hidden) {
        canvas.hidden = false;
        document.body.classList.add('wildfire-gpu');
        world.dataset.gpu = sceneMode ? 'inactive' : 'active';
      }
      draws++;
      if (draws % 30 === 0) canvas.dataset.frames = String(draws);
      if (!low && sampledFrames >= 90) {
        if (slowFrames > 28) { low = true; measure(); }
        sampledFrames = slowFrames = 0;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  measure();
  return {
    update(next,y) {
      state=next;
      const inScene = y + window.innerHeight > passageTop && y < passageTop + passageHeight;
      if (inScene === sceneMode) return;
      sceneMode=inScene; canvas.hidden=true;
      if (sceneMode) sceneSurface.append(canvas);
      else world.insertBefore(canvas,world.querySelector('.atmo-vignette'));
      canvas.dataset.surface=sceneMode?'chapter':'world';
      gl.uniform1f(uniforms.sceneMode,sceneMode?1:0);
      world.dataset.gpu='inactive';
      sizeSurface(); lastDraw=0;
    },
    measure,
    setActive,
    destroy() { disposed=true; setActive(false); release(); canvas.remove(); }
  };
}
