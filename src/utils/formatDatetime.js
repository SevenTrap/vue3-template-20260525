import * as mars3d from "mars3d";
import dayjs from "dayjs";

// 将本地时间转为 UTC 时间
export function formatLocalTime2UTC(localTime, offset = 8) {
  return dayjs(localTime).subtract(offset, "hour").toDate();
}

/**
 * 将 Cesium JulianDate 转为毫秒时间戳
 * @param {object} julianDate - Cesium.JulianDate
 * @returns {number} 毫秒时间戳
 */
export function julianDateToTimeMs(julianDate) {
  if (!julianDate) return 0;
  return mars3d.Cesium.JulianDate.toDate(julianDate).getTime();
}
