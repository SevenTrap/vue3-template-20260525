import * as mars3d from "mars3d";

const KM_TO_M = 1000;
const LAYER_ID = "relativeTrajectoryLayer";
const THREAT_COLOR = "#2f6bff";
const IMPORT_COLOR = "#ff4d4f";

let relativeTrajectoryLayer = null;

/**
 * 校验三维向量是否有效
 * @param {{x:number,y:number,z:number}} vec - 三维向量（km）
 * @returns {boolean} 是否有效
 */
const isValidVec = (vec) => !!vec && [vec.x, vec.y, vec.z].every((v) => Number.isFinite(v));

/**
 * 将 km 单位 ECEF 坐标转为 Cesium.Cartesian3（米）
 * @param {{x:number,y:number,z:number}} posKm - km 单位位置
 * @returns {object} Cesium.Cartesian3
 */
const ecefKmToCartesian3 = (posKm) => new mars3d.Cesium.Cartesian3(posKm.x * KM_TO_M, posKm.y * KM_TO_M, posKm.z * KM_TO_M);

/**
 * 将 km 单位 ECI 坐标转为 Cesium.Cartesian3（米）
 * @param {{x:number,y:number,z:number}} posKm - km 单位位置
 * @returns {object} Cesium.Cartesian3
 */
const eciKmToCartesian3 = (posKm) => new mars3d.Cesium.Cartesian3(posKm.x * KM_TO_M, posKm.y * KM_TO_M, posKm.z * KM_TO_M);

/**
 * 将坐标系字符串转为 Cesium 参考系
 * @param {"ECEF"|"ECI"|string} frame - 坐标系
 * @returns {object} Cesium.ReferenceFrame
 */
const toReferenceFrame = (frame) => (frame === "ECI" ? mars3d.Cesium.ReferenceFrame.INERTIAL : mars3d.Cesium.ReferenceFrame.FIXED);

/**
 * 拼接轨迹 graphic 前缀 id
 * @param {string|number} noradID - NORAD ID
 * @param {string} suffix - 后缀
 * @returns {string} graphic id
 */
const buildGraphicId = (noradID, suffix) => `relative-traj-${noradID}-${suffix}`;

/**
 * 确保相对轨迹图层已挂载
 * @param {object} viewer - mars3d Map 实例
 * @returns {object|null} GraphicLayer
 */
export const ensureRelativeTrajectoryLayer = (viewer) => {
  if (!viewer) return null;
  if (relativeTrajectoryLayer && !relativeTrajectoryLayer.isDestroy) return relativeTrajectoryLayer;

  relativeTrajectoryLayer = new mars3d.layer.GraphicLayer({
    id: LAYER_ID,
    name: "相对轨迹图层",
  });
  viewer.addLayer(relativeTrajectoryLayer);
  return relativeTrajectoryLayer;
};

/**
 * 按 timeMs 在有序轨迹中二分查找当前索引
 * @param {Array<{timeMs:number}>} track - 轨迹点列表
 * @param {number} timeMs - 目标时刻（ms）
 * @returns {number} 当前索引
 */
export const findTrackIndexByTimeMs = (track, timeMs) => {
  if (!Array.isArray(track) || !track.length) return 0;

  let left = 0;
  let right = track.length - 1;

  if (timeMs <= track[0].timeMs) return 0;
  if (timeMs >= track[right].timeMs) return right;

  while (left < right) {
    const mid = Math.floor((left + right + 1) / 2);
    if (track[mid].timeMs <= timeMs) {
      left = mid;
    } else {
      right = mid - 1;
    }
  }

  return left;
};

/**
 * 由轨迹点构建 SampledPositionProperty
 * @param {Array} track - 轨迹点列表
 * @param {"ECEF"|"ECI"} frame - 坐标系
 * @returns {object|null} SampledPositionProperty
 */
export const buildSampledPosition = (track, frame) => {
  const Cesium = mars3d.Cesium;
  if (!Array.isArray(track) || !track.length) return null;

  const referenceFrame = toReferenceFrame(frame);
  const sampledPosition = new Cesium.SampledPositionProperty(referenceFrame);
  sampledPosition.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  sampledPosition.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  sampledPosition.setInterpolationOptions({
    interpolationDegree: 1,
    interpolationAlgorithm: Cesium.LinearApproximation,
  });

  track.forEach((point) => {
    const posKm = frame === "ECI" ? point.eciKm : point.ecefKm;
    if (!isValidVec(posKm) || !Number.isFinite(point.timeMs)) return;
    const position = frame === "ECI" ? eciKmToCartesian3(posKm) : ecefKmToCartesian3(posKm);
    sampledPosition.addSample(Cesium.JulianDate.fromDate(new Date(point.timeMs)), position);
  });

  return sampledPosition;
};

/**
 * 将轨迹片段转为 Fixed 系下的 Cartesian3 数组
 * @param {Array} segment - 轨迹片段
 * @param {"ECEF"|"ECI"} frame - 坐标系
 * @param {object} julianTime - 当前 Cesium 时间
 * @returns {Array} Cartesian3 数组
 */
const segmentToPositions = (segment, frame, julianTime) => {
  const Cesium = mars3d.Cesium;
  if (!segment.length) return [];

  if (frame === "ECEF") {
    return segment.filter((p) => isValidVec(p.ecefKm)).map((p) => ecefKmToCartesian3(p.ecefKm));
  }

  const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(julianTime);
  if (!icrfToFixed) {
    return segment.filter((p) => isValidVec(p.eciKm)).map((p) => eciKmToCartesian3(p.eciKm));
  }

  return segment
    .filter((p) => isValidVec(p.eciKm))
    .map((p) => {
      const eciPos = eciKmToCartesian3(p.eciKm);
      return Cesium.Matrix3.multiplyByVector(icrfToFixed, eciPos, new Cesium.Cartesian3());
    });
};

/**
 * 创建实线/虚线分段轨迹
 * @param {Array} track - 轨迹点列表
 * @param {object} options - 配置项
 * @param {string|number} options.noradID - NORAD ID
 * @param {string} options.name - 卫星名称
 * @param {string} options.color - 线条颜色
 * @param {"ECEF"|"ECI"} options.frame - 坐标系
 * @returns {{passedLine:object, futureLine:object}} 分段轨迹线
 */
export const createSplitTrajectoryLines = (track, options = {}) => {
  const Cesium = mars3d.Cesium;
  const { noradID, name, color, frame = "ECEF" } = options;

  const passedPositions = new Cesium.CallbackProperty((time) => {
    const timeMs = Cesium.JulianDate.toDate(time).getTime();
    const idx = findTrackIndexByTimeMs(track, timeMs);
    return segmentToPositions(track.slice(0, idx + 1), frame, time);
  }, false);

  const futurePositions = new Cesium.CallbackProperty((time) => {
    const timeMs = Cesium.JulianDate.toDate(time).getTime();
    const idx = findTrackIndexByTimeMs(track, timeMs);
    return segmentToPositions(track.slice(idx), frame, time);
  }, false);

  const passedLine = new mars3d.graphic.PolylineEntity({
    id: buildGraphicId(noradID, "passed"),
    name: `${name}-已走过轨迹`,
    positions: passedPositions,
    style: {
      width: 2,
      color,
      opacity: 0.9,
      arcType: Cesium.ArcType.NONE,
    },
  });
  passedLine._isSateTrajectory = true;

  const futureLine = new mars3d.graphic.PolylineEntity({
    id: buildGraphicId(noradID, "future"),
    name: `${name}-未走过轨迹`,
    positions: futurePositions,
    style: {
      width: 2,
      color,
      opacity: 0.7,
      arcType: Cesium.ArcType.NONE,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString(color).withAlpha(0.7),
        dashLength: 16,
      }),
    },
  });
  futureLine._isSateTrajectory = true;

  return { passedLine, futureLine };
};

/**
 * 创建带时变位置的卫星点位 graphic
 * @param {Array} track - 轨迹点列表
 * @param {object} options - 配置项
 * @param {string|number} options.noradID - NORAD ID
 * @param {string} options.name - 卫星名称
 * @param {string} options.color - 点位颜色
 * @param {"ECEF"|"ECI"} options.frame - 坐标系
 * @returns {object|null} PointEntity
 */
const createSatellitePointGraphic = (track, options = {}) => {
  const Cesium = mars3d.Cesium;
  const { noradID, name, color, frame = "ECEF" } = options;
  const position = buildSampledPosition(track, frame);
  if (!position) return null;

  const graphic = new mars3d.graphic.PointEntity({
    id: buildGraphicId(noradID, "sat"),
    name,
    position,
    style: {
      color,
      pixelSize: 12,
      outline: true,
      outlineColor: "#ffffff",
      outlineWidth: 2,
      label: {
        text: name,
        font_size: 14,
        color: "#ffffff",
        outline: true,
        outlineColor: "#000000",
        outlineWidth: 2,
        pixelOffsetY: -18,
      },
    },
  });
  graphic._isSateTrajectory = true;
  return graphic;
};

/**
 * 移除单颗卫星的相对轨迹 graphic
 * @param {string|number} noradID - NORAD ID
 * @returns {void}
 */
const removeSatelliteTrajectory = (noradID) => {
  if (!relativeTrajectoryLayer || relativeTrajectoryLayer.isDestroy) return;
  ["passed", "future", "sat"].forEach((suffix) => {
    const graphic = relativeTrajectoryLayer.getGraphicById(buildGraphicId(noradID, suffix));
    if (graphic) relativeTrajectoryLayer.removeGraphic(graphic);
  });
};

/**
 * 添加单颗卫星的相对轨迹
 * @param {Array} track - 轨迹点列表
 * @param {object} options - 配置项
 * @param {string|number} options.noradID - NORAD ID
 * @param {string} options.name - 卫星名称
 * @param {string} options.color - 颜色
 * @param {"ECEF"|"ECI"} options.frame - 坐标系
 * @returns {void}
 */
const addSatelliteTrajectory = (track, options = {}) => {
  if (!relativeTrajectoryLayer || relativeTrajectoryLayer.isDestroy) return;
  if (!Array.isArray(track) || !track.length) return;

  const { noradID } = options;
  removeSatelliteTrajectory(noradID);

  const { passedLine, futureLine } = createSplitTrajectoryLines(track, options);
  relativeTrajectoryLayer.addGraphic(passedLine);
  relativeTrajectoryLayer.addGraphic(futureLine);

  const pointGraphic = createSatellitePointGraphic(track, options);
  if (pointGraphic) relativeTrajectoryLayer.addGraphic(pointGraphic);
};

/**
 * 设置 Mars3D 时钟范围为数据起止时间
 * @param {object} viewer - mars3d Map 实例
 * @param {number} startTimeMs - 起始时间（ms）
 * @param {number} endTimeMs - 结束时间（ms）
 * @returns {void}
 */
export const setSceneClockRange = (viewer, startTimeMs, endTimeMs) => {
  if (!viewer || !Number.isFinite(startTimeMs) || !Number.isFinite(endTimeMs)) return;

  const Cesium = mars3d.Cesium;
  const start = Cesium.JulianDate.fromDate(new Date(startTimeMs));
  const stop = Cesium.JulianDate.fromDate(new Date(endTimeMs));

  viewer.clock.startTime = start.clone();
  viewer.clock.stopTime = stop.clone();
  viewer.clock.currentTime = start.clone();
  viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
  viewer.clock.shouldAnimate = true;

  if (viewer.timeline) {
    viewer.timeline.zoomTo(start, stop);
  }
};

/**
 * 渲染双星相对轨迹
 * @param {object} viewer - mars3d Map 实例
 * @param {object} data - satRelativeData2 数据
 * @param {object} options - 配置项
 * @param {"ECEF"|"ECI"} [options.frame="ECEF"] - 坐标系
 * @param {string|number} [options.threatNoradID] - 威胁目标 NORAD ID
 * @param {string|number} [options.importNoradID] - 被威胁目标 NORAD ID
 * @param {string} [options.threatSatelliteName] - 威胁目标名称
 * @param {string} [options.importSatelliteName] - 被威胁目标名称
 * @returns {void}
 */
export const renderRelativeTrajectories = (viewer, data, options = {}) => {
  if (!viewer || !data) return;

  const layer = ensureRelativeTrajectoryLayer(viewer);
  if (!layer) return;

  const frame = options.frame || "ECEF";
  const { threatNoradID = "threat", importNoradID = "import", threatSatelliteName = "威胁目标", importSatelliteName = "被威胁目标" } = options;

  layer.clear();

  if (Array.isArray(data.threatTrack) && data.threatTrack.length) {
    addSatelliteTrajectory(data.threatTrack, {
      noradID: threatNoradID,
      name: threatSatelliteName,
      color: THREAT_COLOR,
      frame,
    });
  }

  if (Array.isArray(data.importTrack) && data.importTrack.length) {
    addSatelliteTrajectory(data.importTrack, {
      noradID: importNoradID,
      name: importSatelliteName,
      color: IMPORT_COLOR,
      frame,
    });
  }
};

/**
 * 按坐标系重建双星相对轨迹
 * @param {object} viewer - mars3d Map 实例
 * @param {object} data - satRelativeData2 数据
 * @param {"ECEF"|"ECI"} frame - 坐标系
 * @param {object} options - 其余渲染配置
 * @returns {void}
 */
export const rebuildRelativeTrajectoriesByFrame = (viewer, data, frame, options = {}) => {
  renderRelativeTrajectories(viewer, data, { ...options, frame });
};

/**
 * 切换相对轨迹图层显隐
 * @param {boolean} show - 是否显示
 * @returns {void}
 */
export const toggleRelativeTrajectories = (show) => {
  if (!relativeTrajectoryLayer || relativeTrajectoryLayer.isDestroy) return;
  relativeTrajectoryLayer.show = show;
};

/**
 * 销毁相对轨迹图层
 * @param {object} viewer - mars3d Map 实例
 * @returns {void}
 */
export const destroyRelativeTrajectoryLayer = (viewer) => {
  if (!relativeTrajectoryLayer) return;
  if (viewer && !relativeTrajectoryLayer.isDestroy) viewer.removeLayer(relativeTrajectoryLayer);
  if (!relativeTrajectoryLayer.isDestroy) relativeTrajectoryLayer.destroy();
  relativeTrajectoryLayer = null;
};

/**
 * 将 Cesium JulianDate 转为毫秒时间戳
 * @param {object} julianDate - Cesium.JulianDate
 * @returns {number} 毫秒时间戳
 */
export const julianDateToTimeMs = (julianDate) => {
  if (!julianDate) return 0;
  return mars3d.Cesium.JulianDate.toDate(julianDate).getTime();
};
