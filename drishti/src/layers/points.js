// Dots for public outlets and health centres, for the picked state.
import { onThemeChange, currentTheme } from '../theme.js';

export const POINT_STYLES = {
  jak: { color: '#139a74', size: 4.5, label: 'Jan Aushadhi Kendra' },
  pharmacy: { color: '#d4860b', size: 3.5, label: 'Pharmacy (OpenStreetMap)' },
  hospital: { color: '#c23b2f', size: 3.5, label: 'Hospital (OpenStreetMap)' },
  gov: { color: '#2d68d8', size: 3.5, label: 'Government health centre' },
};

export function addPoints(map, kind, rows, makeInfo) {
  const style = POINT_STYLES[kind];
  const id = `dots-${kind}`;
  let list = [];
  const toFc = (r) => ({ type: 'FeatureCollection', features: r.map((row, i) => ({ type: 'Feature', properties: { i }, geometry: { type: 'Point', coordinates: [row[0], row[1]] } })) });
  map.addSource(id, { type: 'geojson', data: toFc([]) });
  const stroke = () => (currentTheme() === 'dark' ? '#0e1316' : '#ffffff');
  map.addLayer({
    id, type: 'circle', source: id, layout: { visibility: 'none' },
    paint: {
      'circle-color': style.color,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, style.size * 0.7, 9, style.size * 1.4, 13, style.size * 2.2],
      'circle-stroke-color': stroke(),
      'circle-stroke-width': 0.8,
    },
  });
  onThemeChange(() => map.setPaintProperty(id, 'circle-stroke-color', stroke()));
  map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''));

  const api = {
    layerId: id,
    get count() {
      return list.length;
    },
    info: (i) => makeInfo(list[i]),
    setRows(rows2) {
      list = rows2 || [];
      map.getSource(id).setData(toFc(list));
    },
    setVisible(on) {
      map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    },
  };
  api.setRows(rows);
  return api;
}
