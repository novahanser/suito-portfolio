// Normalised stop interpolation is shared by the low-motion / older-browser path.
export function interpolate(progress, stops) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) {
      const [a, from] = stops[i-1], [b, to] = stops[i];
      return from + (to-from) * (p-a) / (b-a);
    }
  }
  return stops.at(-1)[1];
}
export function atmosphereAt(progress) {
  return {
    char: interpolate(progress, [[0,0],[.1,0],[.42,.58],[.75,.94],[1,.94]]),
    heat: interpolate(progress, [[0,0],[.08,0],[.35,.45],[.65,.9],[.82,.55],[1,.24]]),
    fire: interpolate(progress, [[0,0],[.16,0],[.4,.32],[.65,.78],[.82,.38],[1,.08]]),
    fireY: interpolate(progress, [[0,34],[.16,34],[.4,20],[.7,4],[1,-3]]),
    embers: interpolate(progress, [[0,0],[.12,0],[.36,.5],[.75,.85],[1,.45]]),
    embersY: interpolate(progress, [[0,12],[.12,12],[.36,-1],[.75,-20],[1,-32]])
  };
}

// Chapter anchors keep the visual arc stable as detailed evidence expands.
export function chapterProgress(y, anchors) {
  if (!Number.isFinite(y) || y <= 0) return 0;
  for (let i=1;i<anchors.length;i++) {
    const [a,from]=anchors[i-1], [b,to]=anchors[i];
    if (y <= b) return from + (to-from) * Math.max(0,Math.min(1,(y-a)/Math.max(1,b-a)));
  }
  return 1;
}
export function paletteAt(progress) {
  return progress < .2 ? 'forest' : progress < .36 ? 'kindling' : progress < .7 ? 'flame' : progress < .88 ? 'afterburn' : 'ember';
}

// UI colours move continuously, independent of the background flame intensity.
// The middle swatch is sampled from the user's reference: #582d2a.
const paletteKeys = ['ground','deep','surface','paper','ink','light','muted','accent','line','journal-ground','stage-band'];
const paletteStops = [
  [.12, ['#10251f','#0b1b17','#1c352c','#e9ece3','#20352b','#f2f3e9','#bacbc0','#bce7cf','#a6c2ad40','#102018','#1c352c']],
  [.52, ['#351d1b','#582d2a','#633733','#f0e6dc','#3b2724','#f4eae0','#dec5ba','#e7c0a4','#d1ab9740','#301c1a','#582d2a']],
  [.70, ['#351d1b','#582d2a','#633733','#f0e6dc','#3b2724','#f4eae0','#dec5ba','#e7c0a4','#d1ab9740','#301c1a','#582d2a']],
  [1,   ['#1e1110','#241412','#35201d','#eaddd2','#2e1c19','#f0e3d7','#ccb0a3','#d7a88b','#bd938044','#1e1110','#3b211e']]
].map(([position,colours]) => [position,colours.map(hex => {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value,16));
  if (channels.length === 3) channels.push(255);
  return channels;
})]);

export function paletteColorsAt(progress) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  let left = paletteStops[0], right = left;
  for (const stop of paletteStops.slice(1)) {
    right = stop;
    if (p <= stop[0]) break;
    left = stop;
  }
  const fraction = Math.max(0,Math.min(1,(p-left[0])/Math.max(.001,right[0]-left[0])));
  const blend = fraction * fraction * (3 - 2 * fraction);
  return Object.fromEntries(paletteKeys.map((key,index) => [key,'#'+left[1][index].map((value,channel) =>
    Math.round(value + (right[1][index][channel]-value)*blend).toString(16).padStart(2,'0')
  ).join('')]));
}
