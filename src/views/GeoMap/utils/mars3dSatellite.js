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
export function addSatelliteOrbitSceneECEF(satelliteSceneLayer, satelliteTracks, clockStartTime, clockEndTime) {
  if (!satelliteSceneLayer || !satelliteTracks || !clockStartTime || !clockEndTime) return;

  for (const [key, value] of satelliteTracks) {
    if (satelliteSceneLayer.getGraphicById(`${key}ECEF`)) continue;
    const positionsECEF = chunkSatelliteTrackByTimeECEF(value, clockStartTime, clockEndTime);

    const satellitePathGraphic = new mars3d.graphic.PolylinePrimitive({
      id: `${key}ECEF-path`,
      name: `${key}ECEF-path`,
      positions: positionsECEF,
      style: {
        width: 1,
        opacity: 0.5,
        materialType: mars3d.MaterialType.PolylineDash,
        materialOptions: {
          color: "#0000ff",
          dashLength: 8.0,
        },
      },
    });

    const satelliteGraphic = new mars3d.graphic.ModelEntity({
      id: `${key}ECEF`,
      name: `${key}ECEF`,
      position: {
        type: "time",
        timeField: "time",
        list: positionsECEF,
        forwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        backwardExtrapolationType: mars3d.Cesium.ExtrapolationType.HOLD,
        referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
        interpolation: true,
        interpolationAlgorithm: mars3d.Cesium.LagrangePolynomialApproximation,
        interpolationDegree: 3,
      },
      referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED,
      style: {
        url: "/assets/gltf/weixin.gltf",
        scale: 1,
        opacity: 1,
        minimumPixelSize: 90,
        mergeOrientation: false,
        heading: 0,
        pitch: 0,
        roll: 0,
        label: {
          text: `${key}ECEF`,
          font_size: 16,
          font_family: "楷体",
          color: "#ffffff",
          opacity: 1,
        },
      },
      path: {
        width: 1.5,
        color: "#0000ff",
        leadTime: 0,
        trailTime: 1 * 24 * 60 * 60, // 暂定1天，后面可以改为一个轨道周期
        opacity: 1,
      },
      point: {
        color: mars3d.Cesium.Color.RED,
        pixelSize: 10,
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

  const positionProperty = new mars3d.Cesium.SampledPositionProperty(mars3d.Cesium.ReferenceFrame.INERTIAL);
  positionProperty.forwardExtrapolationType = mars3d.Cesium.ExtrapolationType.HOLD;
  positionProperty.backwardExtrapolationType = mars3d.Cesium.ExtrapolationType.HOLD;

  for (let i = 0; i < satelliteTrackAll.length; i++) {
    const item = satelliteTrackAll[i];
    if (item.timeMs < clockStartTime) continue;
    if (item.timeMs > clockEndTime) break;

    const positionECI = new mars3d.Cesium.Cartesian3(item.posEci.x * 1000, item.posEci.y * 1000, item.posEci.z * 1000);
    const julianDate = mars3d.Cesium.JulianDate.fromDate(new Date(item.timeMs));
    positionProperty.addSample(julianDate, positionECI);
  }

  positionProperty.setInterpolationOptions({
    interpolationDegree: 3,
    interpolationAlgorithm: mars3d.Cesium.LagrangePolynomialApproximation,
  });
  return positionProperty;
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
    const positionProperty = chunkSatelliteTrackByTimeECI(value, clockStartTime, clockEndTime);

    const satellitePathGraphic = new mars3d.graphic.ModelEntity({
      id: `${key}ECI-path`,
      name: `${key}ECI-path`,
      position: positionProperty,
      referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
      path: {
        width: 1,
        color: "#0000ff",
        isAll: true,
        opacity: 0.5,
        materialType: mars3d.MaterialType.PolylineDash,
        materialOptions: {
          color: "#0000ff",
          dashLength: 8.0,
        },
      },
    });

    const satelliteGraphic = new mars3d.graphic.ModelEntity({
      id: `${key}ECI`,
      name: `${key}ECI`,
      position: positionProperty,
      referenceFrame: mars3d.Cesium.ReferenceFrame.INERTIAL,
      style: {
        url: "/assets/gltf/weixin.gltf",
        scale: 1,
        opacity: 1,
        minimumPixelSize: 90,
        mergeOrientation: false,
        heading: 0,
        pitch: 0,
        roll: 0,
        label: {
          text: `${key}ECI`,
          font_size: 16,
          font_family: "楷体",
          color: "#ffffff",
          opacity: 1,
        },
      },
      path: {
        width: 1.5,
        color: "#0000ff",
        leadTime: 10 * 24 * 60 * 60,
        trailTime: 10 * 24 * 60 * 60, // 暂定10天，后面可以改为一个轨道周期
        opacity: 1,
      },
      point: {
        color: "#ff0000",
        pixelSize: 10,
      },
    });

    satelliteSceneLayer.addGraphic(satellitePathGraphic);
    satelliteSceneLayer.addGraphic(satelliteGraphic);

    satelliteGraphic._isSate = true;
    satellitePathGraphic._isSatePath = true;
  }
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

/**
 * 将 satellite.js 的 ECI 矢量（km 或 km/s）转为 Cesium Cartesian3（m）
 * @param {{x:number,y:number,z:number}} vec - ECI 矢量
 * @returns {object} Cesium Cartesian3
 */
const eciKmToCartesian3 = (vec) => {
  const Cesium = mars3d.Cesium;
  return new Cesium.Cartesian3(vec.x * KM_TO_M, vec.y * KM_TO_M, vec.z * KM_TO_M);
};

/**
 * 重置从动卫星坐标轴 TLE 推演缓存
 * @returns {void}
 */
const resetImportAxisEciCache = () => {
  importAxisEcefSortedSats = null;
  importAxisEcefTlesRef = null;
  importAxisEciSat = null;
  importAxisEciTleKey = null;
};

/**
 * 获取从动卫星在指定时刻的 ECI 位置与速度
 * @param {object} time - Cesium JulianDate
 * @param {object} importGraphic - 从动卫星 graphic
 * @returns {{ posEci: object, velEci: object }|null} ECI 状态（km / km/s）
 */
const getImportSatelliteEciState = (time, importGraphic) => {
  if (!time || !importGraphic) return null;

  const date = mars3d.Cesium.JulianDate.toDate(time);
  const isEciGraphic = importGraphic.id === "importSatelliteECI";

  if (isEciGraphic && importGraphic.tle1 && importGraphic.tle2) {
    const tleKey = `${importGraphic.tle1}|${importGraphic.tle2}`;
    if (importAxisEciTleKey !== tleKey) {
      importAxisEciSat = new SatelliteClass("import", importGraphic.tle1, importGraphic.tle2);
      importAxisEciTleKey = tleKey;
    }
    return importAxisEciSat.getEciState(date);
  }

  const importTles = geoMapStore.currentSceneConfig?.importTles;
  if (!importTles?.length) return null;

  if (importAxisEcefTlesRef !== importTles) {
    importAxisEcefSortedSats = buildSortedSatellites(importTles, "import");
    importAxisEcefTlesRef = importTles;
  }

  const sat = pickSatByTime(importAxisEcefSortedSats, date.getTime());
  return sat ? sat.getEciState(date) : null;
};

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
const computeLvvhFrameAxesFixed = (time, origin, posEciKm, velEciKm) => {
  const Cesium = mars3d.Cesium;
  if (!origin || !posEciKm || !velEciKm) return null;

  const r = eciKmToCartesian3(posEciKm);
  const v = eciKmToCartesian3(velEciKm);
  const rMag = Cesium.Cartesian3.magnitude(r);
  if (rMag < 1) return null;

  const zAxis = Cesium.Cartesian3.negate(Cesium.Cartesian3.divideByScalar(r, rMag, new Cesium.Cartesian3()), new Cesium.Cartesian3());

  const vDotZ = Cesium.Cartesian3.dot(v, zAxis);
  const vProj = Cesium.Cartesian3.subtract(v, Cesium.Cartesian3.multiplyByScalar(zAxis, vDotZ, new Cesium.Cartesian3()), new Cesium.Cartesian3());
  const vProjMag = Cesium.Cartesian3.magnitude(vProj);
  if (vProjMag < 1e-6) return null;

  const xAxis = Cesium.Cartesian3.divideByScalar(vProj, vProjMag, new Cesium.Cartesian3());
  const yAxis = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(zAxis, xAxis, new Cesium.Cartesian3()), new Cesium.Cartesian3());

  const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!icrfToFixed) return null;

  return {
    origin,
    xAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, xAxis, new Cesium.Cartesian3()),
    yAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, yAxis, new Cesium.Cartesian3()),
    zAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, zAxis, new Cesium.Cartesian3()),
  };
};

/**
 * 构造单根坐标轴线段端点
 * @param {object} origin - 起点（地固系）
 * @param {object} axisUnit - 轴单位向量（地固系）
 * @param {number} length - 轴长度（m）
 * @returns {Array} 线段端点 [origin, end]
 */
const buildAxisLinePositions = (origin, axisUnit, length) => {
  const Cesium = mars3d.Cesium;
  if (!origin || !axisUnit) return [];

  const end = Cesium.Cartesian3.add(origin, Cesium.Cartesian3.multiplyByScalar(axisUnit, length, new Cesium.Cartesian3()), new Cesium.Cartesian3());
  return [origin, end];
};

/**
 * 移除指定 ID 的坐标轴 graphic
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {string[]} graphicIds - graphic ID 列表
 * @returns {void}
 */
const removeAxisGraphicsByIds = (satelliteSceneLayer, graphicIds) => {
  if (!satelliteSceneLayer) return;

  graphicIds.forEach((id) => {
    const graphic = satelliteSceneLayer.getGraphicById(id);
    if (graphic) satelliteSceneLayer.removeGraphic(graphic);
  });
};

/**
 * 创建单根从动卫星坐标轴折线
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {{ id: string, label: string, color: string, axisKey: string }} config - 轴配置
 * @param {number} axisLength - 轴长度（m）
 * @returns {object} Mars3D PolylineEntity
 */
const createImportSatelliteAxisLineGraphic = (satelliteSceneLayer, config, axisLength) => {
  const Cesium = mars3d.Cesium;
  const { id, label, color, axisKey } = config;

  return new mars3d.graphic.PolylineEntity({
    id,
    name: id,
    positions: new Cesium.CallbackProperty((time) => {
      const satGraphic = satelliteSceneLayer.getGraphicById("importSatelliteECEF") || satelliteSceneLayer.getGraphicById("importSatelliteECI");
      if (!satGraphic) return [];

      const origin = satGraphic.positionShow;
      if (!origin) return [];

      const eciState = getImportSatelliteEciState(time, satGraphic);
      if (!eciState) return [];

      const axes = computeLvvhFrameAxesFixed(time, origin, eciState.posEci, eciState.velEci);
      if (!axes) return [];

      return buildAxisLinePositions(origin, axes[axisKey], axisLength);
    }, false),
    style: {
      width: 2,
      opacity: 1,
      arcType: Cesium.ArcType.NONE,
      material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(color)),
      label: {
        text: label,
        font_size: 16,
        font_family: "楷体",
        color,
        outline: true,
        outlineColor: "#000000",
        outlineWidth: 2,
      },
    },
  });
};

/**
 * 切换从动卫星本体坐标轴显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteCoordinateAxis - 是否显示本体坐标轴
 * @returns {void}
 */
export function toggleSatelliteCoordinateAxis(satelliteSceneLayer, showSatelliteCoordinateAxis) {
  if (!satelliteSceneLayer) return;

  removeAxisGraphicsByIds(satelliteSceneLayer, BODY_AXIS_GRAPHIC_IDS);
  resetImportAxisEciCache();

  if (!showSatelliteCoordinateAxis) return;

  const importGraphic = satelliteSceneLayer.getGraphicById("importSatelliteECEF") || satelliteSceneLayer.getGraphicById("importSatelliteECI");
  if (!importGraphic) return;

  BODY_AXIS_CONFIG.forEach((config) => {
    satelliteSceneLayer.addGraphic(createImportSatelliteAxisLineGraphic(satelliteSceneLayer, config, SATELLITE_AXIS_LENGTH));
  });
}

/**
 * 切换从动卫星轨道坐标轴显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteOrbitCoordinateAxis - 是否显示轨道坐标轴
 * @returns {void}
 */
export function toggleSatelliteOrbitCoordinateAxis(satelliteSceneLayer, showSatelliteOrbitCoordinateAxis) {
  if (!satelliteSceneLayer) return;

  removeAxisGraphicsByIds(satelliteSceneLayer, ORBIT_AXIS_GRAPHIC_IDS);
  resetImportAxisEciCache();

  if (!showSatelliteOrbitCoordinateAxis) return;

  const importGraphic = satelliteSceneLayer.getGraphicById("importSatelliteECEF") || satelliteSceneLayer.getGraphicById("importSatelliteECI");
  if (!importGraphic) return;

  ORBIT_AXIS_CONFIG.forEach((config) => {
    satelliteSceneLayer.addGraphic(createImportSatelliteAxisLineGraphic(satelliteSceneLayer, config, SATELLITE_AXIS_LENGTH));
  });
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
