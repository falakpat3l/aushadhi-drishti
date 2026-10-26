// Side panel (desktop) or bottom sheet (phones).
export function setupPanel() {
  const panel = document.getElementById('panel');
  const toggle = document.getElementById('panel-toggle');
  const narrow = window.innerWidth <= 700;

  const setOpen = (open) => {
    panel.classList.toggle('open', open);
    document.body.classList.toggle('panel-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Panel';
  };
  setOpen(!narrow);
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));

  return {
    open: () => setOpen(true),
    layerList: document.getElementById('layer-list'),
    legend: document.getElementById('legend'),
    crumbs: document.getElementById('crumbs'),
    showDetail(title, html) {
      document.getElementById('detail-title').textContent = title;
      document.getElementById('detail').innerHTML = html;
      const sec = document.getElementById('detail-section');
      sec.hidden = false;
      setOpen(true);
      panel.scrollTo({ top: sec.offsetTop - 12, behavior: 'smooth' });
    },
    showAnswer(html) {
      document.getElementById('answer').innerHTML = html;
      const sec = document.getElementById('answer-section');
      sec.hidden = false;
      setOpen(true);
      panel.scrollTo({ top: sec.offsetTop - 12, behavior: 'smooth' });
    },
  };
}

// Escape text before putting it into HTML.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
