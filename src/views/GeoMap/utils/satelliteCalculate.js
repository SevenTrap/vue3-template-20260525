import dayjs from "dayjs";
import * as mars3d from "mars3d";
import SatelliteClass from "@/models/SatelliteClass";

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
 * @returns {{ posEci: object, velEci: object }|null} ECI 状态（km / km/s）
 */
export const getSatelliteEciStateAtTime = (noradID, tles, timeMs) => {
  if (!tles?.length) return null;

  const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(noradID, tles);
  const currentEpoch = pickSatByTime(satelliteEpochs, timeMs);
  const satelliteClass = satelliteClasses.get(currentEpoch);
  if (!satelliteClass) return null;

  return satelliteClass.getEciState(new Date(timeMs));
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
