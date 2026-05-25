// 基于
class SatellitePropagator {
  /**
   * 初始化高轨卫星轨道推演器
   * @param {number} a - 半长轴 Semi-major axis (单位: 米)
   * @param {number} e - 偏心率 Eccentricity (无量纲，0 <= e < 1)
   * @param {number} i - 轨道倾角 Inclination (单位: 度)
   * @param {number} raan - 升交点赤经 Right Ascension of the Ascending Node (单位: 度)
   * @param {number} argPerigee - 近地点幅角 Argument of Perigee (单位: 度)
   * @param {number} meanAnomaly - 平近点角 Mean Anomaly at epoch (单位: 度)
   * @param {string} epoch - 历元时刻，格式推荐 "YYYY-MM-DDTHH:mm:ss+08:00" (北京时间)
   */
  constructor(a, e, i, raan, argPerigee, meanAnomaly, epoch) {
    this.mu = 3.986004418e14; // 地球标准引力参数 m^3/s^2

    // 保存轨道六根数 (角度转为弧度)
    this.a = a;
    this.e = e;
    this.i = this.deg2rad(i);
    this.raan = this.deg2rad(raan);
    this.argPerigee = this.deg2rad(argPerigee);
    this.M0 = this.deg2rad(meanAnomaly);

    // 解析历元时间 (毫秒时间戳)
    this.epochTime = new Date(epoch).getTime();

    // 计算平运动平均角速度 (rad/s)
    this.n = Math.sqrt(this.mu / Math.pow(this.a, 3));
  }

  // 辅助方法：角度转弧度
  deg2rad(deg) {
    return (deg * Math.PI) / 180.0;
  }

  // 辅助方法：弧度转角度
  rad2deg(rad) {
    return (rad * 180.0) / Math.PI;
  }

  // 将时间戳转为儒略日 (Julian Date)
  getJulianDate(timestampMs) {
    return timestampMs / 86400000.0 + 2440587.5;
  }

  // 计算格林尼治平恒星时角 (返回弧度)
  calculateGMST(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    let gmstDeg = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - Math.pow(T, 3) / 38710000.0;
    gmstDeg = gmstDeg % 360.0;
    if (gmstDeg < 0) gmstDeg += 360.0;
    return this.deg2rad(gmstDeg);
  }

  /**
   * 根据任意时间计算卫星的 LLA (经度、纬度、高度)
   * @param {string} targetTimeStr - 目标时刻字符串，如 "2023-10-24T15:30:00+08:00"
   * @returns {Object} 包含 lat (纬度，度), lon (经度，度), alt (高度，米) 的对象
   */
  getPositionAtTime(targetTimeStr) {
    const targetTime = new Date(targetTimeStr).getTime();
    const deltaT = (targetTime - this.epochTime) / 1000.0; // 时间差转换为秒

    // 1. 更新平近点角
    let M = this.M0 + this.n * deltaT;
    M = M % (2 * Math.PI);

    // 2. 牛顿-拉夫逊迭代求解开普勒方程 (求偏近点角 E)
    let E = M;
    let deltaE = 1.0;
    const epsilon = 1e-8;
    let maxIter = 100;
    while (Math.abs(deltaE) > epsilon && maxIter > 0) {
      deltaE = (E - this.e * Math.sin(E) - M) / (1 - this.e * Math.cos(E));
      E = E - deltaE;
      maxIter--;
    }

    // 3. 计算真近点角与距离
    const nu = 2 * Math.atan(Math.sqrt((1 + this.e) / (1 - this.e)) * Math.tan(E / 2));
    const r = this.a * (1 - this.e * Math.cos(E));

    // 纬度幅角 (Argument of Latitude)
    const u = this.argPerigee + nu;

    // 4. 转换到 J2000 (ECI) 坐标系 (单位：米)
    const x_eci = r * (Math.cos(this.raan) * Math.cos(u) - Math.sin(this.raan) * Math.sin(u) * Math.cos(this.i));
    const y_eci = r * (Math.sin(this.raan) * Math.cos(u) + Math.cos(this.raan) * Math.sin(u) * Math.cos(this.i));
    const z_eci = r * (Math.sin(u) * Math.sin(this.i));

    // 5. 转换到 ECEF 地固坐标系
    const jd = this.getJulianDate(targetTime);
    const gmst = this.calculateGMST(jd);

    const x_ecef = x_eci * Math.cos(gmst) + y_eci * Math.sin(gmst);
    const y_ecef = -x_eci * Math.sin(gmst) + y_eci * Math.cos(gmst);
    const z_ecef = z_eci;

    // 6. ECEF 转换到 LLA (经度、纬度、高度) - 基于WGS84
    const aWGS = 6378137.0;
    const fWGS = 1 / 298.257223563;
    const e2WGS = 2 * fWGS - fWGS * fWGS;

    const p = Math.sqrt(x_ecef * x_ecef + y_ecef * y_ecef);
    let lon = Math.atan2(y_ecef, x_ecef);

    // 迭代求解纬度
    let lat = Math.atan(z_ecef / (p * (1 - e2WGS)));
    let alt = 0;
    let latDiff = 1.0;

    while (latDiff > 1e-8) {
      let sinLat = Math.sin(lat);
      let N = aWGS / Math.sqrt(1 - e2WGS * sinLat * sinLat);
      alt = p / Math.cos(lat) - N;

      let newLat = Math.atan((z_ecef / p) * Math.pow(1 - e2WGS * (N / (N + alt)), -1));
      latDiff = Math.abs(newLat - lat);
      lat = newLat;
    }

    return {
      latitude: this.rad2deg(lat),
      longitude: this.rad2deg(lon),
      altitude: alt, // 单位：米
      x_ecef: x_ecef, // 可选返回：ECEF X
      y_ecef: y_ecef, // 可选返回：ECEF Y
      z_ecef: z_ecef, // 可选返回：ECEF Z
    };
  }
}

// ========================
// 实际使用示例
// ========================

// 假设有一颗地球同步轨道卫星(GEO)的6根数
const semiMajorAxis = 42165012; // 半长轴约 42164 km -> 转换为米
const eccentricity = 0.00006; // 近似圆轨道
const inclination = 1.218463; // 赤道面倾角 0 度
const raan = 86.093046; // 升交点赤经 120 度
const argPerigee = 297.58887; // 近地点幅角 0 度
const meanAnomaly = 249.8044; // 平近点角 45 度
const epoch = "2026-03-18T08:00:00+08:00"; // 历元时间：北京时间

// 初始化推演器
const sat = new SatellitePropagator(semiMajorAxis, eccentricity, inclination, raan, argPerigee, meanAnomaly, epoch);

// 计算 3 小时后的卫星位置 (仍然传入北京时间)
const targetTime = "2026-03-19T22:00:00+08:00";
const result = sat.getPositionAtTime(targetTime);

console.log("经纬高计算结果:");
console.log(`纬度 (Latitude): ${result.latitude.toFixed(4)}°`);
console.log(`经度 (Longitude): ${result.longitude.toFixed(4)}°`);
console.log(`高度 (Altitude): ${(result.altitude / 1000).toFixed(2)} km`);
