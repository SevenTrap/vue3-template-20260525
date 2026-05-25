import * as satellite from "satellite.js";
import dayjs from "dayjs";

export const earthRadiusKm = 6378.135; // 地球平均半径（km）
export const mu = 398600.8; // 地球引力常数 [km^3/s^2]

/**
 * A model for representing satellite data.
 * @param {string} tle1 - The first line of the TLE data.
 * @param {string} tle2 - The second line of the TLE data.
 */
class SatelliteClass {
  constructor(name, tle1, tle2, options = {}) {
    this.name = name;
    this.tle1 = tle1;
    this.tle2 = tle2;
    this.options = options;
    this.satrec = null; // satellite.js object
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
  }

  formatTimeLocal2UTC(date) {
    return dayjs(date).subtract(8, "hour").toDate();
  }

  getState(date) {
    const pv = satellite.propagate(this.satrec, date);

    // position 和 velocity 都是ECI坐标系下的 属于惯性坐标系下的值
    // velocity 单位是km/s
    if (!pv.position || !pv.velocity) return null;

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const lon = satellite.degreesLong(geo.longitude);
    const lat = satellite.degreesLat(geo.latitude);
    const headingDeg = this.computeHeading(pv.position, pv.velocity, gmst);
    return {
      name: this.name,
      noradID: this.noradID,
      time: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
      lon: lon,
      lat: lat,
      altKm: geo.height, // 高度(km)
      altm: geo.height * 1000, // 高度(m)
      headingDeg: headingDeg,
    };
  }

  // 计算ECF坐标系下的航向角 0-360 正北方向为0 顺时针为正
  computeHeading(posEci, velEci, gmst) {
    const velEcf = satellite.eciToEcf(velEci, gmst);
    const geo = satellite.eciToGeodetic(posEci, gmst);
    const lon = geo.longitude;
    const lat = geo.latitude;
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const sinLon = Math.sin(lon);
    const cosLon = Math.cos(lon);
    const vEast = -sinLon * velEcf.x + cosLon * velEcf.y;
    const vNorth = -sinLat * cosLon * velEcf.x - sinLat * sinLon * velEcf.y + cosLat * velEcf.z;
    const heading = Math.atan2(vEast, vNorth);
    let headingDeg = (heading * 180.0) / Math.PI;
    if (headingDeg < 0) return headingDeg + 360;
    return headingDeg;
  }

  /**
   * 获取ECI坐标系下的位置
   * @param {Date} date - UTC时间
   * @returns {Object} ECI坐标系下的位置
   * */
  getEciPosition(date) {
    const positionAndVelocity = satellite.propagate(this.satrec, date);
    if (!positionAndVelocity.position) return null;
    return positionAndVelocity.position;
  }

  /**
   * 获取ECF坐标系下的位置
   * @param {Date} date - UTC时间
   * @returns {Object} ECF坐标系下的位置
   */
  getEcfPosition(date) {
    const position = this.getEciPosition(date);
    if (!position) return null;
    const gmst = satellite.gstime(date);
    return satellite.eciToEcf(position, gmst);
  }

  /**
   * 获取地理坐标系下的位置
   * @param {Date} date - UTC时间
   * @returns {Object} 地理坐标系下的位置
   */
  getGeodeticPosition(date) {
    const position = this.getEciPosition(date);
    if (!position) return null;
    const gmst = satellite.gstime(date);
    return satellite.eciToGeodetic(position, gmst);
  }

  /**
   * 根据时间获取卫星的经纬度和高度
   * @param {Date} date - UTC时间
   * @returns {Object} 经纬度和高度、时间
   * */
  getLLA(date) {
    const geodetic = this.getGeodeticPosition(date);
    if (!geodetic) return null;

    const lla = {
      time: dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
      lon: satellite.degreesLong(geodetic.longitude),
      lat: satellite.degreesLat(geodetic.latitude),
      altKm: geodetic.height, // 高度(km)
    };

    return lla;
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
      const lla = this.getLLA(currentTime);
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

// 基于satellite.js和两行根数计算卫星实时位置与方向，用于openlayers绘制卫星，请给出详细的代码示例，并给出详细注释
