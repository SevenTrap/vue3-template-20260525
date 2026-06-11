import * as mars3d from "mars3d";
import * as satellite from "satellite.js";
import { useGeoMapStore } from "@/store/useGeoMapStore";

/** 天文单位（km），用于将 sunPos 的 rsun(AU) 换算为 km */
const AU_KM = 149597870.7;
/** 光照来向线段长度（m） */
const LIGHT_DIRECTION_LINE_LENGTH = 10_000_000;
/** 光照来向线段颜色 */
const LIGHT_DIRECTION_COLOR = "#ffff00";
/** 成像方向线段颜色 */
const IMAGE_DIRECTION_COLOR = "#00ccff";

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
      mergeOrientation: true,
      heading: 0,
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
export function toggleSatelliteOrbit(satelliteLayer, showSatelliteOrbit) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;

    graphic.path.show = showSatelliteOrbit;
    graphic.path.opacity = showSatelliteOrbit ? 0.5 : 0;
  });
}

// 切换从星轨道线显示状态
export function toggleImportSatelliteOrbit(satelliteLayer, showImportSatelliteOrbit) {
  if (!satelliteLayer) return;

  const graphic = satelliteLayer.getGraphicById("importSatelliteECI");
  if (!graphic) return;
  graphic.path.show = showImportSatelliteOrbit;
  graphic.path.opacity = showImportSatelliteOrbit ? 0.5 : 0;
}

// 切换主星轨道线显示状态
export function toggleThreatSatelliteOrbit(satelliteLayer, showThreatSatelliteOrbit) {
  if (!satelliteLayer) return;

  const graphic = satelliteLayer.getGraphicById("threatSatelliteECI");
  if (!graphic) return;
  graphic.path.show = showThreatSatelliteOrbit;
  graphic.path.opacity = showThreatSatelliteOrbit ? 0.5 : 0;
}

// 切换从星轨迹线显示状态
export function toggleImportSatelliteTrajectory(satelliteLayer, showImportSatelliteTrajectory) {
  if (!satelliteLayer) return;
  const graphic = satelliteLayer.getGraphicById("importSatelliteECEF");
  if (!graphic) return;
  graphic.path.show = showImportSatelliteTrajectory;
  graphic.path.opacity = showImportSatelliteTrajectory ? 0.5 : 0;
}

// 切换主星轨迹线显示状态
export function toggleThreatSatelliteTrajectory(satelliteLayer, showThreatSatelliteTrajectory) {
  if (!satelliteLayer) return;
  const graphic = satelliteLayer.getGraphicById("threatSatelliteECEF");
  if (!graphic) return;
  graphic.path.show = showThreatSatelliteTrajectory;
  graphic.path.opacity = showThreatSatelliteTrajectory ? 0.5 : 0;
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

  const importGraphicECEF = satelliteLayer.getGraphicById("importSatelliteECEF");

  if (showSatelliteModel) {
    if (!importGraphicECEF) return;
    importGraphicECEF.model.show = true;
  } else {
    satelliteLayer.eachGraphic((graphic) => {
      if (!graphic._isSate) return;
      graphic.model.show = false;
    });
  }
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

export function addSatelliteOrbitECEFScene(satelliteSceneLayer, satRelativeData) {
  if (!satelliteSceneLayer || !satRelativeData) return;

  // if (satelliteSceneLayer.getGraphicById("threatSatelliteECEF")) satelliteSceneLayer.removeGraphic(satelliteSceneLayer.getGraphicById("threatSatelliteECEF"));
  // if (satelliteSceneLayer.getGraphicById("importSatelliteECEF")) satelliteSceneLayer.removeGraphic(satelliteSceneLayer.getGraphicById("importSatelliteECEF"));

  if (satelliteSceneLayer.getGraphicById("threatSatelliteECEF")) return;
  if (satelliteSceneLayer.getGraphicById("importSatelliteECEF")) return;

  const { threatTrack, importTrack } = satRelativeData;
  const threatPositionsECEF = [];
  const importPositionsECEF = [];

  for (let i = 0; i < threatTrack.length; i += 1) {
    const item = threatTrack[i];
    const positionECEF = {
      time: item.time,
      lng: item.lon,
      lat: item.lat,
      alt: item.altKm * 1000,
    };

    threatPositionsECEF.push(positionECEF);
  }

  for (let i = 0; i < importTrack.length; i += 1) {
    const item = importTrack[i];
    const positionECEF = {
      time: item.time,
      lng: item.lon,
      lat: item.lat,
      alt: item.altKm * 1000,
    };

    importPositionsECEF.push(positionECEF);
  }

  const threatGraphicLine = new mars3d.graphic.Satellite({
    id: "threatSatelliteECEF",
    name: "threatSatelliteECEF",
    // position: threatPositionsECI,
    position: {
      type: "time",
      list: threatPositionsECEF,
      timeField: "time",
      forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
      backwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
      referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
    },
    referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      mergeOrientation: false,
      heading: 0,
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
    id: "importSatelliteECEF",
    name: "importSatelliteECEF",
    position: {
      type: "time",
      list: importPositionsECEF,
      timeField: "time",
      forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
      backwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
      referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
    },
    referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      mergeOrientation: false,
      heading: 0,
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

export function addSatelliteOrbitECIScene(satelliteSceneLayer, currentSceneConfig) {
  if (!satelliteSceneLayer || !currentSceneConfig) return;

  // if (satelliteSceneLayer.getGraphicById("threatSatelliteECI")) satelliteSceneLayer.removeGraphic(satelliteSceneLayer.getGraphicById("threatSatelliteECI"));
  // if (satelliteSceneLayer.getGraphicById("importSatelliteECI")) satelliteSceneLayer.removeGraphic(satelliteSceneLayer.getGraphicById("importSatelliteECI"));

  if (satelliteSceneLayer.getGraphicById("threatSatelliteECI")) return;
  if (satelliteSceneLayer.getGraphicById("importSatelliteECI")) return;

  const { threatTles, importTles } = currentSceneConfig;

  const threatGraphicLine = new mars3d.graphic.Satellite({
    id: "threatSatelliteECI",
    name: "threatSatelliteECI",
    tle1: threatTles[0].tle1,
    tle2: threatTles[0].tle2,
    referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      mergeOrientation: false,
      heading: 0,
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
    id: "importSatelliteECI",
    name: "importSatelliteECI",
    tle1: importTles[0].tle1,
    tle2: importTles[0].tle2,
    referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
    model: {
      show: true,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      mergeOrientation: false,
      heading: 0,
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

    const threatGraphicLine = satelliteSceneLayer.getGraphicById("threatSatelliteECEF") || satelliteSceneLayer.getGraphicById("threatSatelliteECI");
    const importGraphicLine = satelliteSceneLayer.getGraphicById("importSatelliteECEF") || satelliteSceneLayer.getGraphicById("importSatelliteECI");
    if (!threatGraphicLine || !importGraphicLine) return;

    const satelliteSensor = new mars3d.graphic.ConicSensor({
      id: "satelliteSensor",
      name: "satelliteSensor",
      position: threatGraphicLine.property,
      lookAt: importGraphicLine.property,
      style: {
        angle: 10,
        opacity: 0.3,
        color: "#7ef500",
        outlineColor: "#e1e1e1",
        topOutlineShow: true,
        slices: 1,
        slicesR: 1,
      },
    });
    satelliteSceneLayer.addGraphic(satelliteSensor);
  } else {
    const satelliteSensor = satelliteSceneLayer.getGraphicById("satelliteSensor");
    if (!satelliteSensor) return;
    satelliteSceneLayer.removeGraphic(satelliteSensor);
  }
}

/**
 * 切换卫星成像方向显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteImageDirection - 是否显示成像方向
 * @returns {void}
 */
export function toggleSatelliteImageDirection(satelliteSceneLayer, showSatelliteImageDirection) {
  if (!satelliteSceneLayer) return;

  if (showSatelliteImageDirection) {
    if (satelliteSceneLayer.getGraphicById("satelliteImageDirection")) return;

    const threatGraphicECEF = satelliteSceneLayer.getGraphicById("threatSatelliteECEF");
    const importGraphicECEF = satelliteSceneLayer.getGraphicById("importSatelliteECEF");
    const threatGraphicECI = satelliteSceneLayer.getGraphicById("threatSatelliteECI");
    const importGraphicECI = satelliteSceneLayer.getGraphicById("importSatelliteECI");

    const threatGraphic = threatGraphicECEF || threatGraphicECI;
    const importGraphic = importGraphicECEF || importGraphicECI;

    if (!threatGraphic || !importGraphic) return;

    const Cesium = mars3d.Cesium;

    const imageDirectionLine = new mars3d.graphic.PolylineEntity({
      id: "satelliteImageDirection",
      name: "satelliteImageDirection",
      positions: new Cesium.CallbackProperty(() => {
        const threatPosition = threatGraphic.positionShow;
        const importPosition = importGraphic.positionShow;

        if (!threatPosition || !importPosition) return [];
        return [threatPosition, importPosition];
      }, false),
      style: {
        width: 1,
        opacity: 0.5,
        arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(IMAGE_DIRECTION_COLOR)),
        label: {
          text: "成像",
          font_size: 16,
          font_family: "楷体",
          color: IMAGE_DIRECTION_COLOR,
          outline: true,
          outlineColor: "#000000",
          outlineWidth: 2,
        },
      },
    });

    satelliteSceneLayer.addGraphic(imageDirectionLine);
  } else {
    const imageDirectionLine = satelliteSceneLayer.getGraphicById("satelliteImageDirection");
    if (!imageDirectionLine) return;
    satelliteSceneLayer.removeGraphic(imageDirectionLine);
  }
}

// 切换卫星坐标轴状态
export function toggleSatelliteCoordinateAxis(satelliteSceneLayer, showSatelliteCoordinateAxis) {
  if (!satelliteSceneLayer) return;

  if (showSatelliteCoordinateAxis) {
    // if (satelliteSceneLayer.getGraphicById("satelliteBodyCoordinate")) return;

    const importGraphicECEF = satelliteSceneLayer.getGraphicById("importSatelliteECEF");
    const importGraphicECI = satelliteSceneLayer.getGraphicById("importSatelliteECI");
    const importGraphic = importGraphicECEF || importGraphicECI;

    if (!importGraphic) return;

    importGraphic.debugAxis = true;
    importGraphic.debugAxisLength = 10000000;
    importGraphic.debugAxisColor = "#ff0000";
    importGraphic.debugAxisWidth = 1;
    importGraphic.debugAxisOpacity = 1;
    importGraphic.debugAxisFontSize = 16;
    importGraphic.debugAxisFontFamily = "楷体";
    importGraphic.debugAxisFontColor = "#ffffff";
    importGraphic.debugAxisFontOpacity = 1;
  } else {
    const importGraphicECEF = satelliteSceneLayer.getGraphicById("importSatelliteECEF");
    const importGraphicECI = satelliteSceneLayer.getGraphicById("importSatelliteECI");

    if (importGraphicECEF) importGraphicECEF.debugAxis = false;
    if (importGraphicECI) importGraphicECI.debugAxis = false;
  }
}

// 显示卫星的轨道坐标轴
export function toggleSatelliteOrbitCoordinateAxis(satelliteSceneLayer, showSatelliteOrbitCoordinateAxis) {
  if (!satelliteSceneLayer) return;

  if (showSatelliteOrbitCoordinateAxis) {
    // if (satelliteSceneLayer.getGraphicById("satelliteOrbitCoordinate")) return;
    const importGraphicECEF = satelliteSceneLayer.getGraphicById("importSatelliteECEF");
    const importGraphicECI = satelliteSceneLayer.getGraphicById("importSatelliteECI");

    if (importGraphicECEF) importGraphicECEF.debugAxis = true;
    if (importGraphicECI) importGraphicECI.debugAxis = true;
  } else {
    const importGraphicECEF = satelliteSceneLayer.getGraphicById("importSatelliteECEF");
    const importGraphicECI = satelliteSceneLayer.getGraphicById("importSatelliteECI");

    if (importGraphicECEF) importGraphicECEF.debugAxis = false;
    if (importGraphicECI) importGraphicECI.debugAxis = false;
  }
}

/**
 * 获取太阳在 ECI 坐标系下的位置（km）
 * @param {Date} date - UTC 时间
 * @returns {{x:number,y:number,z:number}|null} 太阳 ECI 位置
 */
const getSunEciKm = (date) => {
  const jd = satellite.jday(date);
  const sunPos = satellite.sunPos(jd);
  const rsun = sunPos && sunPos.rsun;
  if (!rsun) return null;

  const sunEci = {
    x: (rsun.x ?? rsun[0]) * AU_KM,
    y: (rsun.y ?? rsun[1]) * AU_KM,
    z: (rsun.z ?? rsun[2]) * AU_KM,
  };
  const magnitude = Math.sqrt(sunEci.x * sunEci.x + sunEci.y * sunEci.y + sunEci.z * sunEci.z);
  return magnitude ? sunEci : null;
};

/**
 * 将惯性系坐标转换到地固系（与 mars3d 卫星 positionShow 的渲染坐标系一致）
 * @param {object} position - 惯性系坐标（Cartesian3）
 * @param {object} time - Cesium JulianDate
 * @returns {object|null} 地固系坐标
 */
const inertialToFixed = (position, time) => {
  const Cesium = mars3d.Cesium;
  const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!icrfToFixed) return null;
  return Cesium.Matrix3.multiplyByVector(icrfToFixed, position, new Cesium.Cartesian3());
};

/**
 * 计算光照来向线段端点：起点沿太阳方向偏移，终点为卫星实时显示位置
 * @param {object} time - Cesium JulianDate
 * @param {object} satPosition - 卫星实时显示位置（Cartesian3，地固系）
 * @returns {Array} 线段端点数组
 */
const buildLightDirectionPositions = (time, satPosition) => {
  const Cesium = mars3d.Cesium;
  if (!satPosition) return [];

  const sunEciKm = getSunEciKm(Cesium.JulianDate.toDate(time));
  if (!sunEciKm) return [];

  const sunInertialM = new Cesium.Cartesian3(sunEciKm.x * 1000, sunEciKm.y * 1000, sunEciKm.z * 1000);
  const sunPosition = inertialToFixed(sunInertialM, time);
  if (!sunPosition) return [];

  const sunToSat = Cesium.Cartesian3.subtract(satPosition, sunPosition, new Cesium.Cartesian3());
  const magnitude = Cesium.Cartesian3.magnitude(sunToSat);
  if (!magnitude) return [];

  const direction = Cesium.Cartesian3.divideByScalar(sunToSat, magnitude, new Cesium.Cartesian3());
  const offset = Cesium.Cartesian3.multiplyByScalar(direction, LIGHT_DIRECTION_LINE_LENGTH, new Cesium.Cartesian3());
  const startPosition = Cesium.Cartesian3.subtract(satPosition, offset, new Cesium.Cartesian3());

  return [startPosition, satPosition];
};

/**
 * 切换卫星光照来向显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteLightDirection - 是否显示光照来向
 * @returns {void}
 */
export function toggleSatelliteLightDirection(satelliteSceneLayer, showSatelliteLightDirection) {
  if (!satelliteSceneLayer) return;

  const existingLine = satelliteSceneLayer.getGraphicById("satelliteLightDirection");
  if (existingLine) {
    satelliteSceneLayer.removeGraphic(existingLine);
  }

  if (!showSatelliteLightDirection) return;

  const importGraphicLine = satelliteSceneLayer.getGraphicById("importSatelliteECEF");
  if (!importGraphicLine) return;

  const Cesium = mars3d.Cesium;

  const lightDirectionLine = new mars3d.graphic.PolylineEntity({
    id: "satelliteLightDirection",
    name: "satelliteLightDirection",
    positions: new Cesium.CallbackProperty((time) => {
      const satPosition = importGraphicLine.positionShow;
      return buildLightDirectionPositions(time, satPosition);
    }, false),
    style: {
      width: 8,
      opacity: 1,
      arcType: Cesium.ArcType.NONE,
      material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(LIGHT_DIRECTION_COLOR)),
      label: {
        text: "光照",
        font_size: 16,
        font_family: "楷体",
        color: LIGHT_DIRECTION_COLOR,
        outline: true,
        outlineColor: "#000000",
        outlineWidth: 2,
      },
    },
  });

  satelliteSceneLayer.addGraphic(lightDirectionLine);
}
