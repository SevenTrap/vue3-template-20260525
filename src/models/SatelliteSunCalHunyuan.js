// 混元大模型给出的答案

/**
 * Satellite Orbit Analyzer (No Earth Shadow Calculation)
 * 基于 satellite.js 实现卫星轨道外推及光照角计算（不考虑地球遮挡）
 */

import * as satellite from "satellite.js";

class SatelliteOrbitAnalyzer {
  /**
   * 构造函数
   * @param {string} tleLine1_A - 卫星 A 的第一行根数
   * @param {string} tleLine2_A - 卫星 A 的第二行根数
   * @param {string} tleLine1_B - 卫星 B 的第一行根数
   * @param {string} tleLine2_B - 卫星 B 的第二行根数
   */
  constructor(tleLine1_A, tleLine2_A, tleLine1_B, tleLine2_B) {
    this.satrec_A = satellite.twoline2satrec(tleLine1_A, tleLine2_A);
    this.satrec_B = satellite.twoline2satrec(tleLine1_B, tleLine2_B);

    // 太阳光近似距离 (AU to km)，简化处理，视为无穷远
    this.SUN_DISTANCE_KM = 149597870.7 * 1000; // 约 1.5亿公里
  }

  /**
   * 将北京时间字符串转换为 UTC Date 对象
   * @param {string} beijingTimeStr - 北京时间字符串，格式: YYYY-MM-DD HH:mm:ss
   * @returns {Date} UTC Date 对象
   */
  _beijingToUtcDate(beijingTimeStr) {
    const utcTimeStr = beijingTimeStr.replace(/(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})/, (match, date, time) => {
      const [hours, minutes, seconds] = time.split(":").map(Number);
      const utcHours = hours - 8;
      let newHours = utcHours;
      let newDate = date;

      if (utcHours < 0) {
        newHours += 24;
        const dateObj = new Date(date + "T00:00:00Z");
        dateObj.setUTCDate(dateObj.getUTCDate() - 1);
        newDate = dateObj.toISOString().split("T")[0];
      }

      const formattedHours = String(newHours).padStart(2, "0");
      return `${newDate}T${formattedHours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}Z`;
    });
    return new Date(utcTimeStr);
  }

  /**
   * 获取指定时刻卫星的 ECI 位置和速度 (km, km/s)
   * @param {satellite.SatRec} satrec - 卫星星历记录
   * @param {Date} date - UTC 日期对象
   * @returns {{position: Array, velocity: Array}} ECI 位置和速度
   */
  _getECIState(satrec, date) {
    const positionAndVelocity = satellite.propagate(satrec, date);
    const positionEci = positionAndVelocity.position;

    if (!positionEci) {
      throw new Error(`Propagation failed for the given date: ${date}`);
    }

    return {
      position: positionEci,
      velocity: positionAndVelocity.velocity,
    };
  }

  /**
   * 计算太阳在指定时刻 ECI 坐标系中的单位方向向量
   * @param {Date} date - UTC 日期对象
   * @returns {Array} 太阳方向单位向量 [x, y, z]
   */
  _getSunDirectionECI(date) {
    const jd = satellite.jday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());

    const T = (jd - 2451545.0) / 36525.0;

    const meanLongitude = 280.46061837 + 36000.770053608 * T;
    const meanAnomaly = 357.52772333 + 35999.05034 * T;
    const eclipticLongitude = meanLongitude + 1.914666471 * Math.sin((meanAnomaly * Math.PI) / 180) + 0.019994643 * Math.sin((2 * meanAnomaly * Math.PI) / 180);

    const epsilon = (23.43929111 * Math.PI) / 180;
    const lambdaRad = (eclipticLongitude * Math.PI) / 180;

    const sunX = Math.cos(lambdaRad);
    const sunY = Math.cos(epsilon) * Math.sin(lambdaRad);
    const sunZ = Math.sin(epsilon) * Math.sin(lambdaRad);

    const mag = Math.sqrt(sunX * sunX + sunY * sunY + sunZ * sunZ);
    return [sunX / mag, sunY / mag, sunZ / mag];
  }

  /**
   * 计算两个向量之间的夹角（弧度）
   * @param {Array} vec1 - 向量 1
   * @param {Array} vec2 - 向量 2
   * @returns {number} 夹角（弧度）
   */
  _angleBetweenVectors(vec1, vec2) {
    const dotProduct = vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2];
    const mag1 = Math.sqrt(vec1[0] * vec1[0] + vec1[1] * vec1[1] + vec1[2] * vec1[2]);
    const mag2 = Math.sqrt(vec2[0] * vec2[0] + vec2[1] * vec2[1] + vec2[2] * vec2[2]);
    const cosTheta = dotProduct / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosTheta)));
  }

  /**
   * 主计算方法：计算指定时刻 A 对 B、B 对 A 的光照角和 AB 距离
   * @param {Date} utcDate - UTC 日期对象
   * @returns {object} 计算结果
   */
  calculateAtTime(utcDate) {
    const stateA = this._getECIState(this.satrec_A, utcDate);
    const stateB = this._getECIState(this.satrec_B, utcDate);

    const posA = stateA.position;
    const posB = stateB.position;

    const sunDir = this._getSunDirectionECI(utcDate);

    const dx = posB[0] - posA[0];
    const dy = posB[1] - posA[1];
    const dz = posB[2] - posA[2];
    const distanceAB = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const vecBA = [dx, dy, dz];
    const vecSA = [sunDir[0] * this.SUN_DISTANCE_KM - posA[0], sunDir[1] * this.SUN_DISTANCE_KM - posA[1], sunDir[2] * this.SUN_DISTANCE_KM - posA[2]];
    const angle_AB_from_A_to_Sun = this._angleBetweenVectors(vecBA, vecSA);

    const vecAB = [-dx, -dy, -dz];
    const vecSB = [sunDir[0] * this.SUN_DISTANCE_KM - posB[0], sunDir[1] * this.SUN_DISTANCE_KM - posB[1], sunDir[2] * this.SUN_DISTANCE_KM - posB[2]];
    const angle_BA_from_B_to_Sun = this._angleBetweenVectors(vecAB, vecSB);

    return {
      timestamp: utcDate.toISOString(),
      beijingTime: new Date(utcDate.getTime() + 8 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19),
      distanceAB_km: distanceAB,
      angle_A_to_B_sun_rad: angle_AB_from_A_to_Sun,
      angle_A_to_B_sun_deg: (angle_AB_from_A_to_Sun * 180) / Math.PI,
      angle_B_to_A_sun_rad: angle_BA_from_B_to_Sun,
      angle_B_to_A_sun_deg: (angle_BA_from_B_to_Sun * 180) / Math.PI,
    };
  }

  /**
   * 在指定时间范围内进行分析
   * @param {string} startTimeBeijing - 开始时间 (北京时间)
   * @param {string} endTimeBeijing - 结束时间 (北京时间)
   * @param {number} stepMinutes - 步长（分钟）
   * @returns {Array} 分析结果数组
   */
  analyzeTimeRange(startTimeBeijing, endTimeBeijing, stepMinutes = 10) {
    const results = [];
    const startDateUtc = this._beijingToUtcDate(startTimeBeijing);
    const endDateUtc = this._beijingToUtcDate(endTimeBeijing);

    const stepMs = stepMinutes * 60 * 1000;
    let currentTimeUtc = new Date(startDateUtc);

    while (currentTimeUtc <= endDateUtc) {
      try {
        const result = this.calculateAtTime(currentTimeUtc);
        results.push(result);
      } catch (error) {
        console.error(`Error calculating at ${currentTimeUtc}:`, error.message);
      }
      currentTimeUtc = new Date(currentTimeUtc.getTime() + stepMs);
    }

    return results;
  }
}

// --- 测试方案 ---
function runTest() {
  const tle_A = {
    line1: "1 25544U 98067A   25140.50000000  .00016717  00000+0  10270-3 0  9998",
    line2: "2 25544  51.6416 207.3668 0003386  43.3833  83.4896 15.50063396 78485",
  };

  const tle_B = {
    line1: "1 20580U 90037B   25140.50000000  .00000586  00000+0  31779-4 0  9998",
    line2: "2 20580  28.4698 116.5706 0002636 226.9346 133.1175 15.09298656262189",
  };

  const analyzer = new SatelliteOrbitAnalyzer(tle_A.line1, tle_A.line2, tle_B.line1, tle_B.line2);

  const startTime = "2026-03-20 08:00:00";
  const endTime = "2026-03-20 09:00:00";
  const step = 10;

  console.log("开始分析...");
  const results = analyzer.analyzeTimeRange(startTime, endTime, step);

  console.log("\n分析结果汇总:");
  console.table(
    results.map((r) => ({
      Time: r.beijingTime,
      Distance_km: r.distanceAB_km.toFixed(2),
      Angle_A_to_B_Sun_deg: r.angle_A_to_B_sun_deg.toFixed(2),
      Angle_B_to_A_Sun_deg: r.angle_B_to_A_sun_deg.toFixed(2),
    })),
  );

  if (results.length > 0) {
    console.log("\n首个时间点详细数据:", JSON.stringify(results[0], null, 2));
  }
}

runTest();

module.exports = SatelliteOrbitAnalyzer;
