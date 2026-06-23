import * as mars3d from "mars3d";

import { useGeoMapStore } from "@/store/useGeoMapStore";
import { calculateSatelliteRelativePosition, buildRelativeTrajectoryPositions, getSatelliteEciStateAtTime } from "./satelliteCalculate";
import { getSunEci } from "@/utils/mars3d";

const Cesium = mars3d.Cesium;
const geoMapStore = useGeoMapStore();

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
 * 切换从动卫星本体坐标轴显示状态
 * @param {object} satelliteSceneLayer - 卫星场景图层
 * @param {boolean} showSatelliteCoordinateAxis - 是否显示本体坐标轴
 * @returns {void}
 */
export const toggleSatelliteCoordinateAxis = (satelliteSceneLayer, showSatelliteCoordinateAxis) => {
  if (!satelliteSceneLayer) return;

  const { importSatelliteNoradID, satelliteNoradIDs, satelliteTles } = geoMapStore.currentSceneConfig;

  const index = satelliteNoradIDs.indexOf(importSatelliteNoradID);
  if (index < 0) return;
  const tles = satelliteTles[index];
  if (!tles?.length) return;

  const bodyAxisGraphicIdsX = `${importSatelliteNoradID}BodyAxisX`;
  const bodyAxisGraphicIdsY = `${importSatelliteNoradID}BodyAxisY`;
  const bodyAxisGraphicIdsZ = `${importSatelliteNoradID}BodyAxisZ`;

  const bodyAxisGraphicX = satelliteSceneLayer.getGraphicById(bodyAxisGraphicIdsX);
  const bodyAxisGraphicY = satelliteSceneLayer.getGraphicById(bodyAxisGraphicIdsY);
  const bodyAxisGraphicZ = satelliteSceneLayer.getGraphicById(bodyAxisGraphicIdsZ);

  if (bodyAxisGraphicX) satelliteSceneLayer.removeGraphic(bodyAxisGraphicX);
  if (bodyAxisGraphicY) satelliteSceneLayer.removeGraphic(bodyAxisGraphicY);
  if (bodyAxisGraphicZ) satelliteSceneLayer.removeGraphic(bodyAxisGraphicZ);

  if (!showSatelliteCoordinateAxis) return;

  const importGraphicECEF = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
  const importGraphicECI = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  const importGraphic = importGraphicECEF || importGraphicECI;
  if (!importGraphic) return;

  const axisConfigs = [
    {
      id: bodyAxisGraphicIdsX,
      label: "本体-X",
      color: "#ff3333", // 红色
      localDirection: new Cesium.Cartesian3(1, 0, 0),
    },
    {
      id: bodyAxisGraphicIdsY,
      label: "本体-Y",
      color: "#33ff33", // 绿色
      localDirection: new Cesium.Cartesian3(0, 1, 0),
    },
    {
      id: bodyAxisGraphicIdsZ,
      label: "本体-Z",
      color: "#3333ff", // 蓝色
      localDirection: new Cesium.Cartesian3(0, 0, 1),
    },
  ];

  axisConfigs.forEach((config) => {
    // 为每个轴单独创建闭包 Scratch 变量，避免每帧 new 产生 GC 压力，同时防止多轴计算相互干扰
    const scratchMatrix = new Cesium.Matrix4();
    const scratchHpr = new Cesium.HeadingPitchRoll();
    const scratchLocalOffset = new Cesium.Cartesian3();
    const scratchEndPosition = new Cesium.Cartesian3();

    // 预先计算该轴在局部坐标系下的长度偏移向量
    Cesium.Cartesian3.multiplyByScalar(config.localDirection, 10_000_000, scratchLocalOffset);

    const axisGraphic = new mars3d.graphic.PolylineEntity({
      id: config.id,
      name: config.id,
      positions: new Cesium.CallbackProperty((time) => {
        // const currentState = getSatelliteEciStateAtTime(importSatelliteNoradID, tles, time);

        // const position = {
        //   x: currentState.posEcf.x * 1000,
        //   y: currentState.posEcf.y * 1000,
        //   z: currentState.posEcf.z * 1000,
        // };
        const position = importGraphic.positionShow; // 卫星当前实时世界坐标
        const model = importGraphic.model;

        if (!position || !model) return [];

        // 将角度转为弧度并更新 HPR 缓存
        scratchHpr.heading = Cesium.Math.toRadians(model.heading || 0);
        scratchHpr.pitch = Cesium.Math.toRadians(model.pitch || 0);
        scratchHpr.roll = Cesium.Math.toRadians(model.roll || 0);

        // 计算“局部坐标系”到“地球固定坐标系(ECEF)”的转换矩阵
        const transformMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
          position,
          scratchHpr,
          Cesium.Ellipsoid.WGS84,
          Cesium.Transforms.eastNorthUpToFixedFrame,
          scratchMatrix,
        );

        // 使用矩阵将局部轴向端点，转换到世界坐标系下的绝对点
        Cesium.Matrix4.multiplyByPoint(transformMatrix, scratchLocalOffset, scratchEndPosition);

        // 返回 [卫星当前点, 轴向端点]。使用 clone 确保 Cesium 底层能检测到位置的实时变化
        return [Cesium.Cartesian3.clone(position), Cesium.Cartesian3.clone(scratchEndPosition)];
      }, false),
      style: {
        width: 8, // 稍微加粗，带箭头的线更明显
        opacity: 1,
        arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(config.color)),
        label: {
          text: config.label,
          font_size: 16,
          font_family: "楷体",
          color: config.color,
          outline: true,
          outlineColor: "#000000",
          outlineWidth: 2,
        },
      },
    });

    satelliteSceneLayer.addGraphic(axisGraphic);
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

  const { importSatelliteNoradID, satelliteNoradIDs, satelliteTles } = geoMapStore.currentSceneConfig;
  const index = satelliteNoradIDs.indexOf(importSatelliteNoradID);
  if (index < 0) return;
  const tles = satelliteTles[index];
  if (!tles?.length) return;

  const orbitAxisGraphicIdsX = `${importSatelliteNoradID}OrbitAxisX`;
  const orbitAxisGraphicIdsY = `${importSatelliteNoradID}OrbitAxisY`;
  const orbitAxisGraphicIdsZ = `${importSatelliteNoradID}OrbitAxisZ`;

  const orbitAxisGraphicX = satelliteSceneLayer.getGraphicById(orbitAxisGraphicIdsX);
  const orbitAxisGraphicY = satelliteSceneLayer.getGraphicById(orbitAxisGraphicIdsY);
  const orbitAxisGraphicZ = satelliteSceneLayer.getGraphicById(orbitAxisGraphicIdsZ);

  if (orbitAxisGraphicX) satelliteSceneLayer.removeGraphic(orbitAxisGraphicX);
  if (orbitAxisGraphicY) satelliteSceneLayer.removeGraphic(orbitAxisGraphicY);
  if (orbitAxisGraphicZ) satelliteSceneLayer.removeGraphic(orbitAxisGraphicZ);

  if (!showSatelliteOrbitCoordinateAxis) return;

  const importGraphicECEF = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
  const importGraphicECI = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  const importGraphic = importGraphicECEF || importGraphicECI;
  if (!importGraphic) return;

  const axisConfigs = [
    {
      id: orbitAxisGraphicIdsX,
      label: "轨道-X",
      color: "#ff3333", // 红色
      type: "X",
      localDirection: new Cesium.Cartesian3(1, 0, 0),
    },
    {
      id: orbitAxisGraphicIdsY,
      label: "轨道-Y",
      color: "#33ff33", // 绿色
      type: "Y",
      localDirection: new Cesium.Cartesian3(0, 1, 0),
    },
    {
      id: orbitAxisGraphicIdsZ,
      label: "轨道-Z",
      color: "#3333ff", // 蓝色
      type: "Z",
      localDirection: new Cesium.Cartesian3(0, 0, 1),
    },
  ];

  axisConfigs.forEach((config) => {
    const scratchPosEci = new Cesium.Cartesian3();
    const scratchVelEci = new Cesium.Cartesian3();
    const scratchPosEcf = new Cesium.Cartesian3();

    const scratchX = new Cesium.Cartesian3();
    const scratchY = new Cesium.Cartesian3();
    const scratchZ = new Cesium.Cartesian3();

    const scratchIcrfToFixed = new Cesium.Matrix3();
    const scratchDirectionEcef = new Cesium.Cartesian3();
    const scratchOffset = new Cesium.Cartesian3();
    const scratchEndPosition = new Cesium.Cartesian3();

    const axisGraphic = new mars3d.graphic.PolylineEntity({
      id: config.id,
      name: config.id,
      positions: new Cesium.CallbackProperty((time) => {
        // 1. 获取当前卫星的实时 state 位置
        const currentState = getSatelliteEciStateAtTime(importSatelliteNoradID, tles, time);
        const currentSatECEF = importGraphic.positionShow;
        if (!currentState || !currentState.posEci || !currentState.velEci || !currentState.posEcf) return [];

        // 2. 提取基础数据并将单位从千米(km)转换为米(m)
        Cesium.Cartesian3.fromElements(currentState.posEci.x * 1000, currentState.posEci.y * 1000, currentState.posEci.z * 1000, scratchPosEci);
        Cesium.Cartesian3.fromElements(currentState.velEci.x * 1000, currentState.velEci.y * 1000, currentState.velEci.z * 1000, scratchVelEci);
        // Cesium.Cartesian3.fromElements(currentState.posEcf.x * 1000, currentState.posEcf.y * 1000, currentState.posEcf.z * 1000, scratchPosEcf);
        Cesium.Cartesian3.fromElements(currentSatECEF.x, currentSatECEF.y, currentSatECEF.z, scratchPosEcf);

        // 3. 在惯性系（ECI）中通过向量叉乘构建三轴标准单位向量
        // X 轴：沿速度方向 (In-track)
        Cesium.Cartesian3.normalize(scratchVelEci, scratchX);

        // Z 轴：轨道面法线方向 (Cross-track) = 归一化(位置 × 速度)
        Cesium.Cartesian3.cross(scratchPosEci, scratchVelEci, scratchZ);
        Cesium.Cartesian3.normalize(scratchZ, scratchZ);

        // Y 轴：径向向内方向 (Radial) = Z 轴 × X 轴
        Cesium.Cartesian3.cross(scratchZ, scratchX, scratchY);

        // 4. 根据当前轴的类型，提取对应的 ECI 方向向量
        let targetDirectionEci;
        if (config.type === "X") targetDirectionEci = scratchX;
        else if (config.type === "Y") targetDirectionEci = scratchY;
        else targetDirectionEci = scratchZ;

        // 5. 核心步骤：因为 Mars3D 地图渲染使用的是地球固定系（ECEF），需要将 ECI 向量旋转到 ECEF
        const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time, scratchIcrfToFixed);
        if (!icrfToFixed) return [];
        Cesium.Matrix3.multiplyByVector(icrfToFixed, targetDirectionEci, scratchDirectionEcef);

        // 6. 计算线段终点：当前卫星的 ECEF 位置 + (ECEF方向 * 轴长)
        Cesium.Cartesian3.multiplyByScalar(scratchDirectionEcef, 10_000_000, scratchOffset);
        Cesium.Cartesian3.add(scratchPosEcf, scratchOffset, scratchEndPosition);

        // 7. 返回 [卫星当前世界坐标, 轴向端点绝对坐标]
        return [Cesium.Cartesian3.clone(scratchPosEcf), Cesium.Cartesian3.clone(scratchEndPosition)];
      }, false),
      style: {
        width: 4,
        opacity: 1,
        arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(config.color)),
        label: {
          text: config.label,
          font_size: 16,
          font_family: "楷体",
          color: config.color,
          outline: true,
          outlineColor: "#000000",
          outlineWidth: 2,
        },
      },
    });
    satelliteSceneLayer.addGraphic(axisGraphic);
  });
};

/**
 * 以卫星为中心，实时建立轨道全向坐标轴（含负轴）及三个轴面的完整 Grid 网格（跨四个象限）
 * @param {Object} satelliteSceneLayer Mars3D 图层对象
 * @param {Boolean} showGrid 是否显示网格和坐标轴
 */
export const toggleSatelliteLocalGridSystem = (satelliteSceneLayer, showGrid) => {
  if (!satelliteSceneLayer) return;

  const { importSatelliteNoradID, satelliteNoradIDs, satelliteTles } = geoMapStore.currentSceneConfig;
  const index = satelliteNoradIDs.indexOf(importSatelliteNoradID);
  if (index < 0) return;
  const tles = satelliteTles[index];
  if (!tles?.length) return;

  const importGraphicECEF = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECEF`);
  const importGraphicECI = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  const importGraphic = importGraphicECEF || importGraphicECI;
  if (!importGraphic) return;

  // 定义所有需要创建的 Graphic ID
  const gridIds = {
    axisX: `${importSatelliteNoradID}OrbitGrid_AxisX`,
    axisY: `${importSatelliteNoradID}OrbitGrid_AxisY`,
    axisZ: `${importSatelliteNoradID}OrbitGrid_AxisZ`,
    planeXY: `${importSatelliteNoradID}OrbitGrid_PlaneXY_All`,
    planeYZ: `${importSatelliteNoradID}OrbitGrid_PlaneYZ_All`,
    planeXZ: `${importSatelliteNoradID}OrbitGrid_PlaneXZ_All`,
  };

  // 1. 清理旧的图形
  Object.values(gridIds).forEach((id) => {
    const oldGraphic = satelliteSceneLayer.getGraphicById(id);
    if (oldGraphic) satelliteSceneLayer.removeGraphic(oldGraphic);
  });

  if (!showGrid) return;

  // 2. 局部网格参数配置 (单位：米)
  const maxRange = 100_000; // 延伸到 100km
  const step = 10_000; // 间隔 10km

  // 3. 基础坐标轴配置（双向绘制：从 -100km 到 +100km）
  const axisConfigs = [
    { id: gridIds.axisX, label: "轨道-X", color: "#ff3333", type: "X" },
    { id: gridIds.axisY, label: "轨道-Y", color: "#33ff33", type: "Y" },
    { id: gridIds.axisZ, label: "轨道-Z", color: "#3333ff", type: "Z" },
  ];

  // 4. 三个完整网格面的颜色配置
  const planeConfigs = [
    { id: gridIds.planeXY, color: "rgba(255,255,51,0.35)", planeType: "XY" }, // 黄色
    { id: gridIds.planeYZ, color: "rgba(51,255,255,0.35)", planeType: "YZ" }, // 青色
    { id: gridIds.planeXZ, color: "rgba(255,51,255,0.35)", planeType: "XZ" }, // 紫色
  ];

  // ================= 核心数学计算公共方法 =================
  const scratchPosEci = new Cesium.Cartesian3();
  const scratchVelEci = new Cesium.Cartesian3();
  const scratchPosEcf = new Cesium.Cartesian3();
  const scratchX = new Cesium.Cartesian3();
  const scratchY = new Cesium.Cartesian3();
  const scratchZ = new Cesium.Cartesian3();
  const scratchIcrfToFixed = new Cesium.Matrix3();

  const getOrbitBaseFrame = (time) => {
    const currentState = getSatelliteEciStateAtTime(importSatelliteNoradID, tles, time);
    const currentSatECEF = importGraphic.positionShow;
    if (!currentState || !currentState.posEci || !currentState.velEci || !currentState.posEcf) return null;

    Cesium.Cartesian3.fromElements(currentState.posEci.x * 1000, currentState.posEci.y * 1000, currentState.posEci.z * 1000, scratchPosEci);
    Cesium.Cartesian3.fromElements(currentState.velEci.x * 1000, currentState.velEci.y * 1000, currentState.velEci.z * 1000, scratchVelEci);
    // Cesium.Cartesian3.fromElements(currentState.posEcf.x * 1000, currentState.posEcf.y * 1000, currentState.posEcf.z * 1000, scratchPosEcf);
    Cesium.Cartesian3.fromElements(currentSatECEF.x, currentSatECEF.y, currentSatECEF.z, scratchPosEcf);

    Cesium.Cartesian3.normalize(scratchVelEci, scratchX);
    Cesium.Cartesian3.cross(scratchPosEci, scratchVelEci, scratchZ);
    Cesium.Cartesian3.normalize(scratchZ, scratchZ);
    Cesium.Cartesian3.cross(scratchZ, scratchX, scratchY);

    const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time, scratchIcrfToFixed);
    if (!icrfToFixed) return null;

    const ecefX = new Cesium.Cartesian3();
    const ecefY = new Cesium.Cartesian3();
    const ecefZ = new Cesium.Cartesian3();
    Cesium.Matrix3.multiplyByVector(icrfToFixed, scratchX, ecefX);
    Cesium.Matrix3.multiplyByVector(icrfToFixed, scratchY, ecefY);
    Cesium.Matrix3.multiplyByVector(icrfToFixed, scratchZ, ecefZ);

    return { centerEcef: Cesium.Cartesian3.clone(scratchPosEcf), ecefX, ecefY, ecefZ };
  };

  const convertLocalToEcef = (localX, localY, localZ, frame, resultCartesian) => {
    const offsetX = Cesium.Cartesian3.multiplyByScalar(frame.ecefX, localX, new Cesium.Cartesian3());
    const offsetY = Cesium.Cartesian3.multiplyByScalar(frame.ecefY, localY, new Cesium.Cartesian3());
    const offsetZ = Cesium.Cartesian3.multiplyByScalar(frame.ecefZ, localZ, new Cesium.Cartesian3());

    Cesium.Cartesian3.add(frame.centerEcef, offsetX, resultCartesian);
    Cesium.Cartesian3.add(resultCartesian, offsetY, resultCartesian);
    Cesium.Cartesian3.add(resultCartesian, offsetZ, resultCartesian);
    return resultCartesian;
  };

  // ================= 渲染 1: 贯穿正负轴的坐标轴线 =================
  axisConfigs.forEach((config) => {
    const axisGraphic = new mars3d.graphic.PolylineEntity({
      id: config.id,
      name: config.id,
      positions: new Cesium.CallbackProperty((time) => {
        const frame = getOrbitBaseFrame(time);
        if (!frame) return [];

        const startPos = new Cesium.Cartesian3();
        const endPos = new Cesium.Cartesian3();

        // 轴线改为从 -maxRange 绘制到 +maxRange，使轴线贯穿整个网格面
        if (config.type === "X") {
          convertLocalToEcef(-maxRange, 0, 0, frame, startPos);
          convertLocalToEcef(maxRange + 10_000, 0, 0, frame, endPos);
        } else if (config.type === "Y") {
          convertLocalToEcef(0, -maxRange, 0, frame, startPos);
          convertLocalToEcef(0, maxRange + 10_000, 0, frame, endPos);
        } else {
          convertLocalToEcef(0, 0, -maxRange, frame, startPos);
          convertLocalToEcef(0, 0, maxRange + 10_000, frame, endPos);
        }

        return [startPos, endPos];
      }, false),
      style: {
        width: 4,
        arcType: Cesium.ArcType.NONE,
        // 这里沿用箭头材质，箭头会在 +100km 正半轴端点显示。如果不需要箭头，可直接换成普通颜色材质
        material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(config.color)),
        label: {
          text: config.label,
          font_size: 14,
          font_family: "楷体",
          color: config.color,
          outline: true,
          outlineColor: "#000000",
          outlineWidth: 2,
        },
      },
    });
    satelliteSceneLayer.addGraphic(axisGraphic);
  });

  // ================= 渲染 2: 跨越正负轴的全向 Grid 网格 =================
  /**
   * 核心修改：生成从 -maxRange 到 +maxRange 的全向网格点集
   */
  const generateLocalGridPointsAllQuadrants = (planeType) => {
    const points = [];
    let count = 0;

    // 1. 扫描平行于B轴的平行线 (A轴从 -maxRange 变动到 maxRange)
    for (let a = -maxRange; a <= maxRange; a += step) {
      if (count % 2 === 0) {
        points.push({ a: a, b: -maxRange }, { a: a, b: maxRange });
      } else {
        points.push({ a: a, b: maxRange }, { a: a, b: -maxRange });
      }
      count++;
    }

    // 回到左下角起点，准备交叉扫描
    points.push({ a: -maxRange, b: -maxRange });
    count = 0;

    // 2. 扫描平行于A轴的平行线 (B轴从 -maxRange 变动到 maxRange)
    for (let b = -maxRange; b <= maxRange; b += step) {
      if (count % 2 === 0) {
        points.push({ a: -maxRange, b: b }, { a: maxRange, b: b });
      } else {
        points.push({ a: maxRange, b: b }, { a: -maxRange, b: b });
      }
      count++;
    }

    // 映射到三维局部轴面
    return points.map((p) => {
      if (planeType === "XY") return [p.a, p.b, 0];
      if (planeType === "YZ") return [0, p.a, p.b];
      return [p.a, 0, p.b]; // XZ
    });
  };

  planeConfigs.forEach((config) => {
    const localTemplate = generateLocalGridPointsAllQuadrants(config.planeType);
    const resultPositions = Array.from({ length: localTemplate.length }, () => new Cesium.Cartesian3());

    const gridPlaneGraphic = new mars3d.graphic.PolylineEntity({
      id: config.id,
      name: config.id,
      positions: new Cesium.CallbackProperty((time) => {
        const frame = getOrbitBaseFrame(time);
        if (!frame) return [];

        for (let i = 0; i < localTemplate.length; i++) {
          const loc = localTemplate[i];
          convertLocalToEcef(loc[0], loc[1], loc[2], frame, resultPositions[i]);
        }
        return resultPositions;
      }, false),
      style: {
        width: 1,
        color: config.color,
        arcType: Cesium.ArcType.NONE,
        material: mars3d.MaterialUtil.createMaterialProperty(mars3d.MaterialType.PolylineDash, {
          color: config.color,
          dashLength: 6, // 适当缩短虚线间隔，全向网格大范围下看起来更紧凑精致
        }),
      },
    });
    satelliteSceneLayer.addGraphic(gridPlaneGraphic);
  });
};

/**
 * 计算光照来向线段端点：起点沿太阳方向偏移，终点为卫星实时显示位置
 * @param {object} time - Cesium JulianDate
 * @param {object} satPosition - 卫星实时显示位置（Cartesian3，地固系）
 * @returns {Array} 线段端点数组
 */
const buildLightDirectionPositions = (time, satPosition) => {
  if (!satPosition) return [];

  const sunEciKm = getSunEci(Cesium.JulianDate.toDate(time));
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
