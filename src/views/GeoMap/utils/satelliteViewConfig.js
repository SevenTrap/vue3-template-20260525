import * as mars3d from "mars3d";
import { globalViewer } from "@/utils/initEarth";
import { satelliteSceneLayer } from "./initMars3dLayers";
import { useGeoMapStore } from "@/store/useGeoMapStore";

let icrfListener = null; // 当前 ICRF postUpdate 监听函数

// 设置 ECEF 默认视角
export function setDefaultPoleECEF(satelliteLayer, satelliteID) {
  if (!satelliteLayer) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  globalViewer.flyToGraphic(graphic, {
    duration: 1.5,
    heading: 0,
    pitch: -89,
    roll: 0,
  });
}

// 设置 ECEF 南极正视
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

// 设置 ECEF 南极侧视
export function setSouthPoleSideECEF(satelliteLayer, satelliteID) {
  if (!satelliteLayer || !satelliteID) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  graphic.flyToPoint({
    scale: 0.8,
    heading: 180,
    pitch: 89,
    roll: 0,
  });

  globalViewer.trackedEntity = graphic;
}

// 设置 ECEF 恒星视角
export function setStarPoleECEF(satelliteLayer, satelliteID) {
  if (!satelliteLayer || !satelliteID) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  graphic.flyToPoint({
    scale: 1,
    heading: 0,
    pitch: -90,
    roll: 0,
  });

  globalViewer.trackedEntity = graphic;
}

// 设置 ECI 默认视角
export function setDefaultPoleECI(satelliteLayer, satelliteID) {
  if (!satelliteLayer || !satelliteID) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  graphic.flyToPoint({
    scale: 1,
    heading: 0,
    pitch: -89,
    roll: 0,
  });
}

// 设置 ECI 南极正视
export function setSouthPoleFrontECI(satelliteLayer) {
  if (!satelliteLayer) return;

  globalViewer.camera.flyTo({
    destination: mars3d.Cesium.Cartesian3.fromDegrees(0, -90, 160_000_000),
    orientation: {
      heading: mars3d.Cesium.Math.toRadians(107.5),
      pitch: mars3d.Cesium.Math.toRadians(-90),
      roll: 0,
    },
  });
}

// 设置 ECI 南极侧视
export function setSouthPoleSideECI(satelliteLayer, satelliteID) {
  if (!satelliteLayer || !satelliteID) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  graphic.flyToPoint({
    scale: 0.6,
    heading: 180,
    pitch: 89,
    roll: 0,
  });

  // globalViewer.trackedEntity = graphic.trackedEntity;
}

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

// 南极侧视
const icrfPostUpdateSouthPoleSide = (scene, time) => {
  if (!scene || !time) return;
  if (scene.mode !== mars3d.Cesium.SceneMode.SCENE3D) return;
  const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
  const fixedToIcrf = mars3d.Cesium.Transforms.computeFixedToIcrfMatrix(time);
  if (!mars3d.Cesium.defined(fixedToIcrf)) return;
  if (!mars3d.Cesium.defined(icrfToFixed)) return;
  const camera = scene.camera;
  const satelliteGraphic = satelliteSceneLayer.getGraphicById("importSatellite");

  if (!satelliteGraphic) return;

  const posA_fixed = satelliteGraphic.positionShow;
  const posB_fixed = new mars3d.Cesium.Cartesian3(0, 0, 0);
  if (!posA_fixed || !posB_fixed) return;

  const posA_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posA_fixed, new mars3d.Cesium.Cartesian3());
  const posB_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posB_fixed, new mars3d.Cesium.Cartesian3());

  // 4. 在 ECI 坐标系下计算 B 相对 A 的偏移向量 (从A指向B)
  const offsetEci = mars3d.Cesium.Cartesian3.subtract(posB_eci, posA_eci, new mars3d.Cesium.Cartesian3());
  const offsetEciCloser = mars3d.Cesium.Cartesian3.multiplyByScalar(offsetEci, 0.3, new mars3d.Cesium.Cartesian3());

  // 5. 构建以 A 卫星为中心、轴向平齐惯性系的 4x4 变换矩阵
  const transform = mars3d.Cesium.Matrix4.fromRotationTranslation(icrfToFixed, posA_fixed);

  camera.lookAtTransform(transform, offsetEciCloser);

  const localSouthPole = new mars3d.Cesium.Cartesian3(0, 0, -1);

  // ① 重新计算相机的右方向 (Right = Direction x SouthPole)
  mars3d.Cesium.Cartesian3.cross(camera.direction, localSouthPole, camera.right);

  // 防御性编程：如果视线刚好与南北极重合（叉乘为0），强行赋一个正轴防止画面崩溃
  if (mars3d.Cesium.Cartesian3.magnitudeSquared(camera.right) < 0.000001) {
    mars3d.Cesium.Cartesian3.clone(mars3d.Cesium.Cartesian3.UNIT_X, camera.right);
  }
  mars3d.Cesium.Cartesian3.normalize(camera.right, camera.right);

  // ② 重新计算相机的上方向 (Up = Right x Direction)，此时头顶彻底对准南极
  mars3d.Cesium.Cartesian3.cross(camera.right, camera.direction, camera.up);
  mars3d.Cesium.Cartesian3.normalize(camera.up, camera.up);
};

// 从星视角
const icrfPostUpdateSatellite = (scene, time) => {
  if (!scene || !time) return;
  if (scene.mode !== mars3d.Cesium.SceneMode.SCENE3D) return;
  const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
  const fixedToIcrf = mars3d.Cesium.Transforms.computeFixedToIcrfMatrix(time);
  if (!mars3d.Cesium.defined(fixedToIcrf)) return;
  if (!mars3d.Cesium.defined(icrfToFixed)) return;
  const camera = scene.camera;
  const satelliteGraphic = satelliteSceneLayer.getGraphicById("importSatellite");
  if (!satelliteGraphic) return;

  const posA_fixed = satelliteGraphic.positionShow;
  if (!posA_fixed) return;

  const posA_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posA_fixed, new mars3d.Cesium.Cartesian3());
  const offsetEci = mars3d.Cesium.Cartesian3.multiplyByScalar(posA_eci, 0.3, new mars3d.Cesium.Cartesian3());

  const transform = mars3d.Cesium.Matrix4.fromRotationTranslation(icrfToFixed, posA_fixed);
  camera.lookAtTransform(transform, offsetEci);
};

// 第一视角
const icrfPostUpdateSatelliteThreat = (scene, time) => {
  if (!scene || !time) return;
  if (scene.mode !== mars3d.Cesium.SceneMode.SCENE3D) return;
  const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
  const fixedToIcrf = mars3d.Cesium.Transforms.computeFixedToIcrfMatrix(time);

  if (!mars3d.Cesium.defined(fixedToIcrf)) return;
  if (!mars3d.Cesium.defined(icrfToFixed)) return;
  const camera = scene.camera;
  const importGraphic = satelliteSceneLayer.getGraphicById("importSatellite");
  const threatGraphic = satelliteSceneLayer.getGraphicById("threatSatellite");

  if (!importGraphic || !threatGraphic) return;
  threatGraphic.model.show = false;
  importGraphic.model.show = true;
  const posA_fixed = importGraphic.positionShow;
  const posB_fixed = threatGraphic.positionShow;

  if (!posA_fixed || !posB_fixed) return;
  const posA_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posA_fixed, new mars3d.Cesium.Cartesian3());
  const posB_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posB_fixed, new mars3d.Cesium.Cartesian3());

  const offsetEci = mars3d.Cesium.Cartesian3.subtract(posB_eci, posA_eci, new mars3d.Cesium.Cartesian3());
  const offsetEciCloser = mars3d.Cesium.Cartesian3.multiplyByScalar(offsetEci, 0.1, new mars3d.Cesium.Cartesian3());

  const transform = mars3d.Cesium.Matrix4.fromRotationTranslation(icrfToFixed, posA_fixed);

  camera.lookAtTransform(transform, offsetEciCloser);
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

// 南极侧视
export const lockCameraToInertialSouthPoleSide = (viewer) => {
  if (!viewer) return;
  if (icrfListener) return;
  icrfListener = icrfPostUpdateSouthPoleSide;
  viewer.scene.postUpdate.addEventListener(icrfListener);
};

// 从星视角锁定
export const lockCameraToInertialSatellite = (viewer) => {
  if (!viewer) return;
  if (icrfListener) return;
  icrfListener = icrfPostUpdateSatellite;
  viewer.scene.postUpdate.addEventListener(icrfListener);
};

// 第一视角锁定
export const lockCameraToInertialSatelliteThreat = (viewer) => {
  if (!viewer) return;
  if (icrfListener) return;
  icrfListener = icrfPostUpdateSatelliteThreat;
  viewer.scene.postUpdate.addEventListener(icrfListener);
};

// 解除 ECI 相机锁定（恢复 Fixed 系）
export const unlockCameraFromInertial = (viewer) => {
  if (!viewer) return;
  if (icrfListener) {
    viewer.scene.postUpdate.removeEventListener(icrfListener);
    icrfListener = null;
  }
  viewer.scene.camera.lookAtTransform(mars3d.Cesium.Matrix4.IDENTITY);
};
