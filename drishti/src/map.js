// The map: a CesiumJS globe (the same engine God's Eye View uses),
// set up to need no API keys and no Cesium ion account.
import { Viewer, EllipsoidTerrainProvider, SceneMode, Cartesian3, Rectangle, Color } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { addCredit } from './credits.js';

// Roughly the box around India, used for the start view and "reset".
export const INDIA = Rectangle.fromDegrees(67.5, 6.0, 98.0, 36.5);

export function createMap(container) {
  const narrow = window.innerWidth <= 700;

  // No street-map tiles: the common free ones draw India's borders the
  // international way. The background map is drawn from official boundary
  // data instead (layers/basemap.js).
  const viewer = new Viewer(container, {
    baseLayer: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    sceneMode: narrow ? SceneMode.SCENE2D : SceneMode.SCENE3D,
    creditContainer: document.createElement('div'), // we show credits ourselves
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });

  const scene = viewer.scene;
  scene.backgroundColor = Color.fromCssColorString('#0b1117');
  scene.globe.baseColor = Color.fromCssColorString('#0f1c26'); // sea
  scene.skyAtmosphere.show = false;
  scene.fog.enabled = false;
  if (scene.skyBox) scene.skyBox.show = false;
  if (scene.sun) scene.sun.show = false;
  if (scene.moon) scene.moon.show = false;

  addCredit('engine', 'Map engine <a href="https://cesium.com/platform/cesiumjs/" target="_blank" rel="noopener">CesiumJS</a>');
  addCredit('gev', 'Based on <a href="https://github.com/bilawalsidhu/gods-eye-view" target="_blank" rel="noopener">God\'s Eye View</a> by Bilawal Sidhu');
  resetView(viewer, 0);
  return viewer;
}

export function resetView(viewer, duration = 1.2) {
  if (viewer.scene.mode === SceneMode.SCENE2D) {
    // In the flat phone view, the camera height sets how wide the view is.
    viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(82.6, 22.5, 4.2e6), duration });
    return;
  }
  viewer.camera.flyTo({ destination: INDIA, duration });
}

export function flyToDegrees(viewer, lon, lat, heightMeters = 250000) {
  viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(lon, lat, heightMeters), duration: 1.2 });
}
