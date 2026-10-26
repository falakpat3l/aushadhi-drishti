// The background map, drawn from official boundary data so that India looks
// the way the Government of India shows it (all of Jammu and Kashmir, Ladakh
// and Arunachal Pradesh inside India). Built by pipeline/basemap.py.
import {
  GeoJsonDataSource, Color, ConstantProperty, ColorMaterialProperty, PolylineCollection, Material,
  Cartesian3, LabelCollection, LabelStyle, NearFarScalar, VerticalOrigin, Cartesian2,
} from 'cesium';
import { addCredit } from '../credits.js';

export const HEIGHT = { land: 0, districts: 300, pincodes: 600, lines: 1200 };

const LAND = '#1f2d37';
const NEIGHBOUR = '#18222a';

export async function addBasemap(viewer) {
  const res = await fetch(`${import.meta.env.BASE_URL}basemap/india-basemap.json`);
  const data = await res.json();
  const scene = viewer.scene;

  // Neighbouring countries, with India's outline already cut out of them.
  const neighbours = await GeoJsonDataSource.load(
    { type: 'FeatureCollection', features: data.neighbours.map((n) => ({ type: 'Feature', properties: { name: n.name }, geometry: n.geometry })) },
    { fill: Color.fromCssColorString(NEIGHBOUR), stroke: Color.TRANSPARENT },
  );
  // India's land, under the district colours.
  const land = await GeoJsonDataSource.load(
    { type: 'Feature', properties: {}, geometry: data.india },
    { fill: Color.fromCssColorString(LAND), stroke: Color.TRANSPARENT },
  );
  for (const ds of [neighbours, land]) {
    for (const e of ds.entities.values) {
      if (!e.polygon) continue;
      e.polygon.height = new ConstantProperty(HEIGHT.land);
      e.polygon.outline = new ConstantProperty(false);
    }
    viewer.dataSources.add(ds);
  }

  // Lines: India's border (bold), state lines (thin), neighbours' borders (faint).
  const lines = scene.primitives.add(new PolylineCollection());
  const addLines = (geom, width, css) => {
    const material = Material.fromType('Color', { color: Color.fromCssColorString(css) });
    for (const ring of rings(geom)) {
      if (ring.length < 2) continue;
      lines.add({ positions: Cartesian3.fromDegreesArrayHeights(ring.flatMap(([x, y]) => [x, y, HEIGHT.lines])), width, material });
    }
  };
  for (const n of data.neighbours) addLines(n.geometry, 1, '#33424d');
  addLines(data.state_lines, 1.2, 'rgba(215,226,234,0.55)');
  addLines(data.india, 2.2, '#f1f5f8');

  // Names: states, neighbours, seas, cities. Bigger places show from further away.
  const labels = scene.primitives.add(new LabelCollection());
  const limits = [];
  for (const [lon, lat, name, kind, size] of data.labels) {
    if (kind === 'country' && (lon < 58 || lon > 102 || lat < 0 || lat > 42)) continue; // only near neighbours
    const style = LABEL_STYLES[kind];
    let far = style.far;
    if (kind === 'city') far = size <= 2 ? 2.5e6 : size <= 5 ? 1.2e6 : 5e5;
    if (kind === 'state') far = size > 8 ? 5.5e6 : size > 1 ? 3e6 : 9e5;
    limits.push(far);
    labels.add({
      position: Cartesian3.fromDegrees(lon, lat, HEIGHT.lines + 10),
      text: name,
      font: style.font,
      fillColor: Color.fromCssColorString(style.color),
      outlineColor: Color.fromCssColorString('#0b1117'),
      outlineWidth: 3,
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: kind === 'city' ? VerticalOrigin.BOTTOM : VerticalOrigin.CENTER,
      pixelOffset: kind === 'city' ? new Cartesian2(0, -4) : Cartesian2.ZERO,
      scaleByDistance: new NearFarScalar(3e5, 1.1, 8e6, 0.8),
      disableDepthTestDistance: Number.POSITIVE_INFINITY, // always on top of the colours
    });
  }

  // Show bigger places from further away. Done by camera height, which works
  // the same in the 3D globe and the flat phone view.
  const camera = viewer.camera;
  const fitLabels = () => {
    const h = camera.positionCartographic.height;
    for (let i = 0; i < labels.length; i += 1) labels.get(i).show = h < limits[i];
    scene.requestRender();
  };
  camera.percentageChanged = 0.05;
  camera.changed.addEventListener(fitLabels);
  camera.moveEnd.addEventListener(fitLabels);
  fitLabels();

  addCredit('basemap', 'Map of India: Survey of India outline (CC BY 4.0, via DataMeet); neighbours and cities: Natural Earth');
  scene.requestRender();
  return {
    labels,
    setLabels(on) {
      labels.show = on;
      scene.requestRender();
    },
  };
}

const LABEL_STYLES = {
  state: { font: '600 13px Inter, sans-serif', color: '#e6edf2', far: 4e6 },
  country: { font: '500 13px Inter, sans-serif', color: '#7f909c', far: 7e6 },
  sea: { font: 'italic 13px Inter, sans-serif', color: '#5d7b8f', far: 7e6 },
  city: { font: '12px Inter, sans-serif', color: '#c9d6df', far: 1e6 },
};

function rings(geom) {
  switch (geom.type) {
    case 'Polygon':
      return geom.coordinates;
    case 'MultiPolygon':
      return geom.coordinates.flat();
    case 'LineString':
      return [geom.coordinates];
    case 'MultiLineString':
      return geom.coordinates;
    default:
      return [];
  }
}
