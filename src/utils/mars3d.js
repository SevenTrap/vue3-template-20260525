import * as mars3d from "mars3d";
import * as satellite from "satellite.js";
import { auKm } from "@/utils/constants";

/**
 * 将 Cesium JulianDate 转为毫秒时间戳
 * @param {object} julianDate - Cesium.JulianDate
 * @returns {number} 毫秒时间戳
 */
export const julianDateToTimeMs = (julianDate) => {
  if (!julianDate) return 0;
  return mars3d.Cesium.JulianDate.toDate(julianDate).getTime();
};

/**
 * 将毫秒时间戳转为 Cesium JulianDate
 * @param {number} timeMs - 毫秒时间戳
 * @returns {object} Cesium.JulianDate
 */
export const timeMsToJulianDate = (timeMs) => {
  if (!timeMs) return 0;
  return mars3d.Cesium.JulianDate.fromDate(new Date(timeMs));
};

/**
 * 校验三维向量是否有效
 * @param {{x:number,y:number,z:number}} p - 三维向量
 * @returns {boolean} 是否为有效向量
 */
const isValidVec = (p) => !!p && [p.x, p.y, p.z].every((v) => Number.isFinite(v));

/**
 * 获取太阳在 ECI 坐标系下的位置（km）
 * @param {Date} date - UTC 时间
 * @returns {{x:number,y:number,z:number}|null} 太阳 ECI 位置
 */
export const getSunEci = (date) => {
  const jd = satellite.jday(date);
  const sunPos = satellite.sunPos(jd);
  const rsun = sunPos && sunPos.rsun;
  if (!rsun) return null;
  const sunEci = {
    x: (rsun.x ?? rsun[0]) * auKm,
    y: (rsun.y ?? rsun[1]) * auKm,
    z: (rsun.z ?? rsun[2]) * auKm,
  };
  return isValidVec(sunEci) ? sunEci : null;
};
