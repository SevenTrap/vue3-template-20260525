import dayjs from "dayjs";
import * as mars3d from "mars3d";
import * as satellite from "satellite.js";
import { geoAltitudeKm } from "@/utils/constants";
import SatelliteClass from "@/models/SatelliteClass";
import { getSunEci } from "@/utils/mars3d";

/**
 * 选取不晚于指定时刻的最新历元 TLE（倒序列表），若早于所有历元则回退最旧一条
 * @param {Array<number>} satelliteEpochs - 历元倒序的卫星列表
 * @param {number} currentTimeMs - 目标时刻毫秒时间戳
 * @returns {number|null} 选中的卫星历元时刻（毫秒时间戳）
 */
export const pickSatByTime = (satelliteEpochs, currentTimeMs) => {
  if (!satelliteEpochs || !satelliteEpochs.length) return null;
  const currentEpoch = satelliteEpochs.find((item) => item <= currentTimeMs);
  return currentEpoch || satelliteEpochs[satelliteEpochs.length - 1];
};

/**
 * 按 TLE 列表构建历元倒序的 SatelliteClass 映射
 * @param {string} noradID - 卫星 NORAD ID
 * @param {Array<{tle1:string,tle2:string}>} tles - 两行根数列表
 * @returns {{ satelliteEpochs: number[], satelliteClasses: Map<number, SatelliteClass> }} 历元映射
 */
export const buildSatelliteClassEpochMap = (noradID, tles) => {
  const satelliteEpochs = [];
  const satelliteClasses = new Map();

  for (let i = 0; i < tles.length; i++) {
    const satelliteClass = new SatelliteClass(tles[i].tle1, tles[i].tle2, noradID);
    const epochTimeMs = satelliteClass.epochTimeMs;
    satelliteEpochs.push(epochTimeMs);
    satelliteClasses.set(epochTimeMs, satelliteClass);
  }

  satelliteEpochs.sort((a, b) => b - a);
  return { satelliteEpochs, satelliteClasses };
};

/**
 * 按指定时刻选取适用 TLE 并计算 ECI 位置与速度
 * @param {string} noradID - 卫星 NORAD ID
 * @param {Array<{tle1:string,tle2:string}>} tles - 两行根数列表
 * @param {number} timeMs - 目标时刻毫秒时间戳
 * @returns {{ time: string, timeMs: number, noradID: string, name: string, posEci: object, velEci: object, posEcf: object, velEcf: object, lon: number, lat: number, altm: number, altKm: number, headingDeg: number }|null} 状态
 */
export const getSatelliteEciStateAtTime = (noradID, tles, timeMs) => {
  if (!tles?.length) return null;

  const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(noradID, tles);
  const currentEpoch = pickSatByTime(satelliteEpochs, timeMs);
  const satelliteClass = satelliteClasses.get(currentEpoch);
  if (!satelliteClass) return null;

  return satelliteClass.getState(new Date(timeMs));
};

/**
 * 计算卫星在指定时间窗内的轨迹
 * @param {string} noradID - 卫星 NORAD ID
 * @param {Array<{tle1:string,tle2:string}>} tles - 两行根数列表
 * @param {string|number} startTime - 开始时间
 * @param {string|number} endTime - 结束时间
 * @param {number} timeStep - 步长（ms）
 * @returns {Array} 卫星轨迹点列表
 */
export const calculateSatellitePosition = (noradID, tles, startTime, endTime, timeStep) => {
  const satelliteTracks = [];
  const startTimeMs = dayjs(startTime).valueOf();
  const endTimeMs = dayjs(endTime).valueOf();
  const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(noradID, tles);

  for (let t = startTimeMs; t <= endTimeMs; t += timeStep) {
    const currentEpoch = pickSatByTime(satelliteEpochs, t);
    const satelliteClass = satelliteClasses.get(currentEpoch);

    if (!satelliteClass) continue;
    const state = satelliteClass.getState(new Date(t));
    if (state) satelliteTracks.push(state);
  }

  return satelliteTracks;
};

/**
 * 在 import 冻结 LVLH 局部坐标系下，计算 threat 相对运动轨迹
 * @param {Array} threatTrack - 主动卫星轨迹
 * @param {Array} importTrack - 从动卫星轨迹
 * @param {number|string} startTimeMs - 相对运动开始时间（毫秒时间戳或时间字符串）
 * @param {number|string} endTimeMs - 相对运动结束时间（毫秒时间戳或时间字符串）
 * @returns {Array<{time:string,lng:number,lat:number,alt:number}>} mars3d Satellite position list
 */
export const calculateSatelliteRelativePosition = (threatTrack, importTrack, startTimeMs, endTimeMs, coordinate) => {
  const relativeTrack = [];

  if (coordinate === "ECEF") {
    for (let i = 0; i < threatTrack.length; i++) {
      const threatState = threatTrack[i];
      const importState = importTrack[i];
      if (threatState.timeMs < startTimeMs || threatState.timeMs > endTimeMs) continue;

      relativeTrack.push({
        time: threatState.time,
        lng: threatState.lon - importState.lon,
        lat: threatState.lat - importState.lat,
        alt: (threatState.altKm - importState.altKm) * 1000,
      });
    }
  } else {
    for (let i = 0; i < threatTrack.length; i++) {
      const threatState = threatTrack[i];
      const importState = importTrack[i];
      if (threatState.timeMs < startTimeMs || threatState.timeMs > endTimeMs) continue;

      relativeTrack.push({
        time: threatState.time,
        x: (threatState.posEci.x - importState.posEci.x) * 1000,
        y: (threatState.posEci.y - importState.posEci.y) * 1000,
        z: (threatState.posEci.z - importState.posEci.z) * 1000,
      });
    }
  }

  return relativeTrack;
};

/**
 * 将 import 实时位置与相对偏移轨迹合成为 Cartesian3 数组
 * @param {object} importCartesian3 - importGraphic.positionShow（地固系）
 * @param {Array} track - relativeTrack
 * @param {"ECEF"|"ECI"} coordinate - 当前坐标系
 * @param {object} time - Cesium JulianDate
 * @returns {Array} Cartesian3 数组
 */
export const buildRelativeTrajectoryPositions = (importCartesian3, track, coordinate, time) => {
  const Cesium = mars3d.Cesium;

  if (coordinate === "ECEF") {
    const cartographic = Cesium.Cartographic.fromCartesian(importCartesian3, Cesium.Ellipsoid.WGS84, new Cesium.Cartographic());
    const baseLng = Cesium.Math.toDegrees(cartographic.longitude);
    const baseLat = Cesium.Math.toDegrees(cartographic.latitude);
    const baseAlt = cartographic.height;

    return track.map((item) => Cesium.Cartesian3.fromDegrees(baseLng + item.lng, baseLat + item.lat, baseAlt + item.alt));
  }

  const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
  if (!Cesium.defined(icrfToFixed)) return [];

  const fixedToIcrf = Cesium.Matrix3.transpose(icrfToFixed, new Cesium.Matrix3());
  const eciPosition = Cesium.Matrix3.multiplyByVector(fixedToIcrf, importCartesian3, new Cesium.Cartesian3());

  return track.map((item) => {
    const eciPoint = new Cesium.Cartesian3(eciPosition.x + item.x, eciPosition.y + item.y, eciPosition.z + item.z);
    return Cesium.Matrix3.multiplyByVector(icrfToFixed, eciPoint, new Cesium.Cartesian3());
  });
};

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
 * 计算指定时刻两星相对指标
 * @param {{x:number,y:number,z:number}} threatEci - 主动卫星 T 的 ECI 位置（km）
 * @param {{x:number,y:number,z:number}} importEci - 从动卫星 I 的 ECI 位置（km）
 * @param {Date} date - 计算时刻
 * @returns {{distanceKm:number|null,sunAngleDeg:number|null}} 距离与光照角（∠TIS，顶点在 I）
 */
const computeRelativeMetric = (threatEci, importEci, date) => {
  const importToThreat = subtractVec(threatEci, importEci);
  const vecX2 = importToThreat.x * importToThreat.x;
  const vecY2 = importToThreat.y * importToThreat.y;
  const vecZ2 = importToThreat.z * importToThreat.z;
  const distanceKm = Math.sqrt(vecX2 + vecY2 + vecZ2);
  const sunEci = getSunEci(date);
  let sunAngleDeg = null;

  if (sunEci) {
    const importToSun = subtractVec(sunEci, importEci);
    sunAngleDeg = computeAngleDeg(importToThreat, importToSun);
    sunAngleDeg = sunAngleDeg;
  }
  return { distanceKm, sunAngleDeg };
};

// 根据卫星的tracks计算卫星距离和太阳角
export function calculateDistanceAndSunAngleDeg(threatTracks, importTracks) {
  let distanceAndSunAngleDeg = [];

  for (let i = 0; i < threatTracks.length; i += 1) {
    const threatEci = threatTracks[i].posEci;
    const importEci = importTracks[i].posEci;

    const { distanceKm, sunAngleDeg } = computeRelativeMetric(threatEci, importEci, new Date(threatTracks[i].timeMs));

    distanceAndSunAngleDeg.push({
      time: threatTracks[i].time,
      timeMs: threatTracks[i].timeMs,
      threatTrack: threatTracks[i],
      importTrack: importTracks[i],
      distanceKm: Number(distanceKm.toFixed(2)),
      sunAngleDeg: Number(sunAngleDeg.toFixed(2)),
    });
  }

  return distanceAndSunAngleDeg;
}

/**
 * 根据开始时间和结束时间截取数组
 * @param {Array} arr - 数组
 * @param {number} startTimeMs - 开始时间毫秒数
 * @param {number} endTimeMs - 结束时间毫秒数
 * @returns {Array} 截取后的数组
 * */
export function substringArrByTimeRange(arr, startTimeMs, endTimeMs) {
  return arr.filter((item) => {
    return item.timeMs >= startTimeMs && item.timeMs <= endTimeMs;
  });
}

// 根据时间戳获取当前时间戳【最近】轨道数据
export function getCurrentTimeMsTrack(track, currentTimeMs) {
  if (!track || !track.length) return null;
  if (!currentTimeMs) return track[0];
  if (currentTimeMs < track[0].timeMs) return track[0];
  if (currentTimeMs > track[track.length - 1].timeMs) return track[track.length - 1];

  for (let i = 0; i < track.length; i++) {
    if (track[i].timeMs >= currentTimeMs) return track[i];
  }
}

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
 * @param {Array<{timeMs:number,time:string,distanceKm:number|null,sunAngleDeg:number|null}>} tracks - 相对指标序列
 * @param {number} distanceThreshold - 距离阈值（km）
 * @param {number} sunAngleThreshold - 光照角阈值（°）
 * @returns {Array<{startIndex:number,endIndex:number,startTime:string,endTime:string,startTimeMs:number,endTimeMs:number}>} 连续风险区间
 */
export const buildRiskRanges = (tracks, distanceThreshold, sunAngleThreshold) => {
  const ranges = [];
  let currentRange = null;

  tracks.forEach((item, index) => {
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
