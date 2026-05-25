// 谷歌gemini

// const satellite = require("satellite.js");
import * as satellite from "satellite.js";

class SatelliteAnalyzer {
  /**
   * 初始化两颗卫星
   * @param {string} tleA1 卫星A的TLE第一行
   * @param {string} tleA2 卫星A的TLE第二行
   * @param {string} tleB1 卫星B的TLE第一行
   * @param {string} tleB2 卫星B的TLE第二行
   */
  constructor(tleA1, tleA2, tleB1, tleB2) {
    this.satRecA = satellite.twoline2satrec(tleA1, tleA2);
    this.satRecB = satellite.twoline2satrec(tleB1, tleB2);
  }

  /**
   * 计算太阳在 ECI 坐标系下的位置 (低精度经验公式，精度约为 0.1 度)
   * @param {Date} date 时间对象
   * @returns {Object} {x, y, z} 太阳在 ECI 系的坐标 (单位: km)
   */
  getSunPositionECI(date) {
    const jd = satellite.jday(date);
    const n = jd - 2451545.0; // 距离 J2000 的天数

    // 太阳平黄经和平均近点角
    const L = (280.46 + 0.9856474 * n) % 360;
    const g = (357.528 + 0.9856003 * n) % 360;
    const gRad = g * (Math.PI / 180);

    // 黄经
    const lambda = (L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad)) % 360;
    const lambdaRad = lambda * (Math.PI / 180);

    // 黄赤交角
    const epsilon = 23.439 - 0.0000004 * n;
    const epsilonRad = epsilon * (Math.PI / 180);

    // 距离 (天文单位 AU 转 km)
    const R = 1.00014 - 0.01671 * Math.cos(gRad) - 0.00014 * Math.cos(2 * gRad);
    const AU_TO_KM = 149597870.7;
    const rKm = R * AU_TO_KM;

    return {
      x: rKm * Math.cos(lambdaRad),
      y: rKm * Math.cos(epsilonRad) * Math.sin(lambdaRad),
      z: rKm * Math.sin(epsilonRad) * Math.sin(lambdaRad),
    };
  }

  // 向量减法 V1 - V2
  vectorSub(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
  }

  // 向量模长
  vectorMag(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  // 向量点乘
  vectorDot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }

  // 计算两个向量的夹角 (返回角度制)
  angleBetween(v1, v2) {
    const mag1 = this.vectorMag(v1);
    const mag2 = this.vectorMag(v2);
    if (mag1 === 0 || mag2 === 0) return 0;
    let cosTheta = this.vectorDot(v1, v2) / (mag1 * mag2);
    cosTheta = Math.max(-1, Math.min(1, cosTheta)); // 防止浮点精度导致超出定义域
    return Math.acos(cosTheta) * (180 / Math.PI);
  }

  /**
   * 将北京时间字符串解析为 Date 对象
   * @param {string} bjtTimeStr 格式例如 "2024-03-20 12:00:00"
   * @returns {Date}
   */
  parseBJT(bjtTimeStr) {
    // 将北京时间视为 UTC+8
    const isoStr = bjtTimeStr.replace(" ", "T") + "+08:00";
    return new Date(isoStr);
  }

  /**
   * 计算时间段内的相对距离和光照角
   * @param {string} startBJT 开始时间 (北京时间)
   * @param {string} endBJT 结束时间 (北京时间)
   * @param {number} stepSeconds 步长 (秒)
   * @returns {Array} 包含时间、距离和角度的计算结果数组
   */
  analyze(startBJT, endBJT, stepSeconds = 60) {
    const startDate = this.parseBJT(startBJT);
    const endDate = this.parseBJT(endBJT);
    const results = [];

    for (let time = startDate.getTime(); time <= endDate.getTime(); time += stepSeconds * 1000) {
      const currentDate = new Date(time);

      // 外推卫星位置
      const positionAndVelocityA = satellite.propagate(this.satRecA, currentDate);
      const positionAndVelocityB = satellite.propagate(this.satRecB, currentDate);

      const posA = positionAndVelocityA.position;
      const posB = positionAndVelocityB.position;

      // 如果轨道衰减或数据错误，返回的可能是 undefined
      if (!posA || !posB) {
        continue;
      }

      // 获取太阳位置
      const posSun = this.getSunPositionECI(currentDate);

      // 1. A与B直线距离计算
      const vecAB = this.vectorSub(posB, posA);
      const distanceKm = this.vectorMag(vecAB);

      // 2. 光照角计算
      const vecBA = this.vectorSub(posA, posB); // B指向A
      const vecASun = this.vectorSub(posSun, posA); // A指向太阳
      const vecBSun = this.vectorSub(posSun, posB); // B指向太阳

      // A 顶点光照角：在 A 处看，目标 B 和 太阳的夹角
      const angleAtA = this.angleBetween(vecAB, vecASun);

      // B 顶点光照角：在 B 处看，目标 A 和 太阳的夹角
      const angleAtB = this.angleBetween(vecBA, vecBSun);

      results.push({
        timeBJT: currentDate.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }),
        distanceKm: distanceKm.toFixed(3),
        angleAtA_deg: angleAtA.toFixed(3), // 太阳-A-B的夹角
        angleAtB_deg: angleAtB.toFixed(3), // 太阳-B-A的夹角
      });
    }

    return results;
  }
}

module.exports = SatelliteAnalyzer;
