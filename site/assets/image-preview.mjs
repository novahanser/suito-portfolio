const dialog = document.querySelector('#image-preview');

if (dialog && typeof dialog.showModal === 'function') {
  const root = document.documentElement;
  const title = dialog.querySelector('#preview-title');
  const caption = dialog.querySelector('#preview-caption');
  const stage = dialog.querySelector('.preview-stage');
  const status = dialog.querySelector('.preview-status');
  const closeButton = dialog.querySelector('.preview-close');
  const zoomButton = dialog.querySelector('.preview-zoom');
  let image = dialog.querySelector('.preview-image');
  let opener;
  let request = 0;
  let pointerStartedOutside = false;

  function resetZoom() {
    dialog.dataset.zoomed = 'false';
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.textContent = 'Zoom in';
    stage.scrollTo({top:0, left:0, behavior:'instant'});
  }

  function closePreview() {
    if (dialog.open) dialog.close();
  }

  async function openPreview(trigger) {
    const url = trigger.dataset.previewSrc || trigger.href;
    if (!url) return;
    const figure = trigger.closest('figure');
    const thumbnail = trigger.querySelector('img') || figure?.querySelector('img');
    const heading = figure?.querySelector('.figure-heading');
    const figureLabel = heading ? [...heading.children].map(node => node.textContent.trim()).join(' · ') : '';
    const label = trigger.dataset.previewTitle || figureLabel || thumbnail?.alt || trigger.textContent.trim();
    const description = trigger.dataset.previewCaption ?? figure?.querySelector('figcaption')?.innerText.trim() ?? '';
    const current = ++request;
    opener = trigger;
    title.textContent = label || 'Image preview';
    dialog.dataset.surface = trigger.dataset.previewSurface || 'dark';
    dialog.style.setProperty('--preview-ratio', thumbnail?.naturalWidth ? `${thumbnail.naturalWidth} / ${thumbnail.naturalHeight}` : '16 / 9');
    caption.textContent = description;
    caption.hidden = !description;
    if (description) dialog.setAttribute('aria-describedby', 'preview-caption');
    else dialog.removeAttribute('aria-describedby');
    image.hidden = true;
    image.removeAttribute('src');
    status.textContent = 'Loading image…';
    status.hidden = false;
    zoomButton.disabled = true;
    resetZoom();
    root.classList.add('image-preview-open');
    dialog.showModal();
    closeButton.focus({preventScroll:true});

    // Only the requested image is loaded at full size. Each open owns its result,
    // so closing or quickly opening another figure cannot show an older image.
    const next = new Image();
    next.className = 'preview-image';
    next.decoding = 'async';
    next.alt = thumbnail?.alt || label || 'Preview image';
    next.src = url;
    try {
      await next.decode();
    } catch {
      if (current !== request || !dialog.open) return;
      status.textContent = 'This image could not be loaded. Close the preview and try again.';
      return;
    }
    if (current !== request || !dialog.open) return;
    next.style.setProperty('--preview-natural-width', `${next.naturalWidth}px`);
    dialog.style.setProperty('--preview-ratio', `${next.naturalWidth} / ${next.naturalHeight}`);
    image.replaceWith(next);
    image = next;
    status.hidden = true;
    zoomButton.disabled = false;
  }

  document.querySelectorAll('[data-image-preview]').forEach(trigger => {
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'image-preview');
    trigger.removeAttribute('target');
    if (trigger instanceof HTMLButtonElement) trigger.hidden = false;
    trigger.addEventListener('click', event => {
      // Keep deliberate browser shortcuts available; ordinary clicks stay here.
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openPreview(trigger);
    });
  });

  closeButton.addEventListener('click', closePreview);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closePreview();
  });
  function isOutside(event) {
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }
  dialog.addEventListener('pointerdown', event => {
    pointerStartedOutside = event.target === dialog && isOutside(event);
  });
  dialog.addEventListener('click', event => {
    if (pointerStartedOutside && event.target === dialog && isOutside(event)) closePreview();
    pointerStartedOutside = false;
  });
  zoomButton.addEventListener('click', () => {
    const zoomed = dialog.dataset.zoomed !== 'true';
    dialog.dataset.zoomed = String(zoomed);
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? 'Fit image' : 'Zoom in';
    stage.scrollTo({top:0, left:0, behavior:'instant'});
  });
  dialog.addEventListener('close', () => {
    ++request;
    pointerStartedOutside = false;
    root.classList.remove('image-preview-open');
    image.removeAttribute('src');
    image.hidden = true;
    resetZoom();
    if (opener?.isConnected) opener.focus({preventScroll:true});
  });
}
