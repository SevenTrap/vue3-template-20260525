import * as mars3d from "mars3d";
import { useGeoMapStore } from "@/store/useGeoMapStore";

const geoMapStore = useGeoMapStore();

/**
 * 创建卫星 graphic
 * @param {object} satelliteModel - 卫星模型对象
 * @param {number} referenceFrame - Cesium 参考系
 * @param {object} displayState - 显示状态
 * @returns {object|null} Mars3D 卫星 graphic
 */
const createSatelliteGraphic = (satelliteModel) => {
  const coordinate = geoMapStore.coordinate;

  const referenceFrame = coordinate === "ECI" ? mars3d.Cesium.ReferenceFrame.INERTIAL : mars3d.Cesium.ReferenceFrame.FIXED;

  const satelliteGraphic = new mars3d.graphic.Satellite({
    id: satelliteModel.noradID,
    name: satelliteModel.name,
    tle1: satelliteModel.tle1,
    tle2: satelliteModel.tle2,
    referenceFrame, // INERTIAL：惯性坐标系  FIXED：地球坐标系

    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      silhouette: false,
      mergeOrientation: false,
      heading: 90,
      pitch: 0,
      roll: 0,
    },
    point: {
      show: true,
      color: "#ff0000",
      pixelSize: 10,
      debugAxis: true,
      debugAxisLength: 1000000,
    },

    label: {
      show: true,
      text: satelliteModel.name,
      font_size: 20,
      font_family: "楷体",
      color: "#ffffff",
      opacity: 1,
      outline: true,
      outlineColor: "#000000",
      outlineWidth: 2,
      background: true,
      backgroundColor: "#000000",
      backgroundOpacity: 0.5,
      backgroundPadding: new mars3d.Cesium.Cartesian2(2, 5),
      pixelOffsetX: 0,
      pixelOffsetY: -20,
      pixelOffsetScaleByDistance: true,
      pixelOffsetScaleByDistance_far: 1000000,
      pixelOffsetScaleByDistance_farValue: 0.5,
      pixelOffsetScaleByDistance_near: 1000,
      pixelOffsetScaleByDistance_nearValue: 1.0,
      scaleByDistance: true,
      scaleByDistance_far: 1000000,
      scaleByDistance_farValue: 0.5,
      scaleByDistance_near: 1000,
      scaleByDistance_nearValue: 1.0,
    },

    path: {
      show: true,
      color: "#00ff00",
      width: 1,
      opacity: 0.5,
    },
  });

  satelliteGraphic._isSate = true;
  satelliteGraphic._satelliteModel = satelliteModel;

  return satelliteGraphic;
};

// 添加卫星上球展示
export function addSatellite(satelliteLayer, satelliteModel) {
  if (!satelliteLayer || !satelliteModel) return;

  const graphicSatellite = satelliteLayer.getGraphicById(satelliteModel.noradID);
  if (graphicSatellite) return;

  const satelliteGraphic = createSatelliteGraphic(satelliteModel);
  if (!satelliteGraphic) return;

  satelliteLayer.addGraphic(satelliteGraphic);
}

/**
 * 重建卫星 graphic 以更新参考坐标系
 * @param {object} satelliteLayer - 卫星图层
 * @param {number} referenceFrame - Cesium 参考系
 * @returns {void}
 */
export const rebuildSatelliteReferenceFrame = (satelliteLayer) => {
  if (!satelliteLayer) return;

  geoMapStore.checkedNorads.forEach((norad) => {
    const satelliteModel = geoMapStore.satelliteModels.get(norad);
    if (!satelliteModel) return;

    const graphic = satelliteLayer.getGraphicById(norad);
    if (graphic) satelliteLayer.removeGraphic(graphic);

    const nextGraphic = createSatelliteGraphic(satelliteModel);
    if (nextGraphic) satelliteLayer.addGraphic(nextGraphic);
  });
};

/**
 * 切换卫星轨道线显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteOrbit - 是否显示轨道线
 * @returns {void}
 */
export function toggleSatelliteOribit(satelliteLayer, showSatelliteOrbit) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;

    graphic.path.show = showSatelliteOrbit;
    graphic.path.opacity = showSatelliteOrbit ? 0.5 : 0;
  });
}

/**
 * 切换卫星名称显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteName - 是否显示卫星名称
 * @returns {void}
 */
export function toggleSatelliteName(satelliteLayer, showSatelliteName) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;
    graphic.label.show = showSatelliteName;
  });
}

/**
 * 切换卫星模型显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteModel - 是否显示卫星模型
 * @returns {void}
 */
export function toggleSatelliteModel(satelliteLayer, showSatelliteModel) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;
    graphic.model.show = showSatelliteModel;
  });
}

export function toggleSatellitePoint(satelliteLayer, showSatellitePoint) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;

    graphic.point.show = showSatellitePoint;
  });
}

/**
 * 切换卫星模型朝向：启用时模型始终指向地心（nadir），禁用时还原沿速度方向
 * @param {object} satelliteLayer - 卫星图层
 * @param {string|number} noradID - 卫星 NORAD ID
 * @param {boolean} enable - true：朝向地球；false：还原速度朝向
 * @returns {void}
 */
export const setSatelliteFaceEarth = (satelliteLayer, noradID, enable) => {
  if (!satelliteLayer || !noradID) return;

  const graphic = satelliteLayer.getGraphicById(noradID);
  const entity = graphic?.entity;
  if (!entity || !entity.position) return;

  const Cesium = mars3d.Cesium;
  const positionProperty = entity.position;

  if (enable) {
    entity.orientation = new Cesium.CallbackProperty((time, result) => {
      const position = positionProperty.getValue(time);
      if (!position) return undefined;
      const hpr = new Cesium.HeadingPitchRoll(0, Cesium.Math.toRadians(-90), 0);
      return Cesium.Transforms.headingPitchRollQuaternion(position, hpr, Cesium.Ellipsoid.WGS84, undefined, result);
    }, false);
  } else {
    entity.orientation = new Cesium.VelocityOrientationProperty(positionProperty);
  }
};

/**
 * 切换卫星轨迹线显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteTrajectory - 是否显示轨迹线
 * @returns {void}
 */
export function toggleSatelliteTrajectory(satelliteLayer, showSatelliteTrajectory) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSateTrajectory) return;

    graphic.show = showSatelliteTrajectory;
    graphic.opacity = showSatelliteTrajectory ? 0.5 : 0;
  });
}

export function addSatelliteScene(satelliteSceneLayer, satRelativeData) {
  if (!satelliteSceneLayer || !satRelativeData) return;

  satelliteSceneLayer.clear();

  const { threatTrack, importTrack } = satRelativeData;
  const threatPositionsECEF = [];
  const importPositionsECEF = [];

  for (let i = 0; i < threatTrack.length; i += 1) {
    const item = threatTrack[i];
    const position = {
      timeMs: item.time,
      lng: item.lon,
      lat: item.lat,
      alt: item.altKm * 1000,
    };
    threatPositionsECEF.push(position);
  }

  for (let i = 0; i < importTrack.length; i += 1) {
    const item = importTrack[i];
    const position = {
      timeMs: item.time,
      lng: item.lon,
      lat: item.lat,
      alt: item.altKm * 1000,
    };
    importPositionsECEF.push(position);
  }

  const threatGraphicLine = new mars3d.graphic.Satellite({
    id: "threatSatellite",
    name: "threatSatellite",
    position: {
      type: "time",
      list: threatPositionsECEF,
      timeField: "timeMs",
      forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
    },
    referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      silhouette: false,
      mergeOrientation: false,
      heading: 90,
      pitch: 0,
      roll: 0,
    },
    path: {
      show: true,
      width: 1,
      color: mars3d.Cesium.Color.BLUE,
      opacity: 1,
    },
    point: {
      show: true,
      color: mars3d.Cesium.Color.BLUE,
      pixelSize: 10,
      debugAxis: true,
      debugAxisLength: 1000000,
    },
    label: {
      show: true,
      text: "主动卫星",
      font_size: 16,
      font_family: "楷体",
      color: "#ffffff",
      opacity: 1,
    },
  });
  const importGraphicLine = new mars3d.graphic.Satellite({
    id: "importSatellite",
    name: "importSatellite",
    referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
    position: {
      type: "time",
      list: importPositionsECEF,
      timeField: "timeMs",
      forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
    },
    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      silhouette: false,
      mergeOrientation: false,
      heading: 90,
      pitch: 0,
      roll: 0,
    },
    path: {
      show: true,
      width: 1,
      color: mars3d.Cesium.Color.RED,
      opacity: 1,
    },
    point: {
      show: true,
      color: mars3d.Cesium.Color.RED,
      pixelSize: 10,
      debugAxis: true,
      debugAxisLength: 1000000,
    },
    label: {
      show: true,
      text: "从动卫星",
      font_size: 16,
      font_family: "楷体",
      color: "#ffffff",
      opacity: 1,
    },
  });

  satelliteSceneLayer.addGraphic(threatGraphicLine);
  satelliteSceneLayer.addGraphic(importGraphicLine);

  threatGraphicLine._isSate = true;
  importGraphicLine._isSate = true;
}

export function addSatelliteSceneByTle(satelliteSceneLayer, currentSceneConfig) {
  if (!satelliteSceneLayer || !currentSceneConfig) return;

  satelliteSceneLayer.clear();

  const { threatTles, importTles } = currentSceneConfig;

  const threatGraphicLine = new mars3d.graphic.Satellite({
    id: "threatSatellite",
    name: "threatSatellite",
    tle1: threatTles[0].tle1,
    tle2: threatTles[0].tle2,
    referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      silhouette: false,
      mergeOrientation: false,
      heading: 90,
      pitch: 0,
      roll: 0,
    },
    path: {
      show: true,
      color: "#00ff00",
      width: 1,
      opacity: 0.5,
    },
    point: {
      show: true,
      color: "#ff0000",
      pixelSize: 10,
      debugAxis: true,
      debugAxisLength: 1000000,
    },
    label: {
      show: true,
      text: "主动卫星",
      font_size: 16,
      font_family: "楷体",
      color: "#ffffff",
      opacity: 1,
    },
  });

  const importGraphicLine = new mars3d.graphic.Satellite({
    id: "importSatellite",
    name: "importSatellite",
    tle1: importTles[0].tle1,
    tle2: importTles[0].tle2,
    referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      silhouette: false,
      mergeOrientation: false,
      heading: 90,
      pitch: 0,
      roll: 0,
    },
    path: {
      show: true,
      color: "#00ff00",
      width: 1,
      opacity: 0.5,
    },

    point: {
      show: true,
      color: "#ff0000",
      pixelSize: 10,
      debugAxis: true,
      debugAxisLength: 1000000,
    },
    label: {
      show: true,
      text: "从动卫星",
      font_size: 16,
      font_family: "楷体",
      color: "#ffffff",
      opacity: 1,
    },
  });

  satelliteSceneLayer.addGraphic(threatGraphicLine);
  satelliteSceneLayer.addGraphic(importGraphicLine);

  threatGraphicLine._isSate = true;
  importGraphicLine._isSate = true;
}

// 切换卫星传感器显示状态
export function toggleSatelliteSensor(satelliteSceneLayer, showSatelliteSensor) {
  if (!satelliteSceneLayer) return;

  if (showSatelliteSensor) {
    if (satelliteSceneLayer.getGraphicById("satelliteSensor")) return;

    const threatGraphicLine = satelliteSceneLayer.getGraphicById("threatSatellite");
    const importGraphicLine = satelliteSceneLayer.getGraphicById("importSatellite");
    if (!threatGraphicLine || !importGraphicLine) return;

    const satelliteSensor = new mars3d.graphic.ConicSensor({
      id: "satelliteSensor",
      name: "satelliteSensor",
      position: threatGraphicLine.property,
      lookAt: importGraphicLine.property,
      style: {
        angle: 10,
        opacity: 0.5,
        color: "#7ef500",
        slices: 10,
        slicesR: 6,
      },
    });
    satelliteSceneLayer.addGraphic(satelliteSensor);
  } else {
    const satelliteSensor = satelliteSceneLayer.getGraphicById("satelliteSensor");
    if (!satelliteSensor) return;
    satelliteSceneLayer.removeGraphic(satelliteSensor);
  }
}

// 切换卫星成像方向显示状态 TODO
export function toggleSatelliteImageDirection(satelliteSceneLayer, showSatelliteImageDirection) {
  if (!satelliteSceneLayer) return;

  if (showSatelliteImageDirection) {
    if (satelliteSceneLayer.getGraphicById("satelliteImageDirection")) return;
  }
}

// 切换卫星本体坐标系显示状态
export function toggleSatelliteBodyCoordinate(satelliteSceneLayer, showSatelliteBodyCoordinate) {
  if (!satelliteSceneLayer) return;

  if (showSatelliteBodyCoordinate) {
    if (satelliteSceneLayer.getGraphicById("satelliteBodyCoordinate")) return;

    const importGraphicLine = satelliteSceneLayer.getGraphicById("importSatellite");

    if (!importGraphicLine) return;

    importGraphicLine.debugAxis = true;
    importGraphicLine.debugAxisLength = 10000000;
    importGraphicLine.debugAxisColor = "#ff0000";
    importGraphicLine.debugAxisWidth = 1;
    importGraphicLine.debugAxisOpacity = 1;
    importGraphicLine.debugAxisFontSize = 16;
    importGraphicLine.debugAxisFontFamily = "楷体";
    importGraphicLine.debugAxisFontColor = "#ffffff";
    importGraphicLine.debugAxisFontOpacity = 1;
  } else {
    const importGraphicLine = satelliteSceneLayer.getGraphicById("importSatellite");
    if (!importGraphicLine) return;
    importGraphicLine.debugAxis = false;
    importGraphicLine.debugAxisLength = 0;
    importGraphicLine.debugAxisColor = "#ff0000";
    importGraphicLine.debugAxisWidth = 0;
    importGraphicLine.debugAxisOpacity = 0;
  }
}

export function toggleSatelliteLightDirection(satelliteSceneLayer, showSatelliteLightDirection) {
  if (!satelliteSceneLayer) return;

  if (showSatelliteLightDirection) {
    if (satelliteSceneLayer.getGraphicById("satelliteLightDirection")) return;

    const importGraphicLine = satelliteSceneLayer.getGraphicById("importSatellite");
    if (!importGraphicLine) return;
  } else {
  }
}
