// Side panel (desktop) or bottom sheet (phones).
export function setupPanel() {
  const panel = document.getElementById('panel');
  const toggle = document.getElementById('panel-toggle');
  const narrow = window.innerWidth <= 700;

  const setOpen = (open) => {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  setOpen(!narrow);
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));

  return {
    open: () => setOpen(true),
    layerList: document.getElementById('layer-list'),
    legend: document.getElementById('legend'),
    showDetail(title, html) {
      document.getElementById('detail-title').textContent = title;
      document.getElementById('detail').innerHTML = html;
      document.getElementById('detail-section').hidden = false;
      setOpen(true);
    },
    showAnswer(html) {
      document.getElementById('answer').innerHTML = html;
      document.getElementById('answer-section').hidden = false;
      setOpen(true);
    },
  };
}

// Escape text before putting it into HTML.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
