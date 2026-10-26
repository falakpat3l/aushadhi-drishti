import './style.css';
import { setupTheme } from './theme.js';
import { createMap } from './map.js';
import { setupPanel } from './ui.js';
import { registerLayers } from './layers/index.js';
import { setupAsk } from './ask.js';
import { startWorld } from './world.js';
import { arrivingFlight } from './countries.js';

setupTheme();
const ui = setupPanel();
const flight = arrivingFlight();
const map = createMap(document.getElementById('map'), flight);
window.__flight = flight;

// The ask box shows once the data has loaded.
document.getElementById('ask').hidden = true;

// Handy for debugging in the browser console and for the browser tests.
window.__ad = { map, ui, ready: false };

// ?country=sg or ?country=nz opens another country; no country means India.
const country = new URLSearchParams(window.location.search).get('country');

map.on('load', () => {
  if (['sg', 'nz', 'au', 'eu'].includes(country)) {
    document.querySelector('.tag').textContent = 'medicine access';
    startWorld(map, ui, country)
      .then((w) => {
        window.__ad.world = w;
        window.__ad.ready = true;
      })
      .catch((err) => {
        ui.layerList.innerHTML = `<p class="note">This country's data could not load: ${String(err.message || err)}</p>`;
        window.__ad.ready = true;
        console.error(err);
      });
    return;
  }
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
