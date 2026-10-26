// Dots for public outlets and health centres. Drawn as one light batch each.
import { PointPrimitiveCollection, Cartesian3, Color, NearFarScalar } from 'cesium';

export const POINT_STYLES = {
  jak: { color: '#3ed6b0', size: 8, label: 'Jan Aushadhi Kendra' },
  pharmacy: { color: '#f2b84b', size: 5, label: 'Pharmacy (OpenStreetMap)' },
  hospital: { color: '#ef6a5b', size: 6, label: 'Hospital (OpenStreetMap)' },
  gov: { color: '#8fb8ff', size: 5, label: 'Government health centre' },
};

export function addPoints(viewer, kind, rows, makeInfo) {
  const style = POINT_STYLES[kind];
  const col = viewer.scene.primitives.add(new PointPrimitiveCollection());
  const color = Color.fromCssColorString(style.color);
  let count = 0;
  const fill = (list) => {
    col.removeAll();
    count = list.length;
    for (const r of list) {
      col.add({
        position: Cartesian3.fromDegrees(r[0], r[1], 1500),
        pixelSize: style.size,
        color,
        outlineColor: Color.fromCssColorString('#0b1117'),
        outlineWidth: 1,
        scaleByDistance: new NearFarScalar(2e4, 1.6, 4e6, 0.7),
        id: { kind: 'point', layer: kind, info: () => makeInfo(r) },
      });
    }
    viewer.scene.requestRender();
  };
  fill(rows);
  col.show = false;
  return {
    get count() {
      return count;
    },
    setRows: fill,
    setVisible(on) {
      col.show = on;
      viewer.scene.requestRender();
    },
  };
}
