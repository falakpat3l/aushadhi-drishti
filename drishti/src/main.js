import './style.css';
import { setupTheme } from './theme.js';
import { createMap } from './map.js';
import { setupPanel } from './ui.js';
import { registerLayers } from './layers/index.js';
import { setupAsk } from './ask.js';

setupTheme();
const ui = setupPanel();
const map = createMap(document.getElementById('map'));

// The ask box shows once the data has loaded.
document.getElementById('ask').hidden = true;

// Handy for debugging in the browser console and for the browser tests.
window.__ad = { map, ui, ready: false };

map.on('load', () => {
  registerLayers(map, ui)
    .then((layers) => {
      window.__ad.layers = layers;
      window.__ad.ask = setupAsk(ui, layers);
      window.__ad.ready = true;
    })
    .catch((err) => {
      ui.layerList.innerHTML = `<p class="note">Map data could not load: ${String(err.message || err)}</p>`;
      window.__ad.ready = true;
      console.error(err);
    });
});
