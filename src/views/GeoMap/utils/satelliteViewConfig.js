import * as mars3d from "mars3d";
import { globalViewer } from "@/utils/initEarth";
import { satelliteSceneLayer } from "./initMars3dLayers";
import { useGeoMapStore } from "@/store/useGeoMapStore";

const Cesium = mars3d.Cesium;
const geoMapStore = useGeoMapStore();
let icrfListener = null; // 当前 ICRF postUpdate 监听函数
let tickListener = null;
let lastOffset = new mars3d.Cesium.Cartesian3();
let isFirstFollow = true;
let distanceChangedVal = 0.01;

// 设置 ECEF 默认视角
export function setDefaultPoleECEF(satelliteLayer, noradID) {
  if (!satelliteLayer || !noradID) return;

  const graphic = satelliteLayer.getGraphicById(`${noradID}ECEF`);
  if (!graphic) return;

  globalViewer.flyToGraphic(graphic, {
    duration: 1.5,
    heading: 0,
    pitch: -90,
    roll: 0,
  });
}

// 设置 ECEF 南极俯视
export function setSouthPoleFrontECEF(satelliteLayer) {
  if (!satelliteLayer) return;

  globalViewer.camera.flyTo({
    destination: mars3d.Cesium.Cartesian3.fromDegrees(0, -90, 160_000_000),
    orientation: {
      heading: mars3d.Cesium.Math.toRadians(107.5),
      pitch: mars3d.Cesium.Math.toRadians(-90),
      roll: 0,
    },
    duration: 1.5,
  });
}

// 设置 ECEF 南极视角
export function setSouthPoleSideECEF(satelliteLayer, noradID) {
  if (!satelliteLayer || !noradID) return;

  const graphic = satelliteLayer.getGraphicById(`${noradID}ECEF`);
  if (!graphic) return;
  globalViewer.flyToGraphic(graphic, {
    duration: 1.5,
    heading: 0,
    pitch: 0,
    roll: 0,
  });

  globalViewer.trackedEntity = null;
}

// 设置 ECEF 恒星视角
export function setStarPoleECEF(satelliteLayer, noradID) {
  if (!satelliteLayer || !noradID) return;

  const graphic = satelliteLayer.getGraphicById(`${noradID}ECEF`);
  if (!graphic) return;

  globalViewer.flyToGraphic(graphic, {
    duration: 1.5,
    heading: 0,
    pitch: -89,
    roll: 0,
  });

  globalViewer.trackedEntity = graphic;
}

// 设置 ECI 默认视角
export function setDefaultPoleECI(satelliteLayer, noradID) {
  if (!satelliteLayer || !noradID) return;

  const graphic = satelliteLayer.getGraphicById(`${noradID}ECI`);
  if (!graphic) return;

  globalViewer.flyToGraphic(graphic, {
    scale: 1,
    heading: 0,
    pitch: -89,
    roll: 0,
  });
}

// 设置 ECI 南极俯视
export function setSouthPoleFrontECI(satelliteLayer) {
  if (!satelliteLayer) return;

  globalViewer.camera.flyTo({
    destination: mars3d.Cesium.Cartesian3.fromDegrees(107.5, -90, 160_000_000),
  });
}

// 解除 ECI 相机锁定（恢复 Fixed 系）
export const unlockCameraFromInertial = (viewer) => {
  if (!viewer) return;
  if (icrfListener) {
    viewer.scene.postUpdate.removeEventListener(icrfListener);
    icrfListener = null;
    isFirstFollow = true;
  }
  viewer.scene.camera.lookAtTransform(mars3d.Cesium.Matrix4.IDENTITY);
};

/**
 * 计算南极侧视初始相机偏移（ECI 局部系，从卫星指向地心）
 * @param {object} fixedToIcrf - Fixed 到 ICRF 的 3x3 旋转矩阵
 * @param {object} posA_fixed - 卫星 A 的地固坐标
 * @returns {object|undefined} ECI 局部系下的初始偏移
 */
const computeSouthPoleSideOffset = (fixedToIcrf, posA_fixed) => {
  if (!fixedToIcrf || !posA_fixed) return;
  const posB_fixed = mars3d.Cesium.Cartesian3.ZERO;
  const posA_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posA_fixed, new mars3d.Cesium.Cartesian3());
  const posB_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posB_fixed, new mars3d.Cesium.Cartesian3());
  const offsetEci = mars3d.Cesium.Cartesian3.subtract(posB_eci, posA_eci, new mars3d.Cesium.Cartesian3());
  return mars3d.Cesium.Cartesian3.multiplyByScalar(offsetEci, 0.3, new mars3d.Cesium.Cartesian3());
};

/**
 * 计算从星视角初始相机偏移（ECI 局部系）
 * @param {object} fixedToIcrf - Fixed 到 ICRF 的 3x3 旋转矩阵
 * @param {object} posA_fixed - 卫星 A 的地固坐标
 * @param {number} scale - 偏移缩放系数
 * @returns {object|undefined} ECI 局部系下的初始偏移
 */
const computeSatelliteViewOffset = (fixedToIcrf, posA_fixed, scale) => {
  if (!fixedToIcrf || !posA_fixed) return;
  const posA_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posA_fixed, new mars3d.Cesium.Cartesian3());
  return mars3d.Cesium.Cartesian3.multiplyByScalar(posA_eci, scale, new mars3d.Cesium.Cartesian3());
};

/**
 * 计算第一视角初始相机偏移（ECI 局部系，从 import 星指向 threat 星）
 * @param {object} fixedToIcrf - Fixed 到 ICRF 的 3x3 旋转矩阵
 * @param {object} posA_fixed - import 星的地固坐标
 * @param {object} posB_fixed - threat 星的地固坐标
 * @param {number} scale - 偏移缩放系数
 * @returns {object|undefined} ECI 局部系下的初始偏移
 */
const computeThreatViewOffset = (fixedToIcrf, posA_fixed, posB_fixed, scale) => {
  if (!fixedToIcrf || !posA_fixed || !posB_fixed) return;
  const posA_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posA_fixed, new mars3d.Cesium.Cartesian3());
  const posB_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posB_fixed, new mars3d.Cesium.Cartesian3());
  const offsetEci = mars3d.Cesium.Cartesian3.subtract(posB_eci, posA_eci, new mars3d.Cesium.Cartesian3());
  return mars3d.Cesium.Cartesian3.multiplyByScalar(offsetEci, scale, new mars3d.Cesium.Cartesian3());
};

/**
 * 每帧以卫星为原点跟随惯性系，保留用户相机偏移
 * @param {object} camera - Cesium Camera
 * @param {object} icrfToFixed - ICRF 到 Fixed 的 3x3 旋转矩阵
 * @param {object} posA_fixed - 卫星的地固坐标
 * @returns {void}
 */

const applyInertialFollowAtSatellite = (camera, icrfToFixed, posA_fixed) => {
  const transform = mars3d.Cesium.Matrix4.fromRotationTranslation(icrfToFixed, posA_fixed);
  const currentOffset = mars3d.Cesium.Cartesian3.clone(camera.position);

  if (isFirstFollow) {
    mars3d.Cesium.Cartesian3.clone(currentOffset, lastOffset);
    isFirstFollow = false;
  }
  const distanceChanged = mars3d.Cesium.Cartesian3.distance(currentOffset, lastOffset);

  if (distanceChanged > distanceChangedVal) {
    // 如果用户主动缩放/拖拽了，使用最新的 offset
    mars3d.Cesium.Cartesian3.clone(currentOffset, lastOffset);
    camera.lookAtTransform(transform, currentOffset);
  } else {
    // 2. 如果用户没有操作，使用上一次的 offset，避免每一帧因为浮点数误差导致 offset 微调产生抖动
    camera.lookAtTransform(transform, lastOffset);
  }

  // const offset = mars3d.Cesium.Cartesian3.clone(camera.position);
  // camera.lookAtTransform(transform, offset);
};

/**
 * 进入卫星中心惯性视角时设置初始相机位置
 * @param {object} viewer - mars3d viewer
 * @param {object} icrfToFixed - ICRF 到 Fixed 的 3x3 旋转矩阵
 * @param {object} posA_fixed - 卫星的地固坐标
 * @param {object} initialOffset - ECI 局部系下的初始偏移
 * @returns {void}
 */
const initInertialViewAtSatellite = (viewer, icrfToFixed, posA_fixed, initialOffset) => {
  const transform = mars3d.Cesium.Matrix4.fromRotationTranslation(icrfToFixed, posA_fixed);
  viewer.scene.camera.lookAtTransform(transform, initialOffset);
};

/**
 * ICRF 相机锁定：每帧把相机变换到惯性系，使地球自转、轨道静止
 * @param {object} scene - Cesium Scene
 * @param {object} time - Cesium.JulianDate
 * @returns {void}
 */
const icrfPostUpdate = (scene, time) => {
  if (!scene || !time) return;
  if (scene.mode !== mars3d.Cesium.SceneMode.SCENE3D) return;
  const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!mars3d.Cesium.defined(icrfToFixed)) return;
  const camera = scene.camera;
  const offset = mars3d.Cesium.Cartesian3.clone(camera.position);
  const transform = mars3d.Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
  camera.lookAtTransform(transform, offset);
};

/**
 * 启用 ECI 相机锁定（地球自转、轨道静止）
 * @param {object} viewer - mars3d 的 globalViewer
 * @returns {void}
 */
export const lockCameraToInertial = (viewer) => {
  if (!viewer) return;
  if (icrfListener) return;
  icrfListener = icrfPostUpdate;
  viewer.scene.postUpdate.addEventListener(icrfListener);
};

/**
 * 南极侧视 postUpdate：每帧更新 transform，保留用户拖动/缩放偏移
 * @param {object} scene - Cesium Scene
 * @param {object} time - Cesium.JulianDate
 * @returns {void}
 */
const icrfPostUpdateSouthPoleSide = (scene, time) => {
  if (!scene || !time) return;
  if (scene.mode !== mars3d.Cesium.SceneMode.SCENE3D) return;
  const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!mars3d.Cesium.defined(icrfToFixed)) return;

  const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  const satelliteGraphic = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  if (!satelliteGraphic?.positionShow) return;

  applyInertialFollowAtSatellite(scene.camera, icrfToFixed, satelliteGraphic.positionShow);
};

/**
 * 启用南极侧视 ECI 相机锁定
 * @param {object} viewer - mars3d 的 globalViewer
 * @returns {void}
 */
export const lockCameraToInertialSouthPoleSide = (satelliteLayer, noradID) => {
  if (!satelliteLayer || !noradID) return;

  const graphic = satelliteLayer.getGraphicById(`${noradID}ECI`);
  if (!graphic) return;
  globalViewer.flyToGraphic(graphic, {
    duration: 1.5,
    heading: 0,
    pitch: 0,
    roll: 0,
  });

  globalViewer.trackedEntity = null;
};
// export const lockCameraToInertialSouthPoleSide = (viewer) => {
//   if (!viewer || icrfListener) return;

//   const time = viewer.clock.currentTime;
//   const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
//   const fixedToIcrf = mars3d.Cesium.Transforms.computeFixedToIcrfMatrix(time);
//   if (!mars3d.Cesium.defined(icrfToFixed) || !mars3d.Cesium.defined(fixedToIcrf)) return;

//   const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
//   const satelliteGraphic = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
//   if (!satelliteGraphic?.positionShow) return;

//   const initialOffset = computeSouthPoleSideOffset(fixedToIcrf, satelliteGraphic.positionShow);
//   if (!initialOffset) return;

//   initInertialViewAtSatellite(viewer, icrfToFixed, satelliteGraphic.positionShow, initialOffset);
//   icrfListener = icrfPostUpdateSouthPoleSide;
//   viewer.scene.postUpdate.addEventListener(icrfListener);
// };

/**
 * 从星视角 postUpdate：每帧更新 transform，保留用户拖动/缩放偏移
 * @param {object} scene - Cesium Scene
 * @param {object} time - Cesium.JulianDate
 * @returns {void}
 */
const icrfPostUpdateSatellite = (scene, time) => {
  if (!scene || !time) return;
  if (scene.mode !== mars3d.Cesium.SceneMode.SCENE3D) return;
  const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!mars3d.Cesium.defined(icrfToFixed)) return;

  const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  const satelliteGraphic = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  if (!satelliteGraphic?.positionShow) return;

  applyInertialFollowAtSatellite(scene.camera, icrfToFixed, satelliteGraphic.positionShow);
};

/**
 * 启用从星视角 ECI 相机锁定
 * @param {object} viewer - mars3d 的 globalViewer
 * @returns {void}
 */
export const lockCameraToInertialSatellite = (satelliteLayer, noradID) => {
  if (!satelliteLayer || !noradID) return;

  const graphic = satelliteLayer.getGraphicById(`${noradID}ECI`);
  if (!graphic) return;

  globalViewer.flyToGraphic(graphic, {
    duration: 1.5,
    heading: 0,
    pitch: -89,
    roll: 0,
  });

  globalViewer.trackedEntity = graphic;
};
// export const lockCameraToInertialSatellite = (viewer) => {
//   if (!viewer || icrfListener) return;

//   const time = viewer.clock.currentTime;
//   const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
//   const fixedToIcrf = mars3d.Cesium.Transforms.computeFixedToIcrfMatrix(time);
//   if (!mars3d.Cesium.defined(icrfToFixed) || !mars3d.Cesium.defined(fixedToIcrf)) return;

//   const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
//   const satelliteGraphic = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
//   if (!satelliteGraphic?.positionShow) return;

//   const initialOffset = computeSatelliteViewOffset(fixedToIcrf, satelliteGraphic.positionShow, 0.3);
//   if (!initialOffset) return;

//   initInertialViewAtSatellite(viewer, icrfToFixed, satelliteGraphic.positionShow, initialOffset);
//   icrfListener = icrfPostUpdateSatellite;
//   viewer.scene.postUpdate.addEventListener(icrfListener);
// };

/**
 * 第一视角 postUpdate：每帧更新 transform，保留用户拖动/缩放偏移
 * @param {object} scene - Cesium Scene
 * @param {object} time - Cesium.JulianDate
 * @returns {void}
 */
const icrfPostUpdateSatelliteThreat = (scene, time) => {
  if (!scene || !time) return;
  if (scene.mode !== mars3d.Cesium.SceneMode.SCENE3D) return;
  const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!mars3d.Cesium.defined(icrfToFixed)) return;

  const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
  const importGraphic = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
  if (!importGraphic?.positionShow) return;

  applyInertialFollowAtSatellite(scene.camera, icrfToFixed, importGraphic.positionShow);
};

/**
 * 启用第一视角 ECI 相机锁定
 * @param {object} viewer - mars3d 的 globalViewer
 * @returns {void}
 */
export const lockCameraToInertialSatelliteThreat = (satelliteSceneLayer, importSatelliteNoradID, threatSatelliteNoradID) => {
  if (!satelliteSceneLayer || !importSatelliteNoradID) return;

  removeTickListener();

  tickListener = (clock) => {
    const importGraphic = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
    const threatGraphic = satelliteSceneLayer.getGraphicById(`${threatSatelliteNoradID}ECI`);
    if (!importGraphic || !threatGraphic) return;

    const importPosition = importGraphic.positionShow;
    const threatPosition = threatGraphic.positionShow;

    // 4. 使用 camera.setView 直接精确控制相机的位置和视线
    globalViewer.camera.setView({
      destination: threatPosition, // 相机位置锁定在 B 星
      orientation: {
        // 视线方向：从 B 指向 A
        direction: Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(importPosition, threatPosition, new Cesium.Cartesian3()), new Cesium.Cartesian3()),
        // 相机上方朝向：以 B 星顶部的天顶方向（地心指向B）作为 Up 向量
        up: Cesium.Cartesian3.normalize(importPosition, new Cesium.Cartesian3()),
      },
    });
  };

  globalViewer.clock.onTick.addEventListener(tickListener);
};

export function removeTickListener() {
  if (tickListener) {
    globalViewer.clock.onTick.removeEventListener(tickListener);
    tickListener = null;
  }
}
// export const lockCameraToInertialSatelliteThreat = (viewer) => {
//   if (!viewer || icrfListener) return;

//   const time = viewer.clock.currentTime;
//   const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
//   const fixedToIcrf = mars3d.Cesium.Transforms.computeFixedToIcrfMatrix(time);
//   if (!mars3d.Cesium.defined(icrfToFixed) || !mars3d.Cesium.defined(fixedToIcrf)) return;

//   const importSatelliteNoradID = geoMapStore.currentSceneConfig.importSatelliteNoradID;
//   const threatSatelliteNoradID = geoMapStore.currentSceneConfig.threatSatelliteNoradID;
//   const importGraphic = satelliteSceneLayer.getGraphicById(`${importSatelliteNoradID}ECI`);
//   const threatGraphic = satelliteSceneLayer.getGraphicById(`${threatSatelliteNoradID}ECI`);
//   if (!importGraphic?.positionShow || !threatGraphic?.positionShow) return;

//   const initialOffset = computeThreatViewOffset(fixedToIcrf, importGraphic.positionShow, threatGraphic.positionShow, 0.3);
//   if (!initialOffset) return;

//   initInertialViewAtSatellite(viewer, icrfToFixed, importGraphic.positionShow, initialOffset);
//   icrfListener = icrfPostUpdateSatelliteThreat;
//   viewer.scene.postUpdate.addEventListener(icrfListener);
// };
