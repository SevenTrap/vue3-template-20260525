// qwen代码

class SatelliteOrbitPropagator {
  constructor() {
    // 初始化常量
    this.EARTH_RADIUS = 6378.137; // 地球半径 km
    this.SUN_RADIUS = 696340; // 太阳半径 km
    this.AU = 149597870.7; // 天文单位 km
  }

  /**
   * 将北京时间字符串转换为UTC Date对象
   * @param {string} timeStr - 北京时间字符串，格式为 'YYYY-MM-DD HH:mm:ss'
   * @returns {Date} UTC时间的Date对象
   */
  convertToUTC(timeStr) {
    // 假设输入是北京时间（UTC+8）
    const date = new Date(timeStr);
    // 转换为UTC时间（减去8小时）
    return new Date(date.getTime() - 8 * 60 * 60 * 1000);
  }

  /**
   * 计算光照角
   * @param {Object} satPositionECI - 卫星位置（ECI坐标系）
   * @param {Array} sunPositionECI - 太阳位置（ECI坐标系）[x, y, z]
   * @returns {number} 光照角（弧度）
   */
  calculateSunlightAngle(satPositionECI, sunPositionECI) {
    // 计算卫星位置向量
    const satVec = {
      x: satPositionECI.x,
      y: satPositionECI.y,
      z: satPositionECI.z,
    };

    // 计算太阳位置向量
    const sunVec = {
      x: sunPositionECI[0],
      y: sunPositionECI[1],
      z: sunPositionECI[2],
    };

    // 计算两个向量之间的夹角
    const dotProduct = satVec.x * sunVec.x + satVec.y * sunVec.y + satVec.z * sunVec.z;

    const satMagnitude = Math.sqrt(satVec.x * satVec.x + satVec.y * satVec.y + satVec.z * satVec.z);

    const sunMagnitude = Math.sqrt(sunVec.x * sunVec.x + sunVec.y * sunVec.y + sunVec.z * sunVec.z);

    if (satMagnitude === 0 || sunMagnitude === 0) {
      return 0;
    }

    const cosAngle = dotProduct / (satMagnitude * sunMagnitude);
    // 确保cosAngle在[-1, 1]范围内
    const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
    return Math.acos(clampedCosAngle);
  }

  /**
   * 计算两点间直线距离
   * @param {Object} pos1 - 第一个点的位置{x, y, z}
   * @param {Object} pos2 - 第二个点的位置{x, y, z}
   * @returns {number} 直线距离（km）
   */
  calculateDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 计算太阳在ECI坐标系中的位置（简化模型）
   * @param {Date} date - 时间
   * @returns {Array} [x, y, z] 太阳位置（km）
   */
  calculateSunPosition(date) {
    // 简化的太阳位置计算
    const jd = this.dateToJulianDay(date);
    const T = (jd - 2451545.0) / 36525; // 世纪数

    // 平均黄经
    let L = (280.46 + 36000.771 * T) % 360;
    if (L < 0) L += 360;

    // 平近点角
    const M = (357.528 + 35999.05 * T) % 360;
    if (M < 0) M += 360;

    // 黄道经度
    const C = 1.915 * Math.sin((M * Math.PI) / 180) + 0.02 * Math.sin((2 * M * Math.PI) / 180); // 中心差
    const lambda = (L + C) % 360;
    if (lambda < 0) lambda += 360;

    // 距离（天文单位）
    const R = 1.00014 - 0.01671 * Math.cos((M * Math.PI) / 180) - 0.00014 * Math.cos((2 * M * Math.PI) / 180);

    // 转换为直角坐标（假设黄赤交角约为23.4度）
    const epsilon = 23.439 - 0.0000004 * T; // 黄赤交角
    const x = R * Math.cos((lambda * Math.PI) / 180);
    const y = R * Math.sin((lambda * Math.PI) / 180) * Math.cos((epsilon * Math.PI) / 180);
    const z = R * Math.sin((lambda * Math.PI) / 180) * Math.sin((epsilon * Math.PI) / 180);

    // 转换为千米
    return [x * this.AU, y * this.AU, z * this.AU];
  }

  /**
   * 日期转儒略日
   * @param {Date} date - 日期对象
   * @returns {number} 儒略日
   */
  dateToJulianDay(date) {
    const a = Math.floor((14 - (date.getUTCMonth() + 1)) / 12);
    const y = date.getUTCFullYear() + 4800 - a;
    const m = date.getUTCMonth() + 1 + 12 * a - 3;
    const jd =
      date.getUTCDate() +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045 +
      (date.getUTCHours() - 12) / 24.0 +
      date.getUTCMinutes() / 1440.0 +
      date.getUTCSeconds() / 86400.0;
    return jd;
  }

  /**
   * 主要计算函数
   * @param {string} tleA1 - A卫星TLE第一行
   * @param {string} tleA2 - A卫星TLE第二行
   * @param {string} tleB1 - B卫星TLE第一行
   * @param {string} tleB2 - B卫星TLE第二行
   * @param {string} startTime - 开始时间（北京时间）
   * @param {string} endTime - 结束时间（北京时间）
   * @param {number} stepMinutes - 步长（分钟）
   * @returns {Array} 包含时间戳和计算结果的数组
   */
  propagate(tleA1, tleA2, tleB1, tleB2, startTime, endTime, stepMinutes = 60) {
    try {
      // 解析TLE数据
      const satrecA = satellite.twoline2satrec(tleA1, tleA2);
      const satrecB = satellite.twoline2satrec(tleB1, tleB2);

      // 转换时间
      const startUTC = this.convertToUTC(startTime);
      const endUTC = this.convertToUTC(endTime);

      // 存储结果
      const results = [];

      // 进行轨道外推计算
      let currentTime = new Date(startUTC);
      while (currentTime <= endUTC) {
        // 计算卫星位置和速度
        const positionVelocityA = satellite.propagate(
          satrecA,
          currentTime.getUTCFullYear(),
          currentTime.getUTCMonth() + 1,
          currentTime.getUTCDate(),
          currentTime.getUTCHours(),
          currentTime.getUTCMinutes(),
          currentTime.getUTCSeconds(),
        );

        const positionVelocityB = satellite.propagate(
          satrecB,
          currentTime.getUTCFullYear(),
          currentTime.getUTCMonth() + 1,
          currentTime.getUTCDate(),
          currentTime.getUTCHours(),
          currentTime.getUTCMinutes(),
          currentTime.getUTCSeconds(),
        );

        // 检查是否有有效数据
        if (positionVelocityA.position && positionVelocityB.position) {
          // 获取位置
          const posA = positionVelocityA.position;
          const posB = positionVelocityB.position;

          // 计算太阳位置
          const sunPos = this.calculateSunPosition(currentTime);

          // 计算光照角
          const sunlightAngleA = this.calculateSunlightAngle(posA, sunPos);
          const sunlightAngleB = this.calculateSunlightAngle(posB, sunPos);

          // 计算AB之间距离
          const distanceAB = this.calculateDistance(posA, posB);

          // 添加到结果
          results.push({
            timestamp: new Date(currentTime).toISOString(),
            time: currentTime.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
            satelliteA: {
              position: posA,
              sunlightAngle: (sunlightAngleA * 180) / Math.PI, // 转换为度
            },
            satelliteB: {
              position: posB,
              sunlightAngle: (sunlightAngleB * 180) / Math.PI, // 转换为度
            },
            distanceAB: distanceAB,
          });
        }

        // 增加时间步长
        currentTime = new Date(currentTime.getTime() + stepMinutes * 60000);
      }

      return results;
    } catch (error) {
      console.error("轨道外推计算错误:", error);
      throw error;
    }
  }
}

// 示例使用
document.addEventListener("DOMContentLoaded", function () {
  // 创建示例卫星TLE数据（国际空间站ISS）
  const tleA1 = "1 25544U 98067A   23275.60625000  .00016717  00000-0  28098-3 0  9993";
  const tleA2 = "2 25544  51.6439 237.4572 0003490  62.3231  69.9746 15.49998417418407";

  const tleB1 = "1 25544U 98067A   23275.60625000  .00016717  00000-0  28098-3 0  9993";
  const tleB2 = "2 25544  51.6439 237.4572 0003490  62.3231  69.9746 15.49998417418407";

  const propagator = new SatelliteOrbitPropagator();

  try {
    // 计算轨道
    const results = propagator.propagate(
      tleA1,
      tleA2,
      tleB1,
      tleB2,
      "2023-10-01 12:00:00",
      "2023-10-01 14:00:00",
      30, // 每30分钟计算一次
    );

    // 显示结果
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = "<h2>计算结果:</h2>";

    results.forEach((result) => {
      outputDiv.innerHTML += `
                        <div style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
                            <p><strong>时间:</strong> ${result.time}</p>
                            <p><strong>A卫星光照角:</strong> ${result.satelliteA.sunlightAngle.toFixed(2)}°</p>
                            <p><strong>B卫星光照角:</strong> ${result.satelliteB.sunlightAngle.toFixed(2)}°</p>
                            <p><strong>AB间距离:</strong> ${result.distanceAB.toFixed(2)} km</p>
                            <p><strong>A卫星位置:</strong> (${result.satelliteA.position.x.toFixed(2)}, ${result.satelliteA.position.y.toFixed(2)}, ${result.satelliteA.position.z.toFixed(2)}) km</p>
                            <p><strong>B卫星位置:</strong> (${result.satelliteB.position.x.toFixed(2)}, ${result.satelliteB.position.y.toFixed(2)}, ${result.satelliteB.position.z.toFixed(2)}) km</p>
                        </div>
                    `;
    });

    console.log("轨道外推计算完成", results);
  } catch (error) {
    console.error("计算失败:", error);
    document.getElementById("output").innerHTML = `<p style="color: red;">计算失败: ${error.message}</p>`;
  }
});
