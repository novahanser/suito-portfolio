// Preview interactions stay within this portfolio; no social service is contacted.
document.querySelectorAll('.platform-shell').forEach(shell => {
  const feedback = shell.querySelector('.platform-feedback');
  function announce(message) {
    if (feedback) feedback.textContent = message;
  }
  for (const kind of ['like', 'save']) {
    shell.querySelectorAll(`[data-preview-${kind}]`).forEach(button => {
      button.addEventListener('click', () => {
        const pressed = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(pressed));
        announce(kind === 'like' ? (pressed ? 'Liked in this preview.' : 'Like removed.') : (pressed ? 'Saved in this preview.' : 'Save removed.'));
      });
    });
  }
  shell.querySelectorAll('[data-preview-share]').forEach(button => {
    button.addEventListener('click', async () => {
      const url = new URL(location.href);
      url.search = '';
      url.hash = shell.closest('.work-panel').id;
      try {
        await navigator.clipboard.writeText(url.href);
        announce('Preview link copied.');
      } catch {
        announce('Copy the link to this preview:');
        const link = document.createElement('a');
        link.href = url.href;
        link.textContent = url.href;
        feedback?.append(' ', link);
      }
    });
  });
});
