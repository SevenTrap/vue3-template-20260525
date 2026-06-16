import * as mars3d from "mars3d";
import * as satellite from "satellite.js";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import SatelliteClass from "@/models/SatelliteClass";
import { buildSortedSatellites, pickSatByTime } from "./satelliteLngHeight";

/** 天文单位（km），用于将 sunPos 的 rsun(AU) 换算为 km */
const AU_KM = 149597870.7;
/** km 转 m */
const KM_TO_M = 1000;
/** 光照来向线段长度（m） */
const LIGHT_DIRECTION_LINE_LENGTH = 10_000_000;
/** 光照来向线段颜色 */
const LIGHT_DIRECTION_COLOR = "#ffff00";
/** 成像方向线段颜色 */
const IMAGE_DIRECTION_COLOR = "#00ccff";
/** 卫星坐标轴线段长度（m），默认 5000 km */
const SATELLITE_AXIS_LENGTH = 5_000_000;
/** 本体坐标轴 graphic ID */
const BODY_AXIS_GRAPHIC_IDS = ["importSatelliteBodyAxisX", "importSatelliteBodyAxisY", "importSatelliteBodyAxisZ"];
/** 本体坐标轴：X 滚动（速度方向）、Y 俯仰（右侧）、Z 偏航（对地） */
const BODY_AXIS_CONFIG = [
  { id: "importSatelliteBodyAxisX", label: "X", color: "#ff3333", axisKey: "xAxis" },
  { id: "importSatelliteBodyAxisY", label: "Y", color: "#33ff33", axisKey: "yAxis" },
  { id: "importSatelliteBodyAxisZ", label: "Z", color: "#3333ff", axisKey: "zAxis" },
];
/** 轨道坐标轴 graphic ID */
const ORBIT_AXIS_GRAPHIC_IDS = ["importSatelliteOrbitAxisX", "importSatelliteOrbitAxisY", "importSatelliteOrbitAxisZ"];
/** 轨道坐标轴配置：X 飞行方向、Y 轨道法线、Z 天底 */
const ORBIT_AXIS_CONFIG = [
  { id: "importSatelliteOrbitAxisX", label: "X", color: "#ff4444", axisKey: "xAxis" },
  { id: "importSatelliteOrbitAxisY", label: "Y", color: "#44ff44", axisKey: "yAxis" },
  { id: "importSatelliteOrbitAxisZ", label: "Z", color: "#4488ff", axisKey: "zAxis" },
];

const geoMapStore = useGeoMapStore();

/** 从动卫星坐标轴 TLE 推演缓存，避免每帧重建 SatelliteClass 列表 */
let importAxisEcefSortedSats = null;
let importAxisEcefTlesRef = null;
let importAxisEciSat = null;
let importAxisEciTleKey = null;

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

  const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  const graphic = satelliteLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  const graphicPath = satelliteLayer.getGraphicById(`${importSatelliteNoradID}ECI-path`);

  if (!graphic || !graphicPath) return;
  graphic.path.show = showImportSatelliteOrbit;
  graphicPath.path.show = showImportSatelliteOrbit;
  graphic.path.opacity = showImportSatelliteOrbit ? 0.5 : 0;
  graphicPath.path.opacity = showImportSatelliteOrbit ? 0.5 : 0;
}

// 切换主星轨道线显示状态
export function toggleThreatSatelliteOrbit(satelliteLayer, showThreatSatelliteOrbit) {
  if (!satelliteLayer) return;

  const threatSatelliteNoradID = geoMapStore.currentSceneConfig.threatSatelliteNoradID;
  const graphic = satelliteLayer.getGraphicById(`${threatSatelliteNoradID}ECI`);
  const graphicPath = satelliteLayer.getGraphicById(`${threatSatelliteNoradID}ECI-path`);

  if (!graphic || !graphicPath) return;
  graphic.path.show = showThreatSatelliteOrbit;
  graphicPath.path.show = showThreatSatelliteOrbit;
  graphic.path.opacity = showThreatSatelliteOrbit ? 0.5 : 0;
  graphicPath.path.opacity = showThreatSatelliteOrbit ? 0.5 : 0;
}

// 切换从星轨迹线显示状态
export function toggleImportSatelliteTrajectory(satelliteLayer, showImportSatelliteTrajectory) {
  if (!satelliteLayer) return;
  const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  const graphic = satelliteLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
  const graphicPath = satelliteLayer.getGraphicById(`${importSatelliteNoradID}ECEF-path`);
  if (!graphic || !graphicPath) return;
  graphic.path.show = showImportSatelliteTrajectory;
  graphicPath.path.show = showImportSatelliteTrajectory;
  graphic.path.opacity = showImportSatelliteTrajectory ? 0.5 : 0;
  graphicPath.path.opacity = showImportSatelliteTrajectory ? 0.5 : 0;
}

// 切换主星轨迹线显示状态
export function toggleThreatSatelliteTrajectory(satelliteLayer, showThreatSatelliteTrajectory) {
  if (!satelliteLayer) return;
  const threatSatelliteNoradID = geoMapStore.currentSceneConfig.threatSatelliteNoradID;
  const graphic = satelliteLayer.getGraphicById(`${threatSatelliteNoradID}ECEF`);
  const graphicPath = satelliteLayer.getGraphicById(`${threatSatelliteNoradID}ECEF-path`);
  if (!graphic || !graphicPath) return;
  graphic.path.show = showThreatSatelliteTrajectory;
  graphicPath.path.show = showThreatSatelliteTrajectory;
  graphic.path.opacity = showThreatSatelliteTrajectory ? 0.5 : 0;
  graphicPath.path.opacity = showThreatSatelliteTrajectory ? 0.5 : 0;
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

/**
 * 替换卫星轨迹时间
 * @param {Array} satelliteTrack - 卫星轨迹
 * @param {number} clockStartTime - 场景时钟开始时间
 * @param {number} clockEndTime - 场景时钟结束时间
 * @returns {Array} 替换后的卫星轨迹
 */
export function chunkSatelliteTrackByTimeECEF(satelliteTrackAll, clockStartTime, clockEndTime) {
  if (!satelliteTrackAll || !clockStartTime || !clockEndTime) return;

  const positionsECEF = [];
  for (let i = 0; i < satelliteTrackAll.length; i++) {
    const item = satelliteTrackAll[i];
    if (item.timeMs < clockStartTime) continue;
    if (item.timeMs > clockEndTime) break;

    const positionECEF = {
      time: item.time,
      lng: item.lon,
      lat: item.lat,
      alt: item.altKm * 1000,
    };
    positionsECEF.push(positionECEF);
  }
  return positionsECEF;
}

/**
 * 添加卫星轨迹线场景（ECEF 坐标系）
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {Map} satelliteTracks - 卫星轨迹
 * @param {number} clockStartTime - 场景时钟开始时间
 * @param {number} clockEndTime - 场景时钟结束时间
 * @returns {void}
 */
export function addSatelliteOrbitSceneECEF(satelliteSceneLayer, satelliteTracks, clockStartTime, clockEndTime, rebuild = false) {
  if (!satelliteSceneLayer || !satelliteTracks || !clockStartTime || !clockEndTime) return;

  for (const [key, value] of satelliteTracks) {
    if (rebuild) {
      const satellitePathGraphic = satelliteSceneLayer.getGraphicById(`${key}ECEF-path`);
      const satelliteGraphic = satelliteSceneLayer.getGraphicById(`${key}ECEF`);
      if (satellitePathGraphic) satelliteSceneLayer.removeGraphic(satellitePathGraphic);
      if (satelliteGraphic) satelliteSceneLayer.removeGraphic(satelliteGraphic);
    } else {
      if (satelliteSceneLayer.getGraphicById(`${key}ECEF`)) continue;
    }

    const positionsECEF = chunkSatelliteTrackByTimeECEF(value, clockStartTime, clockEndTime);

    // 卫星的轨迹线
    const satellitePathGraphic = new mars3d.graphic.Satellite({
      id: `${key}ECEF-path`,
      name: `${key}ECEF-path`,
      position: {
        type: "time",
        list: positionsECEF,
        forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        backwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
        interpolation: true,
        interpolationAlgorithm: mars3d.Cesium.LagrangePolynomialApproximation,
        interpolationDegree: 3,
      },
      path: {
        width: 1,
        color: "#0000ff",
        opacity: 0.5,
        materialType: mars3d.MaterialType.PolylineDash,
        materialOptions: {
          color: "#0000ff",
          dashLength: 6,
        },
      },
    });

    const satelliteGraphic = new mars3d.graphic.Satellite({
      id: `${key}ECEF`,
      name: `${key}ECEF`,
      position: {
        type: "time",
        list: positionsECEF,
        forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        backwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
        interpolation: true,
        interpolationAlgorithm: mars3d.Cesium.LagrangePolynomialApproximation,
        interpolationDegree: 3,
      },
      referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
      model: {
        url: "/assets/gltf/weixin.gltf",
        scale: 1,
        opacity: 1,
        minimumPixelSize: 90,
        mergeOrientation: false,
        heading: 0,
        pitch: 0,
        roll: 0,
      },
      label: {
        text: `${key}ECEF`,
        font_size: 16,
        font_family: "楷体",
        color: "#ffffff",
        opacity: 1,
        pixelOffsetX: 0,
        pixelOffsetY: -15,
      },
      path: {
        width: 1.5,
        color: "#0000ff",
        leadTime: 0,
        trailTime: 10 * 24 * 60 * 60, // 暂定10天，后面可以改为一个轨道周期
        opacity: 1,
      },
      point: {
        color: mars3d.Cesium.Color.RED,
        pixelSize: 6,
        outline: true,
        outlineColor: "#feec41",
        outlineWidth: 2,
      },
    });

    satelliteSceneLayer.addGraphic(satellitePathGraphic);
    satelliteSceneLayer.addGraphic(satelliteGraphic);

    satelliteGraphic._isSate = true;
    satellitePathGraphic._isSatePath = true;
  }
}

/**
 * 将卫星轨道转换为 ECI 坐标系（ECI 坐标系下的卫星轨迹）
 * @param {Array} satelliteTrackAll - 卫星轨迹
 * @param {number} clockStartTime - 场景时钟开始时间
 * @param {number} clockEndTime - 场景时钟结束时间
 * @returns {object} ECI 坐标系下的卫星轨迹
 */
export function chunkSatelliteTrackByTimeECI(satelliteTrackAll, clockStartTime, clockEndTime) {
  if (!satelliteTrackAll || !clockStartTime || !clockEndTime) return;

  const positionsECI = [];
  for (let i = 0; i < satelliteTrackAll.length; i++) {
    const item = satelliteTrackAll[i];
    if (item.timeMs < clockStartTime) continue;
    if (item.timeMs > clockEndTime) break;

    const positionECI = {
      time: item.time,
      lng: 0,
      lat: 0,
      alt: 0,
      _position: new mars3d.Cesium.Cartesian3(item.posEci.x * 1000, item.posEci.y * 1000, item.posEci.z * 1000),
    };
    positionsECI.push(positionECI);
  }
  return positionsECI;
}

/**
 * 添加卫星轨道线场景（ECI 坐标系）
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {Map} satelliteTracks - 卫星轨迹
 * @param {number} clockStartTime - 场景时钟开始时间
 * @param {number} clockEndTime - 场景时钟结束时间
 * @returns {void}
 */
export function addSatelliteOrbitSceneECI(satelliteSceneLayer, satelliteTracks, clockStartTime, clockEndTime) {
  if (!satelliteSceneLayer || !satelliteTracks || !clockStartTime || !clockEndTime) return;

  for (const [key, value] of satelliteTracks) {
    if (satelliteSceneLayer.getGraphicById(`${key}ECI`)) continue;
    const positionsECI = chunkSatelliteTrackByTimeECI(value, clockStartTime, clockEndTime);

    const satellitePathGraphic = new mars3d.graphic.Satellite({
      id: `${key}ECI-path`,
      name: `${key}ECI-path`,
      position: {
        type: "time",
        list: positionsECI,
        forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        backwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
        interpolation: true,
        interpolationAlgorithm: mars3d.Cesium.LagrangePolynomialApproximation,
        interpolationDegree: 3,
      },
      referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
      path: {
        width: 1,
        color: "#0000ff",
        opacity: 0.5,
        materialType: mars3d.MaterialType.PolylineDash,
        materialOptions: {
          color: "#0000ff",
          dashLength: 6.0,
        },
      },
    });

    const satelliteGraphic = new mars3d.graphic.Satellite({
      id: `${key}ECI`,
      name: `${key}ECI`,
      position: {
        type: "time",
        list: positionsECI,
        forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        backwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
        interpolation: true,
        interpolationAlgorithm: mars3d.Cesium.LagrangePolynomialApproximation,
        interpolationDegree: 3,
      },
      referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
      model: {
        url: "/assets/gltf/weixin.gltf",
        scale: 1,
        opacity: 1,
        minimumPixelSize: 90,
        mergeOrientation: false,
        heading: 0,
        pitch: 0,
        roll: 0,
      },
      label: {
        text: `${key}ECI`,
        font_size: 16,
        font_family: "楷体",
        color: "#ffffff",
        opacity: 1,
      },
      path: {
        width: 1.5,
        color: "#0000ff",
        leadTime: 0,
        trailTime: 10 * 24 * 60 * 60, // 暂定10天，后面可以改为一个轨道周期
        opacity: 1,
      },
      point: {
        show: true,
        color: "#ff0000",
        pixelSize: 6,
        outline: true,
        outlineColor: "#feec41",
        outlineWidth: 2,
      },
    });

    satelliteSceneLayer.addGraphic(satellitePathGraphic);
    satelliteSceneLayer.addGraphic(satelliteGraphic);

    satelliteGraphic._isSate = true;
    satellitePathGraphic._isSatePath = true;
  }
}

// 清除图层
export function removeSatelliteSceneLayer(satelliteSceneLayer) {
  if (!satelliteSceneLayer) return;
  satelliteSceneLayer.clear();
}

// 切换卫星传感器显示状态
export function toggleSatelliteSensor(satelliteSceneLayer, showSatelliteSensor) {
  if (!satelliteSceneLayer) return;

  if (showSatelliteSensor) {
    if (satelliteSceneLayer.getGraphicById("satelliteSensor")) return;

    const threatSatelliteNoradID = geoMapStore.currentSceneConfig.threatSatelliteNoradID;
    const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
    const threatGraphicLineECEF = satelliteSceneLayer.getGraphicById(`${threatSatelliteNoradID}ECEF`);
    const importGraphicLineECEF = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
    const threatGraphicLineECI = satelliteSceneLayer.getGraphicById(`${threatSatelliteNoradID}ECI`);
    const importGraphicLineECI = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
    const threatGraphic = threatGraphicLineECEF || threatGraphicLineECI;
    const importGraphic = importGraphicLineECEF || importGraphicLineECI;

    if (!threatGraphic || !importGraphic) return;

    const satelliteSensor = new mars3d.graphic.ConicSensor({
      id: "satelliteSensor",
      name: "satelliteSensor",
      position: threatGraphic.property,
      lookAt: importGraphic.property,
      style: {
        angle: 10,
        opacity: 0.3,
        color: "#7ef500",
        outline: true,
        outlineColor: "#e1e1e1",
        topOutlineShow: true,
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

    const threatSatelliteNoradID = geoMapStore.currentSceneConfig.threatSatelliteNoradID;
    const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
    const threatGraphicECEF = satelliteSceneLayer.getGraphicById(`${threatSatelliteNoradID}ECEF`);
    const importGraphicECEF = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
    const threatGraphicECI = satelliteSceneLayer.getGraphicById(`${threatSatelliteNoradID}ECI`);
    const importGraphicECI = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);

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

/**
 * 将 satellite.js 的 ECI 矢量（km 或 km/s）转为 Cesium Cartesian3（m）
 * @param {{x:number,y:number,z:number}} vec - ECI 矢量
 * @returns {object} Cesium Cartesian3
 */
// const eciKmToCartesian3 = (vec) => {
//   const Cesium = mars3d.Cesium;
//   return new Cesium.Cartesian3(vec.x * KM_TO_M, vec.y * KM_TO_M, vec.z * KM_TO_M);
// };

/**
 * 重置从动卫星坐标轴 TLE 推演缓存
 * @returns {void}
 */
// const resetImportAxisEciCache = () => {
//   importAxisEcefSortedSats = null;
//   importAxisEcefTlesRef = null;
//   importAxisEciSat = null;
//   importAxisEciTleKey = null;
// };

/**
 * 获取从动卫星在指定时刻的 ECI 位置与速度
 * @param {object} time - Cesium JulianDate
 * @param {object} importGraphic - 从动卫星 graphic
 * @returns {{ posEci: object, velEci: object }|null} ECI 状态（km / km/s）
 */
// const getImportSatelliteEciState = (time, importGraphic) => {
//   if (!time || !importGraphic) return null;

//   const date = mars3d.Cesium.JulianDate.toDate(time);
//   const isEciGraphic = importGraphic.id === "importSatelliteECI";

//   if (isEciGraphic && importGraphic.tle1 && importGraphic.tle2) {
//     const tleKey = `${importGraphic.tle1}|${importGraphic.tle2}`;
//     if (importAxisEciTleKey !== tleKey) {
//       importAxisEciSat = new SatelliteClass(importGraphic.tle1, importGraphic.tle2, "");
//       importAxisEciTleKey = tleKey;
//     }
//     return importAxisEciSat.getEciState(date);
//   }

//   const importTles = geoMapStore.currentSceneConfig?.importTles;
//   if (!importTles?.length) return null;

//   if (importAxisEcefTlesRef !== importTles) {
//     importAxisEcefSortedSats = buildSortedSatellites(importTles, "import");
//     importAxisEcefTlesRef = importTles;
//   }

//   const sat = pickSatByTime(importAxisEcefSortedSats, date.getTime());
//   return sat ? sat.getEciState(date) : null;
// };

/**
 * 在 ECI 中计算 LVLH 类正交基并变换到地固系
 * 本体系：X 沿速度（滚动）、Z 指向地心（偏航/对地）、Y = Z×X（俯仰/右侧）
 * 轨道系与本体系共用同一组基向量，仅语义标签不同
 * @param {object} time - Cesium JulianDate
 * @param {object} origin - 轴线原点（地固系 Cartesian3）
 * @param {{x:number,y:number,z:number}} posEciKm - ECI 位置（km）
 * @param {{x:number,y:number,z:number}} velEciKm - ECI 速度（km/s）
 * @returns {{ origin: object, xAxis: object, yAxis: object, zAxis: object }|null} 地固系单位向量
 */
// const computeLvvhFrameAxesFixed = (time, origin, posEciKm, velEciKm) => {
//   const Cesium = mars3d.Cesium;
//   if (!origin || !posEciKm || !velEciKm) return null;

//   const r = eciKmToCartesian3(posEciKm);
//   const v = eciKmToCartesian3(velEciKm);
//   const rMag = Cesium.Cartesian3.magnitude(r);
//   if (rMag < 1) return null;

//   const zAxis = Cesium.Cartesian3.negate(Cesium.Cartesian3.divideByScalar(r, rMag, new Cesium.Cartesian3()), new Cesium.Cartesian3());

//   const vDotZ = Cesium.Cartesian3.dot(v, zAxis);
//   const vProj = Cesium.Cartesian3.subtract(v, Cesium.Cartesian3.multiplyByScalar(zAxis, vDotZ, new Cesium.Cartesian3()), new Cesium.Cartesian3());
//   const vProjMag = Cesium.Cartesian3.magnitude(vProj);
//   if (vProjMag < 1e-6) return null;

//   const xAxis = Cesium.Cartesian3.divideByScalar(vProj, vProjMag, new Cesium.Cartesian3());
//   const yAxis = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(zAxis, xAxis, new Cesium.Cartesian3()), new Cesium.Cartesian3());

//   const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
//   if (!icrfToFixed) return null;

//   return {
//     origin,
//     xAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, xAxis, new Cesium.Cartesian3()),
//     yAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, yAxis, new Cesium.Cartesian3()),
//     zAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, zAxis, new Cesium.Cartesian3()),
//   };
// };

/**
 * 构造单根坐标轴线段端点
 * @param {object} origin - 起点（地固系）
 * @param {object} axisUnit - 轴单位向量（地固系）
 * @param {number} length - 轴长度（m）
 * @returns {Array} 线段端点 [origin, end]
 */
// const buildAxisLinePositions = (origin, axisUnit, length) => {
//   const Cesium = mars3d.Cesium;
//   if (!origin || !axisUnit) return [];

//   const end = Cesium.Cartesian3.add(origin, Cesium.Cartesian3.multiplyByScalar(axisUnit, length, new Cesium.Cartesian3()), new Cesium.Cartesian3());
//   return [origin, end];
// };

/**
 * 移除指定 ID 的坐标轴 graphic
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {string[]} graphicIds - graphic ID 列表
 * @returns {void}
 */
// const removeAxisGraphicsByIds = (satelliteSceneLayer, graphicIds) => {
//   if (!satelliteSceneLayer) return;

//   graphicIds.forEach((id) => {
//     const graphic = satelliteSceneLayer.getGraphicById(id);
//     if (graphic) satelliteSceneLayer.removeGraphic(graphic);
//   });
// };

/**
 * 创建单根从动卫星坐标轴折线
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {{ id: string, label: string, color: string, axisKey: string }} config - 轴配置
 * @param {number} axisLength - 轴长度（m）
 * @returns {object} Mars3D PolylineEntity
 */
// const createImportSatelliteAxisLineGraphic = (satelliteSceneLayer, config, axisLength, importGraphic) => {
//   const Cesium = mars3d.Cesium;
//   const { id, label, color, axisKey } = config;

//   return new mars3d.graphic.PolylineEntity({
//     id,
//     name: id,
//     positions: new Cesium.CallbackProperty((time) => {
//       const origin = importGraphic.positionShow;

//       const eciState = getImportSatelliteEciState(time, importGraphic);
//       if (!eciState) return [];

//       const axes = computeLvvhFrameAxesFixed(time, origin, eciState.posEci, eciState.velEci);
//       if (!axes) return [];

//       return buildAxisLinePositions(origin, axes[axisKey], axisLength);
//     }, false),
//     style: {
//       width: 2,
//       opacity: 1,
//       arcType: Cesium.ArcType.NONE,
//       material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(color)),
//       label: {
//         text: label,
//         font_size: 16,
//         font_family: "楷体",
//         color,
//         outline: true,
//         outlineColor: "#000000",
//         outlineWidth: 2,
//       },
//     },
//   });
// };

/**
 * 切换从动卫星本体坐标轴显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteCoordinateAxis - 是否显示本体坐标轴
 * @returns {void}
 */
export function toggleSatelliteCoordinateAxis(satelliteSceneLayer, showSatelliteCoordinateAxis) {
  if (!satelliteSceneLayer) return;

  // removeAxisGraphicsByIds(satelliteSceneLayer, BODY_AXIS_GRAPHIC_IDS);
  // resetImportAxisEciCache();

  // if (!showSatelliteCoordinateAxis) return;

  // const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  // const importGraphic =
  //   satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`) || satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  // if (!importGraphic) return;

  // BODY_AXIS_CONFIG.forEach((config) => {
  //   satelliteSceneLayer.addGraphic(createImportSatelliteAxisLineGraphic(satelliteSceneLayer, config, SATELLITE_AXIS_LENGTH, importGraphic));
  // });
}

/**
 * 切换从动卫星轨道坐标轴显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteOrbitCoordinateAxis - 是否显示轨道坐标轴
 * @returns {void}
 */
export function toggleSatelliteOrbitCoordinateAxis(satelliteSceneLayer, showSatelliteOrbitCoordinateAxis) {
  if (!satelliteSceneLayer) return;

  // removeAxisGraphicsByIds(satelliteSceneLayer, ORBIT_AXIS_GRAPHIC_IDS);
  // resetImportAxisEciCache();

  // if (!showSatelliteOrbitCoordinateAxis) return;

  // const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  // const importGraphic =
  //   satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`) || satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  // if (!importGraphic) return;

  // ORBIT_AXIS_CONFIG.forEach((config) => {
  //   satelliteSceneLayer.addGraphic(createImportSatelliteAxisLineGraphic(satelliteSceneLayer, config, SATELLITE_AXIS_LENGTH, importGraphic));
  // });
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

  const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  const importGraphicLine = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
  const importGraphicLineECI = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  const importGraphic = importGraphicLine || importGraphicLineECI;

  if (!importGraphic) return;

  const Cesium = mars3d.Cesium;

  const lightDirectionLine = new mars3d.graphic.PolylineEntity({
    id: "satelliteLightDirection",
    name: "satelliteLightDirection",
    positions: new Cesium.CallbackProperty((time) => {
      const satPosition = importGraphic.positionShow;
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
