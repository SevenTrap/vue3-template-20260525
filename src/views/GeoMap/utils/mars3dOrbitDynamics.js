import * as mars3d from "mars3d";
import { satelliteSceneLayer } from "./initMars3dLayers";

const KM_TO_M = 1000;
const DEFAULT_STEP_MS = 60 * 60 * 1000; // 默认轨道外推步长 1 小时
const ORBIT_LAYER_ID = "orbitDynamicsLayer";
const ORBIT_LINE_PREFIX = "orbitLine";
const SATELLITE_GRAPHIC_PREFIX = "orbitSatellite";

let orbitLayer = null; // mars3d.layer.GraphicLayer
let icrfListener = null; // 当前 ICRF postUpdate 监听函数

/**
 * 确保 orbit 图层已挂载到 viewer
 * @param {object} viewer - mars3d 的 globalViewer
 * @returns {object} mars3d.layer.GraphicLayer
 */
export const ensureOrbitLayer = (viewer) => {
  if (!viewer) return null;
  if (orbitLayer && !orbitLayer.isDestroy) return orbitLayer;
  orbitLayer = new mars3d.layer.GraphicLayer({
    id: ORBIT_LAYER_ID,
    name: "轨道动力学图层",
  });
  viewer.addLayer(orbitLayer);
  return orbitLayer;
};

/**
 * 销毁 orbit 图层（页面卸载时调用）
 * @param {object} viewer - mars3d 的 globalViewer
 * @returns {void}
 */
export const destroyOrbitLayer = (viewer) => {
  if (!orbitLayer) return;
  if (viewer && !orbitLayer.isDestroy) viewer.removeLayer(orbitLayer);
  if (!orbitLayer.isDestroy) orbitLayer.destroy();
  orbitLayer = null;
};

/**
 * 清空 orbit 图层中的所有 graphic（保留图层本体）
 * @returns {void}
 */
export const clearOrbitGraphics = () => {
  if (!orbitLayer || orbitLayer.isDestroy) return;
  orbitLayer.clear();
};

/**
 * 拼接卫星 graphic 的 id
 * @param {string|number} noradID - 卫星 NORAD ID
 * @returns {string}
 */
const buildSatelliteId = (noradID) => `${SATELLITE_GRAPHIC_PREFIX}-${noradID}`;

/**
 * 拼接轨道线 graphic 的 id
 * @param {string|number} noradID - 卫星 NORAD ID
 * @returns {string}
 */
const buildOrbitLineId = (noradID) => `${ORBIT_LINE_PREFIX}-${noradID}`;

/**
 * 将 satellite.js 输出的 km 单位位置转换为 Cesium.Cartesian3（米）
 * @param {{ x: number, y: number, z: number }} pos - km 单位的位置
 * @returns {object} Cesium.Cartesian3
 */
const kmToCartesian3 = (pos) => new mars3d.Cesium.Cartesian3(pos.x * KM_TO_M, pos.y * KM_TO_M, pos.z * KM_TO_M);

/**
 * 创建 ECEF 模式下的轨道线（一个周期，地固系下高轨呈现 8 字）
 * @param {object} satelliteClass - SatelliteClass 实例
 * @param {Date} startDate - 起始时间 UTC
 * @param {number} [step=DEFAULT_STEP_MS] - 步长（毫秒）
 * @returns {object} mars3d.graphic.PolylinePrimitive
 */
const createEcefOrbitLine = (satelliteClass, startDate, step = DEFAULT_STEP_MS) => {
  const states = satelliteClass.getEcfStatesByPeriod(startDate, step);
  const positions = states.map((s) => kmToCartesian3(s.posEcf));

  return new mars3d.graphic.PolylinePrimitive({
    id: buildOrbitLineId(satelliteClass.noradID),
    positions,
    style: {
      width: 2,
      color: "#00ffcc",
      arcType: mars3d.Cesium.ArcType.NONE,
      clampToGround: false,
    },
  });
};

/**
 * 创建 ECI 模式下的"标准圆"轨道线
 * 通过 CallbackProperty 每帧将静态 ECI 坐标变换到当前 Fixed 系；
 * 配合 ICRF 相机锁定后，视觉上轨道静止、地球自转
 * @param {object} satelliteClass - SatelliteClass 实例
 * @returns {object} mars3d.graphic.PolylinePrimitive
 */
const createEciOrbitLine = (satelliteClass) => {
  const eciSamples = satelliteClass.getCircularOrbitEciSamples(180);
  const eciPositions = eciSamples.map((p) => new mars3d.Cesium.Cartesian3(p.x, p.y, p.z));

  const positionsCallback = new mars3d.Cesium.CallbackProperty((time) => {
    const icrfToFixed = mars3d.Cesium.Transforms.computeIcrfToFixedMatrix(time);
    if (!icrfToFixed) return eciPositions;
    return eciPositions.map((p) => mars3d.Cesium.Matrix3.multiplyByVector(icrfToFixed, p, new mars3d.Cesium.Cartesian3()));
  }, false);

  return new mars3d.graphic.PolylinePrimitive({
    id: buildOrbitLineId(satelliteClass.noradID),
    positions: positionsCallback,
    style: {
      width: 2,
      color: "#ffcc00",
      arcType: mars3d.Cesium.ArcType.NONE,
      clampToGround: false,
    },
  });
};

/**
 * 创建带时变位置的卫星 graphic（模型 + 标签）
 * @param {object} satelliteClass - SatelliteClass 实例
 * @param {Date} startDate - 起始时间 UTC
 * @param {"INERTIAL"|"FIXED"} frame - 参考系
 * @param {number} [step=DEFAULT_STEP_MS] - 步长（毫秒）
 * @returns {object} mars3d.graphic.ModelEntity
 */
const createSatelliteGraphic = (satelliteClass, startDate, frame, step = DEFAULT_STEP_MS) => {
  const position = satelliteClass.buildSampledPositionProperty(startDate, 0, step, frame);

  return new mars3d.graphic.ModelEntity({
    id: buildSatelliteId(satelliteClass.noradID),
    name: satelliteClass.name,
    position,
    orientation: new mars3d.Cesium.VelocityOrientationProperty(position),
    style: {
      url: "assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 60,
      silhouette: false,
      label: {
        text: satelliteClass.name,
        font_size: 16,
        font_family: "微软雅黑",
        color: "#ffffff",
        outline: true,
        outlineColor: "#000000",
        outlineWidth: 2,
        background: true,
        backgroundColor: "#000000",
        backgroundOpacity: 0.4,
        pixelOffsetY: -24,
        pixelOffsetScaleByDistance: true,
        scaleByDistance: true,
      },
    },
    attr: {
      noradID: satelliteClass.noradID,
      frame,
    },
  });
};

/**
 * 添加单颗卫星的轨道线与卫星 graphic
 * @param {object} satelliteClass - SatelliteClass 实例
 * @param {object} options - 配置项
 * @param {"INERTIAL"|"FIXED"} options.frame - 参考系
 * @param {Date} options.startDate - 起始时间 UTC
 * @param {number} [options.step=DEFAULT_STEP_MS] - 步长（毫秒）
 * @returns {void}
 */
export const addSatelliteOrbit = (satelliteClass, options = {}) => {
  if (!orbitLayer || orbitLayer.isDestroy) return;
  if (!satelliteClass) return;

  const { frame = "FIXED", startDate = new Date(), step = DEFAULT_STEP_MS } = options;

  removeSatelliteOrbit(satelliteClass.noradID);

  const orbitLine = frame === "INERTIAL" ? createEciOrbitLine(satelliteClass) : createEcefOrbitLine(satelliteClass, startDate, step);
  orbitLayer.addGraphic(orbitLine);

  const satelliteGraphic = createSatelliteGraphic(satelliteClass, startDate, frame, step);
  orbitLayer.addGraphic(satelliteGraphic);
};

/**
 * 根据 NORAD ID 移除卫星的轨道线与卫星 graphic
 * @param {string|number} noradID - 卫星 NORAD ID
 * @returns {void}
 */
export const removeSatelliteOrbit = (noradID) => {
  if (!orbitLayer || orbitLayer.isDestroy) return;
  const ids = [buildOrbitLineId(noradID), buildSatelliteId(noradID)];
  ids.forEach((id) => {
    const graphic = orbitLayer.getGraphicById(id);
    if (graphic) orbitLayer.removeGraphic(graphic);
  });
};

/**
 * 根据 NORAD ID 获取卫星 graphic（供视角控制使用）
 * @param {string|number} noradID - 卫星 NORAD ID
 * @returns {object|null}
 */
export const getSatelliteGraphic = (noradID) => {
  if (!orbitLayer || orbitLayer.isDestroy) return null;
  return orbitLayer.getGraphicById(buildSatelliteId(noradID));
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
  const satelliteGraphic = satelliteSceneLayer.getGraphicById("importSatellite");
  const threatGraphic = satelliteSceneLayer.getGraphicById("threatSatellite");
  if (!satelliteGraphic || !threatGraphic) return;

  const posA_fixed = satelliteGraphic.positionShow;
  const posB_fixed = threatGraphic.positionShow;
  if (!posA_fixed || !posB_fixed) return;

  const posA_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posA_fixed, new mars3d.Cesium.Cartesian3());
  const posB_eci = mars3d.Cesium.Matrix3.multiplyByVector(fixedToIcrf, posB_fixed, new mars3d.Cesium.Cartesian3());

  // 4. 在 ECI 坐标系下计算 B 相对 A 的偏移向量 (从A指向B)
  const offsetEci = mars3d.Cesium.Cartesian3.subtract(posB_eci, posA_eci, new mars3d.Cesium.Cartesian3());
  const offsetEciCloser = mars3d.Cesium.Cartesian3.multiplyByScalar(offsetEci, 0.8, new mars3d.Cesium.Cartesian3());

  // 5. 构建以 A 卫星为中心、轴向平齐惯性系的 4x4 变换矩阵
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

/**
 * 解除 ECI 相机锁定（恢复 Fixed 系）
 * @param {object} viewer - mars3d 的 globalViewer
 * @returns {void}
 */
export const unlockCameraFromInertial = (viewer) => {
  if (!viewer) return;
  if (icrfListener) {
    viewer.scene.postUpdate.removeEventListener(icrfListener);
    icrfListener = null;
  }
  viewer.scene.camera.lookAtTransform(mars3d.Cesium.Matrix4.IDENTITY);
};

/**
 * 当前是否处于 ECI 相机锁定状态
 * @returns {boolean}
 */
export const isCameraLockedToInertial = () => icrfListener !== null;
