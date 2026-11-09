// C-version title artwork for the hero and footer. Navigation uses regular text.
// Path is relative to this module, e.g. './title/cuidu-title.svg'. Leave empty for text placeholders.
export const titleArtworkSource = './brand/cuidu-wordmark.svg';

export async function applyTitleArtwork(source = titleArtworkSource, root = document) {
  const slots = [...root.querySelectorAll('[data-title-slot]')];
  const notes = [...root.querySelectorAll('[data-title-placeholder]')];
  if (!source) {
    for (const slot of slots) {
      slot.querySelector('.title-artwork')?.remove();
      slot.dataset.titleState = 'placeholder';
    }
    notes.forEach(note => { note.hidden = false; });
    return false;
  }
  // Decode before replacing anything: a missing file keeps the current title readable.
  const artwork = root.createElement('img');
  artwork.className = 'title-artwork';
  artwork.alt = '';
  artwork.setAttribute('aria-hidden','true');
  artwork.decoding = 'async';
  artwork.src = new URL(source, import.meta.url).href;
  try { await artwork.decode(); }
  catch { return false; }
  for (const slot of slots) {
    slot.querySelector('.title-artwork')?.remove();
    slot.append(artwork.cloneNode());
    slot.dataset.titleState = 'ready';
  }
  notes.forEach(note => { note.hidden = true; });
  return true;
}
