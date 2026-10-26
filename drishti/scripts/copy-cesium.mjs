// NOT USED since version 0.8 (the map moved from CesiumJS to MapLibre). Kept so nothing is deleted.
// Copies the static files Cesium needs at run time (web workers, images,
// widget styles) into public/cesium, so Vite serves and ships them.
// public/cesium is git-ignored: it is rebuilt from node_modules each time.
import { cpSync } from 'node:fs';

const from = 'node_modules/cesium/Build/Cesium';
const to = 'public/cesium';
for (const dir of ['Workers', 'ThirdParty', 'Assets', 'Widgets']) {
  cpSync(`${from}/${dir}`, `${to}/${dir}`, { recursive: true, force: true });
}
console.log('Cesium assets copied to public/cesium');
