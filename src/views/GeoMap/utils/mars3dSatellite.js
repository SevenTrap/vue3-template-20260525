import * as mars3d from "mars3d";
import * as satellite from "satellite.js";
import { useGeoMapStore } from "@/store/useGeoMapStore";
import { buildSatelliteClassEpochMap, pickSatByTime, calculateSatelliteRelativePosition, buildRelativeTrajectoryPositions } from "./satelliteCalculate";
import { getSunEciKm } from "@/utils/mars3d/mars3dSatellite";

const Cesium = mars3d.Cesium;
const geoMapStore = useGeoMapStore();

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
/** 轨道坐标轴配置：X 轨道切线(飞行方向)、Y 轨道法线(Z×X)、Z 指向地心(天底) */
const ORBIT_AXIS_CONFIG = [
  { id: "importSatelliteOrbitAxisX", label: "X", color: "#ff4444", axisKey: "xAxis" },
  { id: "importSatelliteOrbitAxisY", label: "Y", color: "#44ff44", axisKey: "yAxis" },
  { id: "importSatelliteOrbitAxisZ", label: "Z", color: "#4488ff", axisKey: "zAxis" },
];

/** 从动卫星轨道轴 TLE 历元缓存，避免每帧重建 SatelliteClass 列表 */
let importMotionTlesRef = null;
let importMotionEpochs = null;
let importMotionClasses = null;

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
 * 切换相对运动轨迹显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showRelativeTrajectories - 是否显示相对轨迹
 * @returns {void}
 */
export function toggleRelativeTrajectories(satelliteLayer, showRelativeTrajectories) {
  if (!satelliteLayer) return;

  const coordinate = geoMapStore.coordinate;
  const { clockStartTime, clockEndTime } = geoMapStore;
  const { threatSatelliteNoradID, importSatelliteNoradID } = geoMapStore.currentSceneConfig;
  const relativeTrajectoryId = `${threatSatelliteNoradID}-relative-trajectory`;
  const existingGraphic = satelliteLayer.getGraphicById(relativeTrajectoryId);
  if (existingGraphic) satelliteLayer.removeGraphic(existingGraphic);

  if (!showRelativeTrajectories) return;
  if (!clockStartTime || !clockEndTime) return;

  const threatTrack = geoMapStore.satelliteTracks.get(threatSatelliteNoradID);
  const importTrack = geoMapStore.satelliteTracks.get(importSatelliteNoradID);
  const importGraphicECEF = satelliteLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
  const importGraphicECI = satelliteLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  const importGraphic = coordinate === "ECEF" ? importGraphicECEF : importGraphicECI;
  if (!threatTrack || !importTrack || !importGraphic) return;

  const relativeTrack = calculateSatelliteRelativePosition(threatTrack, importTrack, clockStartTime, clockEndTime, coordinate);
  if (!relativeTrack.length) return;

  const relativePathGraphic = new mars3d.graphic.PolylineEntity({
    id: relativeTrajectoryId,
    name: relativeTrajectoryId,
    positions: new Cesium.CallbackProperty((time) => {
      const importPosition = importGraphic.positionShow;
      if (!importPosition) return [];
      return buildRelativeTrajectoryPositions(importPosition, relativeTrack, coordinate, time);
    }, false),
    style: {
      width: 2,
      color: "#ff6600",
      opacity: 0.8,
      arcType: Cesium.ArcType.NONE,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString("#ff6600").withAlpha(0.8),
        dashLength: 6,
      }),
    },
  });

  satelliteLayer.addGraphic(relativePathGraphic);
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

    const shortLineLength = 1_000_000;
    const scratchDirection = new Cesium.Cartesian3();
    const scratchOffset = new Cesium.Cartesian3();
    const scratchStartPos = new Cesium.Cartesian3();

    const imageDirectionLine = new mars3d.graphic.PolylineEntity({
      id: "satelliteImageDirection",
      name: "satelliteImageDirection",
      positions: new Cesium.CallbackProperty(() => {
        const threatPosition = threatGraphic.positionShow;
        const importPosition = importGraphic.positionShow;

        if (!threatPosition || !importPosition) return [];
        // 1. 计算两颗卫星的方向向量 (终点 - 起点)
        const direction = Cesium.Cartesian3.subtract(importPosition, threatPosition, scratchDirection);
        // 2. 归一化方向向量
        Cesium.Cartesian3.normalize(direction, direction);
        // 3. 计算偏离量：方向 * 长度
        const offset = Cesium.Cartesian3.multiplyByScalar(direction, shortLineLength, scratchOffset);
        // 4. 用终点减去偏移量，得到靠近终点的“新起点”
        const newStartPosition = Cesium.Cartesian3.subtract(importPosition, offset, scratchStartPos);
        return [Cesium.Cartesian3.clone(newStartPosition), Cesium.Cartesian3.clone(importPosition)];
      }, false),
      style: {
        width: 8,
        opacity: 1,
        arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString("#00ccff")),
        label: {
          text: "成像",
          font_size: 16,
          font_family: "楷体",
          color: "#00ccff",
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
 * 判断锚点卫星 graphic 是否处于惯性系渲染
 * @param {object} importGraphic - 从动卫星 graphic
 * @returns {boolean} 是否为惯性系
 */
const isInertialGraphic = (importGraphic) => {
  if (!importGraphic) return false;
  if (String(importGraphic.id).endsWith("ECI")) return true;
  return importGraphic.referenceFrame === mars3d.Cesium.ReferenceFrame.INERTIAL;
};

/**
 * 按当前场景坐标系获取从动卫星 graphic
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @returns {object|null} 从动卫星 graphic
 */
const getImportSatelliteGraphic = (satelliteSceneLayer) => {
  if (!satelliteSceneLayer) return null;

  const importSatelliteNoradID = geoMapStore.currentSceneConfig?.importSatelliteNoradID;
  if (!importSatelliteNoradID) return null;

  const suffix = geoMapStore.coordinate === "ECI" ? "ECI" : "ECEF";
  return (
    satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}${suffix}`) ||
    satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`) ||
    satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`)
  );
};

/**
 * 从 currentSceneConfig 获取从动卫星的两行根数列表
 * @returns {{ noradID: string, tles: Array }|null} NORAD ID 与 TLE 列表
 */
const getImportSatelliteTlesFromConfig = () => {
  const config = geoMapStore.currentSceneConfig;
  if (!config?.satelliteNoradIDs?.length || !config?.satelliteTles?.length) return null;

  const { importSatelliteNoradID, satelliteNoradIDs, satelliteTles } = config;
  const index = satelliteNoradIDs.indexOf(importSatelliteNoradID);
  if (index < 0) return null;

  const tles = satelliteTles[index];
  if (!tles?.length) return null;

  return { noradID: importSatelliteNoradID, tles };
};

/**
 * 确保从动卫星 TLE 历元缓存与场景配置一致
 * @param {string} noradID - 卫星 NORAD ID
 * @param {Array} tles - 两行根数列表
 * @returns {void}
 */
const ensureImportMotionEpochCache = (noradID, tles) => {
  if (importMotionTlesRef === tles) return;

  const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(noradID, tles);
  importMotionTlesRef = tles;
  importMotionEpochs = satelliteEpochs;
  importMotionClasses = satelliteClasses;
};

/**
 * 按当前时刻选取适用 TLE，实时计算从动卫星 ECI 位置与速度
 * @param {object} time - Cesium JulianDate
 * @returns {{ posEci: object, velEci: object }|null} ECI 状态（km / km/s）
 */
const getImportSatelliteMotionState = (time) => {
  if (!time) return null;

  const tlesInfo = getImportSatelliteTlesFromConfig();
  if (!tlesInfo) return null;

  const { noradID, tles } = tlesInfo;
  ensureImportMotionEpochCache(noradID, tles);

  const Cesium = mars3d.Cesium;
  const timeMs = Cesium.JulianDate.toDate(time).getTime();
  const currentEpoch = pickSatByTime(importMotionEpochs, timeMs);
  const satelliteClass = importMotionClasses.get(currentEpoch);
  if (!satelliteClass) return null;
  const state = satelliteClass.getEciState(new Date(timeMs));
  return state;
};

/**
 * 从 4×4 变换矩阵提取三轴单位向量
 * @param {object} modelMatrix - Cesium Matrix4
 * @returns {{ xAxis: object, yAxis: object, zAxis: object }} 三轴单位向量
 */
const extractAxesFromModelMatrix = (modelMatrix) => {
  const Cesium = mars3d.Cesium;
  const rotation = Cesium.Matrix4.getRotation(modelMatrix, new Cesium.Matrix3());
  return {
    xAxis: Cesium.Matrix3.getColumn(rotation, 0, new Cesium.Cartesian3()),
    yAxis: Cesium.Matrix3.getColumn(rotation, 1, new Cesium.Cartesian3()),
    zAxis: Cesium.Matrix3.getColumn(rotation, 2, new Cesium.Cartesian3()),
  };
};

/**
 * 将地固系轴向量变换到惯性系
 * @param {object} time - Cesium JulianDate
 * @param {object} axis - 地固系轴向量
 * @returns {object|null} 惯性系轴向量
 */
const fixedAxisToInertial = (time, axis) => {
  const Cesium = mars3d.Cesium;
  const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!icrfToFixed) return null;
  const fixedToIcrf = Cesium.Matrix3.transpose(icrfToFixed, new Cesium.Matrix3());
  return Cesium.Matrix3.multiplyByVector(fixedToIcrf, axis, new Cesium.Cartesian3());
};

/**
 * 计算本体坐标轴（基于 model 姿态）
 * @param {object} time - Cesium JulianDate
 * @param {object} origin - 轴线原点
 * @param {object} model - 卫星 model 配置
 * @param {boolean} isInertial - 是否惯性系渲染
 * @returns {{ origin: object, xAxis: object, yAxis: object, zAxis: object }|null} 三轴
 */
const computeBodyFrameAxes = (time, origin, model, isInertial) => {
  const Cesium = mars3d.Cesium;
  if (!origin || !model) return null;

  const heading = Cesium.Math.toRadians(model.heading ?? 0);
  const pitch = Cesium.Math.toRadians(model.pitch ?? 0);
  const roll = Cesium.Math.toRadians(model.roll ?? 0);
  const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);

  let fixedOrigin = origin;
  if (isInertial) {
    const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
    if (!icrfToFixed) return null;
    fixedOrigin = Cesium.Matrix3.multiplyByVector(icrfToFixed, origin, new Cesium.Cartesian3());
  }

  const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(fixedOrigin, hpr);
  const { xAxis, yAxis, zAxis } = extractAxesFromModelMatrix(modelMatrix);

  if (!isInertial) {
    return { origin, xAxis, yAxis, zAxis };
  }

  const xAxisInertial = fixedAxisToInertial(time, xAxis);
  const yAxisInertial = fixedAxisToInertial(time, yAxis);
  const zAxisInertial = fixedAxisToInertial(time, zAxis);
  if (!xAxisInertial || !yAxisInertial || !zAxisInertial) return null;

  return {
    origin,
    xAxis: xAxisInertial,
    yAxis: yAxisInertial,
    zAxis: zAxisInertial,
  };
};

/**
 * 在 ECI 中由位置/速度构造轨道运动坐标系
 * @param {object} originEci - ECI 原点（m）
 * @param {{x:number,y:number,z:number}} velEciKm - ECI 速度（km/s）
 * @returns {{ xAxis: object, yAxis: object, zAxis: object }|null} ECI 三轴单位向量
 */
const computeOrbitFrameAxesEci = (originEci, velEciKm) => {
  const Cesium = mars3d.Cesium;
  if (!originEci || !velEciKm) return null;

  const r = originEci;
  const v = new Cesium.Cartesian3(velEciKm.x * 1000, velEciKm.y * 1000, velEciKm.z * 1000);
  const rMag = Cesium.Cartesian3.magnitude(r);
  if (rMag < 1) return null;

  const zAxis = Cesium.Cartesian3.negate(Cesium.Cartesian3.divideByScalar(r, rMag, new Cesium.Cartesian3()), new Cesium.Cartesian3());

  const vDotZ = Cesium.Cartesian3.dot(v, zAxis);
  const vProj = Cesium.Cartesian3.subtract(v, Cesium.Cartesian3.multiplyByScalar(zAxis, vDotZ, new Cesium.Cartesian3()), new Cesium.Cartesian3());
  const vProjMag = Cesium.Cartesian3.magnitude(vProj);
  if (vProjMag < 1e-6) return null;

  const xAxis = Cesium.Cartesian3.divideByScalar(vProj, vProjMag, new Cesium.Cartesian3());
  const yAxis = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(zAxis, xAxis, new Cesium.Cartesian3()), new Cesium.Cartesian3());

  return { xAxis, yAxis, zAxis };
};

/**
 * 计算轨道坐标轴（基于实时运动方向）
 * @param {object} time - Cesium JulianDate
 * @param {object} origin - 轴线原点（地固系世界坐标，与 positionShow 一致）
 * @param {{x:number,y:number,z:number}} velEciKm - ECI 速度（km/s）
 * @param {boolean} isInertial - 是否惯性系渲染
 * @returns {{ origin: object, xAxis: object, yAxis: object, zAxis: object }|null} 三轴
 */
const computeOrbitFrameAxes = (time, origin, velEciKm, isInertial) => {
  const Cesium = mars3d.Cesium;
  if (!time || !origin) return null;

  const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!icrfToFixed) return null;
  const fixedToIcrf = Cesium.Matrix3.transpose(icrfToFixed, new Cesium.Matrix3());

  // positionShow 与光照来向一致，均为地固系世界坐标
  const originEci = Cesium.Matrix3.multiplyByVector(fixedToIcrf, origin, new Cesium.Cartesian3());

  const eciAxes = computeOrbitFrameAxesEci(originEci, velEciKm);
  if (!eciAxes) return null;

  if (isInertial) {
    return { origin: originEci, ...eciAxes };
  }

  return {
    origin,
    xAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, eciAxes.xAxis, new Cesium.Cartesian3()),
    yAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, eciAxes.yAxis, new Cesium.Cartesian3()),
    zAxis: Cesium.Matrix3.multiplyByVector(icrfToFixed, eciAxes.zAxis, new Cesium.Cartesian3()),
  };
};

/**
 * 构造单根坐标轴线段端点
 * @param {object} origin - 起点
 * @param {object} axisUnit - 轴单位向量
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
 * @param {{ id: string, label: string, color: string, axisKey: string }} config - 轴配置
 * @param {number} axisLength - 轴长度（m）
 * @param {object} importGraphic - 从动卫星 graphic
 * @param {boolean} isInertial - 是否惯性系
 * @param {Function} resolveAxesFn - 返回三轴的回调 (time) => axes|null
 * @returns {object} Mars3D PolylineEntity
 */
const createAxisLineGraphic = (config, axisLength, importGraphic, isInertial, resolveAxesFn) => {
  const Cesium = mars3d.Cesium;
  const { id, label, color, axisKey } = config;

  return new mars3d.graphic.PolylineEntity({
    id,
    name: id,
    referenceFrame: isInertial ? Cesium.ReferenceFrame.INERTIAL : Cesium.ReferenceFrame.FIXED,
    positions: new Cesium.CallbackProperty((time) => {
      const axes = resolveAxesFn(time);
      if (!axes) return [];

      const axisUnit = axes[axisKey];
      if (!axisUnit) return [];

      return buildAxisLinePositions(axes.origin, axisUnit, axisLength);
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
 * 切换指定坐标轴集合的显示状态（内部复用）
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} show - 是否显示
 * @param {string[]} graphicIds - graphic ID 列表
 * @param {Array} axisConfig - 轴配置列表
 * @param {Function} resolveAxesFn - (time, importGraphic, isInertial) => axes|null
 * @returns {void}
 */
const toggleImportSatelliteAxisSet = (satelliteSceneLayer, show, graphicIds, axisConfig, resolveAxesFn) => {
  removeAxisGraphicsByIds(satelliteSceneLayer, graphicIds);
  if (!show) return;

  const importGraphic = getImportSatelliteGraphic(satelliteSceneLayer);
  if (!importGraphic) return;

  const isInertial = isInertialGraphic(importGraphic);
  axisConfig.forEach((config) => {
    satelliteSceneLayer.addGraphic(
      createAxisLineGraphic(config, 5_000_000, importGraphic, isInertial, (time) => {
        const axes = resolveAxesFn(time, importGraphic, isInertial);
        return axes;
      }),
    );
  });
};

/**
 * 切换从动卫星本体坐标轴显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteCoordinateAxis - 是否显示本体坐标轴
 * @returns {void}
 */
export const toggleSatelliteCoordinateAxis = (satelliteSceneLayer, showSatelliteCoordinateAxis) => {
  if (!satelliteSceneLayer) return;

  toggleImportSatelliteAxisSet(satelliteSceneLayer, showSatelliteCoordinateAxis, BODY_AXIS_GRAPHIC_IDS, BODY_AXIS_CONFIG, (time, importGraphic, isInertial) => {
    const origin = importGraphic.positionShow;
    if (!origin) return null;
    return computeBodyFrameAxes(time, origin, importGraphic.model, isInertial);
  });
};

/**
 * 切换从动卫星轨道坐标轴显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteOrbitCoordinateAxis - 是否显示轨道坐标轴
 * @returns {void}
 */
export const toggleSatelliteOrbitCoordinateAxis = (satelliteSceneLayer, showSatelliteOrbitCoordinateAxis) => {
  if (!satelliteSceneLayer) return;

  toggleImportSatelliteAxisSet(
    satelliteSceneLayer,
    showSatelliteOrbitCoordinateAxis,
    ORBIT_AXIS_GRAPHIC_IDS,
    ORBIT_AXIS_CONFIG,
    (time, importGraphic, isInertial) => {
      const motionState = getImportSatelliteMotionState(time);
      if (!motionState) return null;
      const origin = importGraphic.positionShow;
      if (!origin) return null;
      return computeOrbitFrameAxes(time, origin, motionState.velEci, isInertial);
    },
  );
};

/**
 * 计算光照来向线段端点：起点沿太阳方向偏移，终点为卫星实时显示位置
 * @param {object} time - Cesium JulianDate
 * @param {object} satPosition - 卫星实时显示位置（Cartesian3，地固系）
 * @returns {Array} 线段端点数组
 */
const buildLightDirectionPositions = (time, satPosition) => {
  if (!satPosition) return [];

  const sunEciKm = getSunEciKm(Cesium.JulianDate.toDate(time));
  if (!sunEciKm) return [];

  const sunInertialM = new Cesium.Cartesian3(sunEciKm.x * 1000, sunEciKm.y * 1000, sunEciKm.z * 1000);
  const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!icrfToFixed) return [];

  const sunPosition = Cesium.Matrix3.multiplyByVector(icrfToFixed, sunInertialM, new Cesium.Cartesian3());
  if (!sunPosition) return [];

  const sunToSat = Cesium.Cartesian3.subtract(satPosition, sunPosition, new Cesium.Cartesian3());
  const magnitude = Cesium.Cartesian3.magnitude(sunToSat);
  if (!magnitude) return [];

  const direction = Cesium.Cartesian3.divideByScalar(sunToSat, magnitude, new Cesium.Cartesian3());
  const offset = Cesium.Cartesian3.multiplyByScalar(direction, 10_000_000, new Cesium.Cartesian3());
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
  if (existingLine) satelliteSceneLayer.removeGraphic(existingLine);
  if (!showSatelliteLightDirection) return;

  const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  const importGraphicLine = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
  const importGraphicLineECI = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  const importGraphic = importGraphicLine || importGraphicLineECI;

  if (!importGraphic) return;

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
      material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString("#ffff00")),
      label: {
        text: "光照",
        font_size: 16,
        font_family: "楷体",
        color: "#ffff00",
        outline: true,
        outlineColor: "#000000",
        outlineWidth: 2,
      },
    },
  });

  satelliteSceneLayer.addGraphic(lightDirectionLine);
}
