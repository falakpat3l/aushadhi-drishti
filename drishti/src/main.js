import './cesiumBase.js';
import './style.css';
import { createMap } from './map.js';
import { setupPanel } from './ui.js';
import { registerLayers } from './layers/index.js';

const header = document.querySelector('.topbar');
const syncTop = () => document.documentElement.style.setProperty('--top', `${header.offsetHeight}px`);
syncTop();
window.addEventListener('resize', syncTop);

const viewer = createMap(document.getElementById('map'));
const ui = setupPanel();

// The ask box arrives in Phase 5.
document.getElementById('ask').hidden = true;

// Handy for debugging in the browser console and for the browser tests.
window.__ad = { viewer, ui, ready: false };

registerLayers(viewer, ui)
  .then((layers) => {
    window.__ad.layers = layers;
    window.__ad.ready = true;
  })
  .catch((err) => {
    ui.layerList.innerHTML = `<p class="note">Map data could not load: ${String(err.message || err)}</p>`;
    window.__ad.ready = true;
    console.error(err);
  });
