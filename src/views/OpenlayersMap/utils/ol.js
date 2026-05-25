import "ol/ol.css";
import { Map, View, Feature } from "ol";
import WMTSTileGrid from "ol/tilegrid/WMTS";
import { get as getProjection } from "ol/proj";
import { WMTS, Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { Point, LineString, MultiLineString } from "ol/geom";
import {
  Style,
  Fill,
  Stroke,
  Text,
  Circle as CircleStyle,
  Icon,
} from "ol/style";
import { getWidth } from "ol/extent";

let olMapInstance = null;

// 初始化OpenLayers地图 基于4326坐标系的WMTS图层
export function initOpenlayersMap(targetDom) {
  const projection = getProjection("EPSG:4326");
  const resolutions = [];
  const matrixIds = [];

  for (let z = 0; z <= 19; z++) {
    resolutions.push(180 / (256 * Math.pow(2, z)));
    matrixIds.push("EPSG:4326:" + z.toString());
  }

  const tileGrid = new WMTSTileGrid({
    origin: [-180, 90],
    resolutions: resolutions,
    matrixIds: matrixIds,
    tileSize: 256,
  });

  const wmtsSource = new WMTS({
    url: `${DOMAIN_CONFIG.map_server_uri}/tilecache/service/wmts`,
    layer: "Global_Image_4326",
    style: "",
    matrixSet: "EPSG:4326",
    format: "image/jpeg",
    projection: projection,
    tileGrid: tileGrid,
    wrapX: true,
  });

  const wmtsLayer = new TileLayer({
    source: wmtsSource,
  });

  olMapInstance = new Map({
    target: targetDom,
    layers: [wmtsLayer],
    view: new View({
      projection: projection,
      center: [0, 0],
      zoom: 2,
      // extent: [-180, -90, 180, 90],
    }),
  });
}

export function initOpenlayersMap3857(targetDom) {
  const projection = getProjection("EPSG:3857");
  const extent = projection.getExtent();
  const size = getWidth(extent) / 256;
  const resolutions = [];
  const matrixIds = [];

  for (let z = 0; z < 18; z++) {
    resolutions.push(size / Math.pow(2, z));
    matrixIds.push("EPSG:3857:" + z.toString());
  }

  const tileGrid = new WMTSTileGrid({
    origin: [-20037508.3428, 20037508.3428], // EPSG:3857的原点,
    resolutions: resolutions,
    matrixIds: matrixIds,
  });

  const wmtsSource = new WMTS({
    url: `${DOMAIN_CONFIG.map_server_uri}/tilecache/service/wmts`,
    layer: "Global_Image_3857",
    style: "",
    matrixSet: "EPSG:3857",
    format: "image/png",
    projection: projection,
    tileGrid: tileGrid,
    wrapX: true,
  });

  const wmtsLayer = new TileLayer({
    source: wmtsSource,
  });

  olMapInstance = new Map({
    target: targetDom,
    layers: [wmtsLayer],
    view: new View({
      projection: projection,
      center: [0, 0],
      zoom: 2,
      // extent: [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244],
    }),
  });
}

export function addSatellitePoint(featureId, satelliteInfo, styleOptions = {}) {
  if (!olMapInstance) return;

  const pointFeature = new Feature({
    geometry: new Point([satelliteInfo.lon, satelliteInfo.lat]),
  });
  const rotation = ((satelliteInfo.headingDeg - 90) / 180) * Math.PI;

  const pointStyle = new Style({
    // image: new CircleStyle({
    //   radius: styleOptions.radius || 6,
    //   fill: new Fill({
    //     color: styleOptions.fillColor || "rgba(255, 0, 0, 0.8)",
    //   }),
    //   stroke: new Stroke({
    //     color: styleOptions.strokeColor || "#fff",
    //     width: styleOptions.strokeWidth || 2,
    //   }),
    // }),

    image: new Icon({
      src: "/assets/icon/star.svg",
      scale: 0.2,
      // 使用 fraction 单位时，值范围是 0~1
      anchor: [0.75, 0.5], // X=0.75(从左往右3/4处), Y=1(底部)
      anchorXUnits: "fraction",
      anchorYUnits: "fraction",
      rotation: rotation,
    }),
    text: satelliteInfo.name
      ? new Text({
          text: satelliteInfo.name,
          font: "12px sans-serif",
          fill: new Fill({ color: styleOptions.labelColor || "#ffffff" }),
          stroke: new Stroke({ color: "000000", width: 1 }),
          offsetY: 20,
        })
      : null,
  });

  // console.log("satelliteInfo", satelliteInfo);

  pointFeature.setStyle(pointStyle);
  pointFeature.setId(featureId);

  if (getSourceByLayer("satellitePoints")) {
    const existingSource = getSourceByLayer("satellitePoints");
    const featureCurr = existingSource.getFeatureById(featureId);
    if (featureCurr) existingSource.removeFeature(featureCurr);
    existingSource.addFeature(pointFeature);
  } else {
    const vectorSource = new VectorSource({
      features: [pointFeature],
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    vectorLayer.set("name", "satellitePoints");
    olMapInstance.addLayer(vectorLayer);
  }
}

export function addSatelliteOrbit(featureId, llas, styleOptions = {}) {
  if (!olMapInstance) return;

  const formatCoords = llas.map((coord) => [coord.lon, coord.lat]);
  const multiLineString = buildMultiLineString(formatCoords);
  const lineFeature = new Feature({
    geometry: multiLineString,
  });

  const lineStyle = new Style({
    stroke: new Stroke({
      color: styleOptions.strokeColor || "rgba(55, 255, 0, 0.8)",
      width: styleOptions.strokeWidth || 2,
    }),
  });

  lineFeature.setStyle(lineStyle);
  lineFeature.setId(featureId);

  if (getSourceByLayer("satelliteOrbits")) {
    const existingSource = getSourceByLayer("satelliteOrbits");
    const featureCurr = existingSource.getFeatureById(featureId);
    if (featureCurr) existingSource.removeFeature(featureCurr);
    existingSource.addFeature(lineFeature);
  } else {
    const vectorSource = new VectorSource({
      features: [lineFeature],
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    vectorLayer.set("name", "satelliteOrbits");
    olMapInstance.addLayer(vectorLayer);
  }
}

// 处理卫星轨迹线跨180度经线的问题
export function buildMultiLineString(positions) {
  if (positions.length < 2) return new LineString(positions);

  const segments = [];
  let currentSegment = [positions[0]];

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];

    if (Math.abs(curr[0] - prev[0]) > 180) {
      segments.push(currentSegment);
      currentSegment = [curr];
    } else {
      currentSegment.push(curr);
    }
  }

  segments.push(currentSegment);

  if (segments.length === 1) {
    return new LineString(segments[0]);
  } else {
    return new MultiLineString(segments);
  }
}

export function getSourceByLayer(layerName) {
  const layer = olMapInstance
    .getLayers()
    .getArray()
    .find((layer) => layer.get("name") === layerName);
  return layer ? layer.getSource() : null;
}

export function getFeatureById(layerName, featureId) {
  const source = getSourceByLayer(layerName);
  return source ? source.getFeatureById(featureId) : null;
}

export function removeFeatureById(layerName, featureId) {
  const source = getSourceByLayer(layerName);
  if (source) {
    const feature = source.getFeatureById(featureId);
    if (feature) {
      source.removeFeature(feature);
    }
  }
}

export { olMapInstance };
