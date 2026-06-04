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
 * @returns {Array<{sat: SatelliteClass, epochMs: number}>} 倒序排序后的卫星列表
 */
const buildSortedSatellites = (tles, name) => {
  if (!Array.isArray(tles)) return [];
  return tles
    .filter((item) => item && item.tle1 && item.tle2)
    .map((item) => {
      const sat = new SatelliteClass(name, item.tle1, item.tle2);
      return { sat, epochMs: getTleEpochMs(sat.satrec) };
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
const pickSatByTime = (sortedSats, timeMs) => {
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
      lon: round2(threatLla.lon),
      lat: round2(threatLla.lat),
      altKm: round2(threatLla.altKm),
      heightDiff: round2(threatLla.altKm - GEO_ALTITUDE_KM),
    });
    importTrack.push({
      timeMs: t,
      time,
      lon: round2(importLla.lon),
      lat: round2(importLla.lat),
      altKm: round2(importLla.altKm),
      heightDiff: round2(importLla.altKm - GEO_ALTITUDE_KM),
    });

    const dx = importEci.x - threatEci.x;
    const dy = importEci.y - threatEci.y;
    const dz = importEci.z - threatEci.z;
    const distanceKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
    distances.push(round2(distanceKm));

    // threat -> import 方向 与 threat -> sun 方向 的夹角（太阳光照角）
    const satToImport = { x: dx, y: dy, z: dz };
    const sunEci = getSunEci(date);
    let sunAngle = NaN;
    if (sunEci) {
      const satToSun = { x: sunEci.x - threatEci.x, y: sunEci.y - threatEci.y, z: sunEci.z - threatEci.z };
      sunAngle = computeAngleDeg(satToImport, satToSun);
    }
    sunAngles.push(round2(sunAngle));
  }

  return { startTime, endTime, threatTrack, importTrack, distances, sunAngles };
};
