import * as satellite from "satellite.js";
import dayjs from "dayjs";

export const earthRadiusKm = 6378.135; // 地球平均半径（km）
export const mu = 398600.8; // 地球引力常数 [km^3/s^2]
export const jdUnixEpoch = 2440587.5; // 儒略日 Unix 时间戳

/**
 * A model for representing satellite data.
 * @param {string} tle1 - TLE第一行
 * @param {string} tle2 - TLE第二行
 * @param {string} name - 卫星名称，默认为空
 */
class SatelliteClass {
  constructor(tle1, tle2, name = "") {
    this.name = name;
    this.tle1 = tle1;
    this.tle2 = tle2;
    this.satrec = null; // object
    this.noradID = null; // NORAD ID
    this.inclination = null; // 轨道倾角(radians)
    this.eccentricity = null; // 轨道偏心率
    this.raan = null; // 轨道升交点赤经(radians)
    this.argOfPerigee = null; // 近地点幅角(radians)
    this.meanAnomaly = null; // 平近点角
    this.meanMotion = null; // 轨道平均角速度(radians / minutes)
    this.meanMotionSec = null; // 轨道平均角速度(radians / seconds)
    this.a = null; // 半长轴(km)
    this.perigee = null; // 近地点高度(km)
    this.apogee = null; // 远地点高度(km)
    this.jdsatepoch = null; // 历元儒略日

    this.epochDate = null; // 历元时刻（UTC时间）
    this.epochTimeMs = null; // 历元时刻（毫秒时间戳）
    this.initSatellite();
  }

  initSatellite() {
    this.satrec = satellite.twoline2satrec(this.tle1, this.tle2);

    this.noradID = this.satrec.satnum;
    this.inclination = this.satrec.inclo;
    this.eccentricity = this.satrec.ecco;
    this.raan = this.satrec.nodeo;
    this.argOfPerigee = this.satrec.argpo;
    this.meanAnomaly = this.satrec.mo;
    this.meanMotionMin = this.satrec.no;
    this.meanMotionSec = this.meanMotionMin / 60.0;
    this.a = Math.pow(mu / Math.pow(this.meanMotionSec, 2), 1 / 3);
    this.perigee = Number.parseFloat((this.a * (1 - this.eccentricity) - earthRadiusKm).toFixed(2));
    this.apogee = Number.parseFloat((this.a * (1 + this.eccentricity) - earthRadiusKm).toFixed(2));
    this.jdsatepoch = this.satrec.jdsatepoch;
    this.epochTimeMs = (this.satrec.jdsatepoch - jdUnixEpoch) * 86400000;
    this.epochDate = dayjs(this.epochTimeMs).format("YYYY-MM-DD HH:mm:ss");
  }

  /**
   * 获取历元时刻（UTC时间）和历元时刻（毫秒时间戳） 不考虑 2000 年以前的年份
   * @returns {Object} 历元时刻（UTC时间）和历元时刻（毫秒时间戳）
   */
  getEpoch() {
    const fullYear = this.epochyr + 2000;
    const yearStart = Date.UTC(fullYear, 0, 1, 0, 0, 0, 0);
    const epochTimeMs = yearStart + (this.epochdays - 1) * 86400000;
    const epochDate = dayjs(epochTimeMs).format("YYYY-MM-DD HH:mm:ss");

    return { epochDate, epochTimeMs };
  }

  /**
   * 获取指定时刻 ECI 位置与速度
   * @param {Date} date - UTC 时间
   * @returns {{ posEci: {x:number,y:number,z:number}, velEci: {x:number,y:number,z:number} }|null} 位置 km、速度 km/s
   */
  getEciState(date) {
    const pv = satellite.propagate(this.satrec, date);
    if (!pv.position || !pv.velocity) return null;
    return { posEci: pv.position, velEci: pv.velocity };
  }

  /**
   * 获取指定时刻 ECEF 位置与速度
   * @param {Date} date - UTC 时间
   * @returns {{ posEcf: {x:number,y:number,z:number}, velEcf: {x:number,y:number,z:number} }|null} 位置 km、速度 km/s
   */
  getEcefState(date) {
    const pv = satellite.propagate(this.satrec, date);
    if (!pv.position || !pv.velocity) return null;
    const gmst = satellite.gstime(date);
    const posEcf = satellite.eciToEcf(pv.position, gmst);
    const velEcf = satellite.eciToEcf(pv.velocity, gmst);
    return { posEcf, velEcf };
  }

  getState(date) {
    const pv = satellite.propagate(this.satrec, date);
    if (!pv.position || !pv.velocity) return null;

    const gmst = satellite.gstime(date);
    const posEci = pv.position;
    const velEci = pv.velocity;
    const posEcf = satellite.eciToEcf(posEci, gmst);
    const velEcf = satellite.eciToEcf(velEci, gmst);

    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const lon = satellite.degreesLong(geo.longitude); // 经度(度)
    const lat = satellite.degreesLat(geo.latitude); // 纬度(度)
    const headingDeg = this.computeHeading(velEcf, geo);

    return {
      time: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
      timeMs: dayjs(date).valueOf(),
      noradID: this.noradID,
      name: this.name,
      posEci: posEci,
      velEci: velEci,
      posEcf: posEcf,
      velEcf: velEcf,
      lon: lon,
      lat: lat,
      altm: geo.height * 1000, // 高度(m)
      altKm: geo.height, // 高度(km)
      headingDeg: headingDeg, // 航向角(度)
    };
  }

  // 计算ECEF坐标系下的航向角 0-360 正北方向为0 顺时针为正
  computeHeading(velEcf, geo) {
    const lonDeg = geo.longitude; // 经度(radians)
    const latDeg = geo.latitude; // 纬度(radians)
    const sinLat = Math.sin(latDeg);
    const cosLat = Math.cos(latDeg);
    const sinLon = Math.sin(lonDeg);
    const cosLon = Math.cos(lonDeg);
    const vEast = -sinLon * velEcf.x + cosLon * velEcf.y;
    const vNorth = -sinLat * cosLon * velEcf.x - sinLat * sinLon * velEcf.y + cosLat * velEcf.z;
    const heading = Math.atan2(vEast, vNorth);
    let headingDeg = (heading * 180.0) / Math.PI;
    if (headingDeg < 0) return headingDeg + 360;
    return headingDeg;
  }

  /**
   * 根据时间区间和步长获取卫星的经纬度和高度
   * @param {Date} startTime - 开始时间 UTC时间
   * @param {Date} endTime - 结束时间 UTC时间
   * @param {number} step - 步长，单位毫秒
   * @returns {Array} 经纬度和高度数组
   * */
  getLLAs(startTime, endTime, step = 1 * 60 * 1000) {
    const llas = [];
    const startTimeStamp = dayjs(startTime).valueOf();
    const endTimeStamp = dayjs(endTime).valueOf();

    for (let i = startTimeStamp; i <= endTimeStamp; i += step) {
      const currentTime = dayjs(i).toDate();
      const lla = this.getState(currentTime);
      if (lla) llas.push(lla);
    }

    return llas;
  }

  /**
   * 获取一个轨道周期内的经纬度和高度
   * @param {Date} startTime - 开始时间 UTC时间
   * @param {number} step - 步长，单位毫秒
   * @returns {Array} 经纬度和高度数组
   */
  getLLAsByPeriod(startTime, step = 1 * 60 * 1000) {
    let minutesPerOrbit = (2 * Math.PI) / this.meanMotionMin;
    const totalMinutes = Math.ceil(minutesPerOrbit) + 1;
    const endTime = dayjs(startTime).add(totalMinutes, "minutes").toDate();

    return this.getLLAs(startTime, endTime, step);
  }
}

export default SatelliteClass;
