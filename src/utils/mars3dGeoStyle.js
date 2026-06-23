import * as mars3d from "mars3d";
const GEO_HEIGHT = 35786 * 1000;
const ALT_HEIGHT = 20000 * 1000;

const createPatrolAreaPositions = () => {
  const positions_0KM = [];
  const positions_35786KM = [];

  for (let lon = 16; lon <= 199; lon += 1) {
    positions_0KM.push(mars3d.Cesium.Cartesian3.fromDegrees(lon, 0, 1));
    positions_35786KM.push(mars3d.Cesium.Cartesian3.fromDegrees(lon, 0, GEO_HEIGHT));
  }

  return [...positions_0KM.reverse(), ...positions_35786KM];
};

function createGeoCirclePositions(stepDeg = 1) {
  const positions = [];

  for (let lon = 0; lon <= 360; lon += stepDeg) {
    positions.push(mars3d.Cesium.Cartesian3.fromDegrees(lon, 0, GEO_HEIGHT));
  }

  return positions;
}

export function addGeoCirclePositions(viewer) {
  if (viewer.entities.getById("geoCirclePositionsEntity")) return;

  const geoCirclePositionsEntity = {
    id: "geoCirclePositionsEntity",
    name: "地球同步轨道-虚线",
    polyline: {
      positions: createGeoCirclePositions(2),
      width: 1.5,
      material: new mars3d.Cesium.PolylineDashMaterialProperty({
        color: mars3d.Cesium.Color.WHITE,
        gapColor: mars3d.Cesium.Color.TRANSPARENT,
        dashLength: 5,
      }),
      arcType: mars3d.Cesium.ArcType.NONE,
    },
  };

  viewer.entities.add(geoCirclePositionsEntity);
}

export function removeGeoCirclePositions(viewer) {
  const entity = viewer.entities.getById("geoCirclePositionsEntity");
  if (entity) viewer.entities.remove(entity);
}

export function addGeoCircleLabel(viewer) {
  let geoLabelGraphicLayer = viewer.getLayerById("geoLabelGraphicLayer");

  if (!geoLabelGraphicLayer) {
    geoLabelGraphicLayer = new mars3d.layer.GraphicLayer({ id: "geoLabelGraphicLayer" });
    viewer.addLayer(geoLabelGraphicLayer);
  }

  for (let lon = -180; lon < 180; lon += 30) {
    const lonStr = String(lon);

    const labelGraphic = new mars3d.graphic.PointEntity({
      position: new mars3d.LngLatPoint(lon, 0, ALT_HEIGHT),
      style: {
        pixelSize: 6,
        color: "#ffffff",
        outline: true,
        outlineColor: "#ffffff",
        outlineWidth: 1,

        label: {
          show: true,
          text: lonStr,
          font_size: 16,
          font_family: "微软雅黑",
          font_weight: "bold",
          color: "#ffffff",
          outline: true,
          outlineColor: "#000000",
          outlineWidth: 1,
          pixelOffsetY: -10,
        },
      },
    });

    geoLabelGraphicLayer.addGraphic(labelGraphic);
  }
}

export function removeGeoCircleLabel(viewer) {
  const layer = viewer.getLayerById("geoLabelGraphicLayer");
  if (layer) viewer.removeLayer(layer);
}

/**
 * 添加巡视区域扇面
 * @param {object} viewer - Cesium Viewer 实例
 * @returns {void}
 */
export const addPatrolArea = (viewer) => {
  let patrolAreaEntityLayer = viewer.getLayerById("patrolAreaEntityLayer");
  if (!patrolAreaEntityLayer) {
    patrolAreaEntityLayer = new mars3d.layer.GraphicLayer({ id: "patrolAreaEntityLayer" });
    viewer.addLayer(patrolAreaEntityLayer);
  }

  if (!viewer.entities.getById("patrolAreaEntity")) {
    viewer.entities.add({
      id: "patrolAreaEntity",
      name: "巡视区域",
      polygon: {
        hierarchy: new mars3d.Cesium.PolygonHierarchy(createPatrolAreaPositions()),
        material: mars3d.Cesium.Color.RED.withAlpha(0.15),
        outline: false,
        outlineColor: mars3d.Cesium.Color.CYAN.withAlpha(0.55),
        perPositionHeight: true,
        arcType: mars3d.Cesium.ArcType.NONE,
      },
    });
  }

  if (!viewer.entities.getById("patrolAreaLabelGraphicStart")) {
    const labelGraphic = new mars3d.graphic.PointEntity({
      id: "patrolAreaLabelGraphicStart",
      position: new mars3d.LngLatPoint(16, 0, GEO_HEIGHT),
      style: {
        label: {
          show: true,
          text: "16E",
          font_size: 16,
          font_family: "微软雅黑",
          font_weight: "bold",
          color: "#ffffff",
          outline: true,
          outlineColor: "#000000",
          outlineWidth: 1,
          pixelOffsetY: -10,
        },
      },
    });

    patrolAreaEntityLayer.addGraphic(labelGraphic);
  }

  if (!viewer.entities.getById("patrolAreaLabelGraphicEnd")) {
    const labelGraphic = new mars3d.graphic.PointEntity({
      id: "patrolAreaLabelGraphicEnd",
      position: new mars3d.LngLatPoint(-161, 0, GEO_HEIGHT),
      style: {
        label: {
          show: true,
          text: "161W",
          font_size: 16,
          font_family: "微软雅黑",
          font_weight: "bold",
          color: "#ffffff",
          outline: true,
          outlineColor: "#000000",
          outlineWidth: 1,
          pixelOffsetY: -10,
        },
      },
    });

    patrolAreaEntityLayer.addGraphic(labelGraphic);
  }
};

/**
 * 移除巡视区域扇面
 * @param {object} viewer - Cesium Viewer 实例
 * @returns {void}
 */
export const removePatrolArea = (viewer) => {
  const layer = viewer.getLayerById("patrolAreaEntityLayer");
  if (layer) viewer.removeLayer(layer);

  const entity = viewer.entities.getById("patrolAreaEntity");
  if (entity) viewer.entities.remove(entity);
};
