import * as satellite from "satellite.js";
import dayjs from "dayjs";
import SatelliteClass from "@/models/SatelliteClass";

/** 同步轨道高度（km），与 formatOrbitHeightAndYAxis.js 保持一致 */
export const GEO_ALTITUDE_KM = 35786;

/** 天文单位（km），用于将 sunPos 的 rsun(AU) 换算为 km */
const AU_KM = 149597870.7;
/** Unix 纪元对应的儒略日 */
const JD_UNIX_EPOCH = 2440587.5;
/** 一天的毫秒数 */
const MS_PER_DAY = 86400000;
/** 默认步长：1 分钟 */
const DEFAULT_STEP_MS = 60 * 1000;

/**
 * 保留 2 位小数
 * @param {number} value - 原始数值
 * @returns {number|null} 保留 2 位小数后的数值，非法值返回 null
 */
const round2 = (value) => (Number.isFinite(value) ? Number(value.toFixed(2)) : null);
/**
 * 保留 6 位小数
 * @param {number} value - 原始数值
 * @returns {number|null} 保留 6 位小数后的数值，非法值返回 null
 */
const round6 = (value) => (Number.isFinite(value) ? Number(value.toFixed(6)) : null);

/**
 * 校验三维向量是否有效
 * @param {{x:number,y:number,z:number}} p - 三维向量
 * @returns {boolean} 是否为有效向量
 */
const isValidVec = (p) => !!p && [p.x, p.y, p.z].every((v) => Number.isFinite(v));

/**
 * 由 satrec 计算 TLE 历元时刻（毫秒时间戳）
 * @param {object} satrec - satellite.js 的 satrec 对象
 * @returns {number} 历元毫秒时间戳，非法时返回 NaN
 */
const getTleEpochMs = (satrec) => {
  if (!satrec) return NaN;
  const jd = satrec.jdsatepoch + (satrec.jdsatepochF || 0);
  return (jd - JD_UNIX_EPOCH) * MS_PER_DAY;
};

/**
 * 根据 TLE 列表构造卫星模型并按历元倒序（从新到旧）排序
 * @param {Array<{date?:string, tle1:string, tle2:string}>} tles - 两行根数列表
 * @param {string} name - 卫星名称
 * @returns {Array<{sat: SatelliteClass, epochMs: number, date: string}>} 倒序排序后的卫星列表
 */
export const buildSortedSatellites = (tles, name) => {
  if (!Array.isArray(tles)) return [];
  return tles
    .filter((item) => item && item.tle1 && item.tle2)
    .map((item) => {
      const sat = new SatelliteClass(name, item.tle1, item.tle2);
      const epochMs = getTleEpochMs(sat.satrec);
      const date = dayjs(epochMs).format("YYYY-MM-DD HH:mm:ss");
      return { sat, epochMs, date };
    })
    .filter((item) => Number.isFinite(item.epochMs))
    .sort((a, b) => b.epochMs - a.epochMs);
};

/**
 * 选取不晚于指定时刻的最新历元 TLE（倒序列表），若早于所有历元则回退最旧一条
 * @param {Array<{sat: SatelliteClass, epochMs: number}>} sortedSats - 历元倒序的卫星列表
 * @param {number} timeMs - 目标时刻毫秒时间戳
 * @returns {SatelliteClass|null} 选中的卫星模型
 */
export const pickSatByTime = (sortedSats, timeMs) => {
  if (!sortedSats || !sortedSats.length) return null;
  const found = sortedSats.find((item) => item.epochMs <= timeMs);
  return (found || sortedSats[sortedSats.length - 1]).sat;
};

/**
 * 获取太阳在 ECI 坐标系下的位置（km）
 * @param {Date} date - UTC 时间
 * @returns {{x:number,y:number,z:number}|null} 太阳 ECI 位置
 */
const getSunEci = (date) => {
  const jd = satellite.jday(date);
  const sunPos = satellite.sunPos(jd);
  const rsun = sunPos && sunPos.rsun;
  if (!rsun) return null;
  const sunEci = {
    x: (rsun.x ?? rsun[0]) * AU_KM,
    y: (rsun.y ?? rsun[1]) * AU_KM,
    z: (rsun.z ?? rsun[2]) * AU_KM,
  };
  return isValidVec(sunEci) ? sunEci : null;
};

/**
 * 计算两个三维向量的夹角（度）
 * @param {{x:number,y:number,z:number}} v1 - 向量1
 * @param {{x:number,y:number,z:number}} v2 - 向量2
 * @returns {number} 夹角（度），0~180
 */
const computeAngleDeg = (v1, v2) => {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const norm1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const norm2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  if (!norm1 || !norm2) return NaN;
  let cosTheta = dot / (norm1 * norm2);
  if (cosTheta > 1) cosTheta = 1;
  if (cosTheta < -1) cosTheta = -1;
  return (Math.acos(cosTheta) * 180) / Math.PI;
};

/**
 * 保留三维向量 2 位小数
 * @param {{x:number,y:number,z:number}} vec - 三维向量
 * @returns {{x:number|null,y:number|null,z:number|null}|null} 保留 2 位小数后的向量
 */
const roundVec2 = (vec) => (isValidVec(vec) ? { x: round2(vec.x), y: round2(vec.y), z: round2(vec.z) } : null);

/**
 * 计算两个三维点的差向量
 * @param {{x:number,y:number,z:number}} endVec - 终点向量
 * @param {{x:number,y:number,z:number}} startVec - 起点向量
 * @returns {{x:number,y:number,z:number}} 差向量
 */
const subtractVec = (endVec, startVec) => ({
  x: endVec.x - startVec.x,
  y: endVec.y - startVec.y,
  z: endVec.z - startVec.z,
});

/**
 * 计算三维向量模长
 * @param {{x:number,y:number,z:number}} vec - 三维向量
 * @returns {number} 向量模长
 */
const getVecLength = (vec) => Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);

/**
 * 判断距离与光照角是否同时命中阈值
 * @param {number|null} distance - 两星距离（km）
 * @param {number|null} sunAngle - 太阳光照角（°）
 * @param {number} distanceThreshold - 距离阈值（km）
 * @param {number} sunAngleThreshold - 光照角阈值（°）
 * @returns {boolean} 是否命中阈值
 */
const isRiskPoint = (distance, sunAngle, distanceThreshold, sunAngleThreshold) =>
  Number.isFinite(distance) && Number.isFinite(sunAngle) && distance < distanceThreshold && sunAngle < sunAngleThreshold;

/**
 * 根据逐点命中状态生成连续风险区间
 * @param {Array<{timeMs:number,time:string,distanceKm:number|null,sunAngleDeg:number|null}>} metrics - 相对指标序列
 * @param {number} distanceThreshold - 距离阈值（km）
 * @param {number} sunAngleThreshold - 光照角阈值（°）
 * @returns {Array<{startIndex:number,endIndex:number,startTime:string,endTime:string,startTimeMs:number,endTimeMs:number}>} 连续风险区间
 */
export const buildRiskRanges = (metrics, distanceThreshold, sunAngleThreshold) => {
  const ranges = [];
  let currentRange = null;

  metrics.forEach((item, index) => {
    const matched = isRiskPoint(item.distanceKm, item.sunAngleDeg, distanceThreshold, sunAngleThreshold);
    if (matched && !currentRange) {
      currentRange = {
        startIndex: index,
        endIndex: index,
        startTime: item.time,
        endTime: item.time,
        startTimeMs: item.timeMs,
        endTimeMs: item.timeMs,
      };
      return;
    }

    if (matched && currentRange) {
      currentRange.endIndex = index;
      currentRange.endTime = item.time;
      currentRange.endTimeMs = item.timeMs;
      return;
    }

    if (!matched && currentRange) {
      ranges.push(currentRange);
      currentRange = null;
    }
  });

  if (currentRange) ranges.push(currentRange);
  return ranges;
};

/**
 * 生成卫星在指定时刻的位置记录
 * @param {SatelliteClass} sat - 卫星模型
 * @param {Date} date - 计算时刻
 * @param {number} timeMs - 计算时刻毫秒时间戳
 * @param {string} time - 格式化时间
 * @param {string} name - 卫星名称
 * @returns {{timeMs:number,time:string,name:string,eciKm:Object,ecefKm:Object,lon:number|null,lat:number|null,altKm:number|null,heightDiff:number|null}|null} 卫星位置记录
 */
const buildTrackPoint = (sat, date, timeMs, time, name) => {
  const eci = sat.getEciPosition(date);
  const ecef = sat.getEcfPosition(date);
  const lla = sat.getLLA(date);
  if (!isValidVec(eci) || !isValidVec(ecef) || !lla) return null;

  return {
    timeMs,
    time,
    name,
    eciKm: eci,
    ecefKm: ecef,
    lon: round6(lla.lon),
    lat: round6(lla.lat),
    altKm: round2(lla.altKm),
    heightDiff: round2(lla.altKm - GEO_ALTITUDE_KM),
  };
};

/**
 * 计算指定时刻两星相对指标
 * @param {{x:number,y:number,z:number}} threatEci - 主动卫星 T 的 ECI 位置（km）
 * @param {{x:number,y:number,z:number}} importEci - 从动卫星 I 的 ECI 位置（km）
 * @param {Date} date - 计算时刻
 * @returns {{distanceKm:number|null,sunAngleDeg:number|null,sunEci:Object|null}} 距离与光照角（∠TIS，顶点在 I）
 */
const computeRelativeMetric = (threatEci, importEci, date) => {
  const threatToImport = subtractVec(importEci, threatEci);
  const distanceKm = round2(getVecLength(threatToImport));
  const sunEci = getSunEci(date);
  let sunAngleDeg = null;
  if (sunEci) {
    const importToThreat = subtractVec(threatEci, importEci);
    const importToSun = subtractVec(sunEci, importEci);
    sunAngleDeg = round2(computeAngleDeg(importToThreat, importToSun));
  }
  return { distanceKm, sunAngleDeg, sunEci };
};

/**
 * 计算两颗卫星在指定时间窗内的经度-相对同步轨道高度轨迹、两星距离与光照角
 * @param {object} params - 入参
 * @param {Array} params.threatTles - 威胁目标两行根数列表
 * @param {Array} params.importTles - 被威胁目标两行根数列表
 * @param {string} params.closeTime - 接近时刻（本地时间字符串）
 * @param {number} params.timeFront - 前轨时长（ms）
 * @param {number} params.timeBack - 后轨时长（ms）
 * @param {number} params.timeStep - 步长（ms）
 * @returns {{startTime:number, endTime:number, threatTrack:Array, importTrack:Array, distances:Array, sunAngles:Array}}
 *   startTime/endTime 为毫秒时间戳；threatTrack/importTrack 按时间索引对齐
 */
export const computeLngHeightData = ({ threatTles, importTles, closeTime, timeFront, timeBack, timeStep }) => {
  const closeMs = dayjs(closeTime).valueOf();
  const startTime = closeMs - (Number(timeFront) || 0);
  const endTime = closeMs + (Number(timeBack) || 0);
  const step = Number(timeStep) > 0 ? Number(timeStep) : DEFAULT_STEP_MS;

  const threatSats = buildSortedSatellites(threatTles, "threat");
  const importSats = buildSortedSatellites(importTles, "import");

  const threatTrack = [];
  const importTrack = [];
  const distances = [];
  const sunAngles = [];

  if (!threatSats.length || !importSats.length) {
    return { startTime, endTime, threatTrack, importTrack, distances, sunAngles };
  }

  for (let t = startTime; t <= endTime; t += step) {
    const date = new Date(t);
    const threatSat = pickSatByTime(threatSats, t);
    const importSat = pickSatByTime(importSats, t);
    if (!threatSat || !importSat) continue;

    const threatLla = threatSat.getLLA(date);
    const importLla = importSat.getLLA(date);
    const threatEci = threatSat.getEciPosition(date);
    const importEci = importSat.getEciPosition(date);
    if (!threatLla || !importLla || !isValidVec(threatEci) || !isValidVec(importEci)) continue;

    const time = dayjs(t).format("YYYY-MM-DD HH:mm:ss");

    threatTrack.push({
      timeMs: t,
      time,
      lon: round6(threatLla.lon),
      lat: round6(threatLla.lat),
      altKm: round2(threatLla.altKm),
      heightDiff: round2(threatLla.altKm - GEO_ALTITUDE_KM),
    });
    importTrack.push({
      timeMs: t,
      time,
      lon: round6(importLla.lon),
      lat: round6(importLla.lat),
      altKm: round2(importLla.altKm),
      heightDiff: round2(importLla.altKm - GEO_ALTITUDE_KM),
    });

    const { distanceKm, sunAngleDeg } = computeRelativeMetric(threatEci, importEci, date);
    distances.push(distanceKm);
    sunAngles.push(sunAngleDeg);
  }

  return { startTime, endTime, threatTrack, importTrack, distances, sunAngles };
};

/**
 * 计算两颗卫星在指定时间段内的 ECI/ECEF 实时位置、距离和从动星视角太阳光照角（∠TIS）
 * @param {object} params - 入参
 * @param {Array} params.threatTles - 主动卫星两行根数列表
 * @param {Array} params.importTles - 从动卫星两行根数列表
 * @param {string} params.startTime - 开始时间字符串
 * @param {string} params.endTime - 结束时间字符串
 * @param {number} params.timeStep - 时间步长（ms）
 * @param {string} [params.threatSatelliteName="主动卫星"] - 主动卫星名称
 * @param {string} [params.importSatelliteName="从动卫星"] - 从动卫星名称
 * @returns {{startTime:number,endTime:number,threatTrack:Array,importTrack:Array,distances:Array,sunAngles:Array,metrics:Array}} 计算结果
 */
export const computeSatRelativeData = ({
  threatTles,
  importTles,
  startTime,
  endTime,
  timeStep = 1 * 60 * 1000,
  threatSatelliteName = "主动卫星",
  importSatelliteName = "从动卫星",
}) => {
  const startTimeMs = dayjs(startTime).valueOf();
  const endTimeMs = dayjs(endTime).valueOf();
  const step = Number(timeStep) > 0 ? Number(timeStep) : DEFAULT_STEP_MS;
  const threatTrack = [];
  const importTrack = [];
  const threatLons = [];
  const importLons = [];
  const threatHeightDiffs = [];
  const importHeightDiffs = [];
  const threatLngHeightDiffs = [];
  const importLngHeightDiffs = [];
  const sunEcis = [];
  const distances = [];
  const sunAngles = [];
  const metrics = [];
  const times = [];
  const julianDates = [];

  if (!Number.isFinite(startTimeMs) || !Number.isFinite(endTimeMs) || startTimeMs > endTimeMs) {
    return { startTime: startTimeMs, endTime: endTimeMs, threatTrack, importTrack, distances, sunAngles, metrics };
  }

  const threatSats = buildSortedSatellites(threatTles, threatSatelliteName);
  const importSats = buildSortedSatellites(importTles, importSatelliteName);

  if (!threatSats.length || !importSats.length) {
    return { startTime: startTimeMs, endTime: endTimeMs, threatTrack, importTrack, distances, sunAngles, metrics };
  }

  for (let t = startTimeMs; t <= endTimeMs; t += step) {
    const date = new Date(t);
    const time = dayjs(t).format("YYYY-MM-DD HH:mm:ss");
    const threatSat = pickSatByTime(threatSats, t);
    const importSat = pickSatByTime(importSats, t);
    if (!threatSat || !importSat) continue;

    const threatEci = threatSat.getEciPosition(date);
    const importEci = importSat.getEciPosition(date);
    if (!isValidVec(threatEci) || !isValidVec(importEci)) continue;

    const threatPoint = buildTrackPoint(threatSat, date, t, time, threatSatelliteName);
    const importPoint = buildTrackPoint(importSat, date, t, time, importSatelliteName);
    if (!threatPoint || !importPoint) continue;

    const { distanceKm, sunAngleDeg, sunEci } = computeRelativeMetric(threatEci, importEci, date);

    sunEcis.push(sunEci);
    times.push(time);
    threatTrack.push(threatPoint);
    importTrack.push(importPoint);
    distances.push(distanceKm);
    sunAngles.push(sunAngleDeg);
    threatLons.push(threatPoint.lon);
    importLons.push(importPoint.lon);
    threatHeightDiffs.push(threatPoint.heightDiff);
    importHeightDiffs.push(importPoint.heightDiff);
    threatLngHeightDiffs.push([threatPoint.lon, threatPoint.heightDiff]);
    importLngHeightDiffs.push([importPoint.lon, importPoint.heightDiff]);
    julianDates.push(Cesium.JulianDate.fromDate(date));

    metrics.push({
      timeMs: t,
      time,
      distanceKm,
      sunAngleDeg,
    });
  }

  return {
    startTime: startTimeMs,
    endTime: endTimeMs,
    times,
    julianDates,
    threatTrack,
    importTrack,
    threatLons,
    importLons,
    threatHeightDiffs,
    importHeightDiffs,
    threatLngHeightDiffs,
    importLngHeightDiffs,
    distances,
    sunAngles,
    sunEcis,
    metrics,
  };
};
