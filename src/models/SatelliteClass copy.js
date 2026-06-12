import * as satellite from "satellite.js";
import dayjs from "dayjs";
import * as mars3d from "mars3d";

export const earthRadiusKm = 6378.135; // 地球平均半径（km）
export const mu = 398600.8; // 地球引力常数 [km^3/s^2]

const DEFAULT_STEP_MS = 60 * 60 * 1000; // 轨道外推默认步长：1 小时
const KM_TO_M = 1000;

/**
 * A model for representing satellite data.
 * @param {string} tle1 - The first line of the TLE data.
 * @param {string} tle2 - The second line of the TLE data.
 */
class SatelliteClass {
  constructor(name, tle1, tle2) {
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

  /**
   * 计算一个轨道周期的总秒数
   * @returns {number} 周期长度（秒）
   */
  getPeriodSeconds() {
    return (2 * Math.PI) / this.meanMotionSec;
  }

  /**
   * 推算一个轨道周期内的 ECI 状态序列
   * @param {Date} startDate - 起始 UTC 时间
   * @param {number} [step=DEFAULT_STEP_MS] - 步长（毫秒），默认 1 小时
   * @returns {Array<{ time: Date, posEci: { x: number, y: number, z: number }, velEci: { x: number, y: number, z: number } }>}
   */
  getEciStatesByPeriod(startDate, step = DEFAULT_STEP_MS) {
    const periodSec = this.getPeriodSeconds();
    const endDate = dayjs(startDate)
      .add(periodSec + 1, "second")
      .toDate();
    return this.getEciStates(startDate, endDate, step);
  }

  /**
   * 推算给定时间区间的 ECI 状态序列
   * @param {Date} startDate - 起始 UTC 时间
   * @param {Date} endDate - 结束 UTC 时间
   * @param {number} [step=DEFAULT_STEP_MS] - 步长（毫秒）
   * @returns {Array<{ time: Date, posEci: { x: number, y: number, z: number }, velEci: { x: number, y: number, z: number } }>}
   */
  getEciStates(startDate, endDate, step = DEFAULT_STEP_MS) {
    const states = [];
    const startMs = dayjs(startDate).valueOf();
    const endMs = dayjs(endDate).valueOf();
    for (let t = startMs; t <= endMs; t += step) {
      const date = new Date(t);
      const pv = satellite.propagate(this.satrec, date);
      if (!pv.position || !pv.velocity) continue;
      states.push({ time: date, posEci: pv.position, velEci: pv.velocity });
    }
    return states;
  }

  /**
   * 推算一个轨道周期内的 ECEF 状态序列
   * @param {Date} startDate - 起始 UTC 时间
   * @param {number} [step=DEFAULT_STEP_MS] - 步长（毫秒），默认 1 小时
   * @returns {Array<{ time: Date, posEcf: { x: number, y: number, z: number }, velEcf: { x: number, y: number, z: number } }>}
   */
  getEcfStatesByPeriod(startDate, step = DEFAULT_STEP_MS) {
    const periodSec = this.getPeriodSeconds();
    const endDate = dayjs(startDate)
      .add(periodSec + 1, "second")
      .toDate();
    return this.getEcfStates(startDate, endDate, step);
  }

  /**
   * 推算给定时间区间的 ECEF 状态序列
   * @param {Date} startDate - 起始 UTC 时间
   * @param {Date} endDate - 结束 UTC 时间
   * @param {number} [step=DEFAULT_STEP_MS] - 步长（毫秒）
   * @returns {Array<{ time: Date, posEcf: { x: number, y: number, z: number }, velEcf: { x: number, y: number, z: number } }>}
   */
  getEcfStates(startDate, endDate, step = DEFAULT_STEP_MS) {
    const states = [];
    const startMs = dayjs(startDate).valueOf();
    const endMs = dayjs(endDate).valueOf();
    for (let t = startMs; t <= endMs; t += step) {
      const date = new Date(t);
      const pv = satellite.propagate(this.satrec, date);
      if (!pv.position || !pv.velocity) continue;
      const gmst = satellite.gstime(date);
      const posEcf = satellite.eciToEcf(pv.position, gmst);
      const velEcf = satellite.eciToEcf(pv.velocity, gmst);
      states.push({ time: date, posEcf, velEcf });
    }
    return states;
  }

  /**
   * 由六根数生成一圈"标准圆"轨道在 ECI 坐标系下的采样点
   * 适用于 ECI 模式下显示静态轨道线（与时间无关）
   * @param {number} [numPoints=360] - 采样点数
   * @returns {Array<{ x: number, y: number, z: number }>} ECI 下的点序列（米）
   */
  getCircularOrbitEciSamples(numPoints = 360) {
    const a = this.a; // km
    const e = this.eccentricity;
    const i = this.inclination;
    const raan = this.raan;
    const argp = this.argOfPerigee;

    const cosO = Math.cos(raan);
    const sinO = Math.sin(raan);
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);
    const cosw = Math.cos(argp);
    const sinw = Math.sin(argp);

    const points = [];
    for (let k = 0; k <= numPoints; k++) {
      const nu = (k / numPoints) * 2 * Math.PI;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
      const xp = r * Math.cos(nu);
      const yp = r * Math.sin(nu);

      const x = (cosO * cosw - sinO * sinw * cosI) * xp + (-cosO * sinw - sinO * cosw * cosI) * yp;
      const y = (sinO * cosw + cosO * sinw * cosI) * xp + (-sinO * sinw + cosO * cosw * cosI) * yp;
      const z = sinw * sinI * xp + cosw * sinI * yp;

      points.push({ x: x * KM_TO_M, y: y * KM_TO_M, z: z * KM_TO_M });
    }
    return points;
  }

  /**
   * 构建一个可挂到 mars3d/Cesium graphic 上的 SampledPositionProperty
   * @param {Date} startDate - 起始 UTC 时间
   * @param {number} durationSec - 持续时长（秒），若 <=0 则取一个轨道周期
   * @param {number} [step=DEFAULT_STEP_MS] - 步长（毫秒），默认 1 小时
   * @param {"INERTIAL"|"FIXED"} [frame="FIXED"] - 参考坐标系
   * @returns {object} Cesium.SampledPositionProperty
   */
  buildSampledPositionProperty(startDate, durationSec, step = DEFAULT_STEP_MS, frame = "FIXED") {
    const Cesium = mars3d.Cesium;
    const referenceFrame = frame === "INERTIAL" ? Cesium.ReferenceFrame.INERTIAL : Cesium.ReferenceFrame.FIXED;

    const total = durationSec > 0 ? durationSec : this.getPeriodSeconds();
    const endDate = dayjs(startDate)
      .add(total + 1, "second")
      .toDate();

    const property = new Cesium.SampledPositionProperty(referenceFrame);
    property.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    property.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

    if (frame === "INERTIAL") {
      const states = this.getEciStates(startDate, endDate, step);
      states.forEach((s) => {
        const time = Cesium.JulianDate.fromDate(s.time);
        const position = new Cesium.Cartesian3(s.posEci.x * KM_TO_M, s.posEci.y * KM_TO_M, s.posEci.z * KM_TO_M);
        property.addSample(time, position);
      });
    } else {
      const states = this.getEcfStates(startDate, endDate, step);
      states.forEach((s) => {
        const time = Cesium.JulianDate.fromDate(s.time);
        const position = new Cesium.Cartesian3(s.posEcf.x * KM_TO_M, s.posEcf.y * KM_TO_M, s.posEcf.z * KM_TO_M);
        property.addSample(time, position);
      });
    }

    return property;
  }
}

export default SatelliteClass;
