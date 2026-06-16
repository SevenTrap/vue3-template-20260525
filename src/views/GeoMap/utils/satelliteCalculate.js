import dayjs from "dayjs";
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

export function calculateSatellitePosition(noradID, tles, startTime, endTime, timeStep) {
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
}
