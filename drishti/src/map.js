// The map: a CesiumJS globe (the same engine God's Eye View uses),
// set up to need no API keys and no Cesium ion account.
import {
  Viewer,
  ImageryLayer,
  OpenStreetMapImageryProvider,
  EllipsoidTerrainProvider,
  SceneMode,
  Cartesian3,
  Rectangle,
  Credit,
  Color,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { addCredit } from './credits.js';

// Roughly the box around India, used for the start view and "reset".
export const INDIA = Rectangle.fromDegrees(67.5, 6.0, 98.0, 36.5);

export function createMap(container) {
  const narrow = window.innerWidth <= 700;

  // OpenStreetMap standard tiles, darkened to suit the theme.
  // Light use with visible credit, as the OSM tile policy asks.
  const osm = new OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/',
    credit: new Credit(
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
      true,
    ),
  });
  const base = new ImageryLayer(osm);
  base.brightness = 0.55;
  base.contrast = 1.1;
  base.saturation = 0.35;
  base.gamma = 1.1;

  const viewer = new Viewer(container, {
    baseLayer: base,
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
  scene.globe.baseColor = Color.fromCssColorString('#15222c');
  scene.skyAtmosphere.show = false;
  scene.fog.enabled = false;
  if (scene.skyBox) scene.skyBox.show = false;
  if (scene.sun) scene.sun.show = false;
  if (scene.moon) scene.moon.show = false;

  addCredit('osm-tiles', 'Map tiles © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>');
  addCredit('engine', 'Map engine <a href="https://cesium.com/platform/cesiumjs/" target="_blank" rel="noopener">CesiumJS</a>');
  addCredit('gev', 'Based on <a href="https://github.com/bilawalsidhu/gods-eye-view" target="_blank" rel="noopener">God\'s Eye View</a> by Bilawal Sidhu');
  resetView(viewer, 0);
  return viewer;
}

export function resetView(viewer, duration = 1.2) {
  viewer.camera.flyTo({ destination: INDIA, duration });
}

export function flyToDegrees(viewer, lon, lat, heightMeters = 250000) {
  viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(lon, lat, heightMeters), duration: 1.2 });
}
