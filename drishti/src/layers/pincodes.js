// Pincode areas, loaded only when switched on. Coloured by how many public
// outlets (Jan Aushadhi Kendras plus pharmacies mapped in OSM) each has.
import { GeoJsonDataSource, Color, ColorMaterialProperty, ConstantProperty } from 'cesium';
import { loadJSON } from '../data.js';
import { classBreaks, classOf } from './districts.js';

const PAL = ['#1a2a33', '#1d5560', '#26807e', '#33ad97', '#5fdcb5'];

export function pincodeLayer(viewer, slug) {
  let ds = null;
  async function ensure() {
    if (ds) return ds;
    const fc = await loadJSON(`${slug}/pincodes.geojson`);
    ds = await GeoJsonDataSource.load(fc, { fill: Color.TRANSPARENT, stroke: Color.WHITE, strokeWidth: 1 });
    const value = (p) => p.jak + p.osm_pharmacy;
    const breaks = classBreaks(fc.features.map((f) => value(f.properties)).filter((v) => v > 0));
    const byPin = new Map(fc.features.map((f) => [f.properties.pincode, f.properties]));
    ds.entities.values.forEach((e) => {
      const p = byPin.get(e.properties.pincode.getValue());
      e.ad = { kind: 'pincode', props: p };
      if (!e.polygon) return;
      const v = value(p);
      const c = v > 0 ? classOf(v, breaks) : -1;
      e.polygon.material = new ColorMaterialProperty(c < 0 ? Color.fromCssColorString('#0b1117').withAlpha(0.15) : Color.fromCssColorString(PAL[c]).withAlpha(0.6));
      e.polygon.outline = new ConstantProperty(true);
      e.polygon.outlineColor = new ConstantProperty(Color.fromCssColorString('#7d8f9c').withAlpha(0.5));
    });
    viewer.dataSources.add(ds);
    return ds;
  }
  return {
    async setVisible(on) {
      if (on) await ensure();
      if (ds) ds.show = on;
      viewer.scene.requestRender();
    },
  };
}
