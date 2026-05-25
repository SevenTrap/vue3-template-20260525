/**
 * 卫星轨道六根数转LLA坐标转换类
 * 根据轨道六根数参数计算任意时刻的卫星位置
 */
class SatelliteOrbitCalculator {
  constructor() {
    // 物理常数
    this.GM_EARTH = 3.986004418e14; // 地球引力常数 (m³/s²)
    this.EARTH_RADIUS = 6378137.0; // WGS84长半轴 (m)
    this.EARTH_FLATTENING = 1 / 298.257223563; // WGS84扁率
    this.EARTH_ECCENTRICITY_SQUARED = 2 * this.EARTH_FLATTENING - this.EARTH_FLATTENING * this.EARTH_FLATTENING;
    this.EARTH_ROTATION_RATE = 7.292115e-5; // 地球自转角速度 (rad/s)

    // 儒略日参考时间（J2000.0）
    this.J2000_JD = 2451545.0;
  }

  /**
   * 计算儒略日
   * @param {Date} date - 北京时间日期对象
   * @returns {number} 儒略日
   */
  calculateJulianDay(date) {
    // 转换为UTC时间
    const utcDate = new Date(date.getTime() - 8 * 3600 * 1000); // 北京时间减8小时得到UTC

    const year = utcDate.getUTCFullYear();
    const month = utcDate.getUTCMonth() + 1;
    const day = utcDate.getUTCDate();
    const hour = utcDate.getUTCHours();
    const minute = utcDate.getUTCMinutes();
    const second = utcDate.getUTCSeconds() + utcDate.getUTCMilliseconds() / 1000;

    let a, b;
    if (month <= 2) {
      a = Math.floor((14 - month) / 12);
      b = 0;
    } else {
      a = 0;
      b = Math.floor((year + 4716) / 4) - Math.floor(year + 4900) / 100 + Math.floor(Math.floor(year + 4900) / 100 / 4);
    }

    const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day - 1524.5 + (hour - 12) / 24 + minute / 1440 + second / 86400;

    return jd;
  }

  /**
   * 解算开普勒方程，由平近点角计算偏近点角
   * @param {number} M - 平近点角 (弧度)
   * @param {number} e - 偏心率
   * @returns {number} 偏近点角 (弧度)
   */
  solveKeplerEquation(M, e) {
    // 使用牛顿-拉夫逊方法解开普勒方程: E - e*sin(E) = M
    let E = M; // 初始猜测值
    const tolerance = 1e-10;
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      const f = E - e * Math.sin(E) - M;
      const f_prime = 1 - e * Math.cos(E);

      const delta = f / f_prime;
      E -= delta;

      if (Math.abs(delta) < tolerance) {
        break;
      }

      iterations++;
    }

    return E;
  }

  /**
   * 计算真近点角
   * @param {number} E - 偏近点角 (弧度)
   * @param {number} e - 偏心率
   * @returns {number} 真近点角 (弧度)
   */
  calculateTrueAnomaly(E, e) {
    // 通过偏近点角计算真近点角
    const tan_v_2 = Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2);
    let v = 2 * Math.atan(tan_v_2);

    // 确保角度在 [0, 2π] 范围内
    if (v < 0) v += 2 * Math.PI;

    return v;
  }

  /**
   * 计算轨道半长轴对应的平均运动 (弧度/秒)
   * @param {number} a - 半长轴 (m)
   * @returns {number} 平均运动 (弧度/秒)
   */
  calculateMeanMotion(a) {
    return Math.sqrt(this.GM_EARTH / (a * a * a));
  }

  /**
   * 计算从轨道平面到J2000坐标系的旋转矩阵
   * @param {number} Omega - 升交点赤经 (弧度)
   * @param {number} i - 轨道倾角 (弧度)
   * @param {number} omega - 近地点幅角 (弧度)
   * @returns {Array<Array<number>>} 旋转矩阵
   */
  calculateOrbitalToJ2000Matrix(Omega, i, omega) {
    // 从轨道平面到J2000的变换矩阵
    // R = R_z(-Ω) * R_x(-i) * R_z(-ω)
    const cosOmega = Math.cos(Omega);
    const sinOmega = Math.sin(Omega);
    const cosi = Math.cos(i);
    const sini = Math.sin(i);
    const cosomega = Math.cos(omega);
    const sinomega = Math.sin(omega);

    // 组合旋转矩阵
    return [
      [cosOmega * cosomega - sinOmega * sinomega * cosi, -cosOmega * sinomega - sinOmega * cosomega * cosi, sinOmega * sini],
      [sinOmega * cosomega + cosOmega * sinomega * cosi, -sinOmega * sinomega + cosOmega * cosomega * cosi, -cosOmega * sini],
      [sinomega * sini, cosomega * sini, cosi],
    ];
  }

  /**
   * 根据轨道六根数计算J2000坐标系下的位置和速度
   * @param {Object} orbitalElements - 轨道六根数对象
   * @param {number} orbitalElements.a - 半长轴 (m)
   * @param {number} orbitalElements.e - 偏心率
   * @param {number} orbitalElements.i - 轨道倾角 (度)
   * @param {number} orbitalElements.Omega - 升交点赤经 (度)
   * @param {number} orbitalElements.omega - 近地点幅角 (度)
   * @param {number} orbitalElements.M - 平近点角 (度)
   * @param {Date} epochTime - 历元时刻 (北京时间)
   * @param {Date} targetTime - 目标时刻 (北京时间)
   * @returns {Object} 包含位置和速度的对象 {position: [x,y,z], velocity: [vx,vy,vz]}
   */
  calculateJ2000Position(orbitalElements, epochTime, targetTime) {
    // 转换角度为弧度
    const i = (orbitalElements.i * Math.PI) / 180;
    const Omega = (orbitalElements.Omega * Math.PI) / 180;
    const omega = (orbitalElements.omega * Math.PI) / 180;

    // 计算时间差 (秒)
    const epochJD = this.calculateJulianDay(epochTime);
    const targetJD = this.calculateJulianDay(targetTime);
    const deltaTime = (targetJD - epochJD) * 86400; // 转换为秒

    // 计算目标时刻的平近点角
    const n = this.calculateMeanMotion(orbitalElements.a); // 平均运动
    const M_at_epoch = (orbitalElements.M * Math.PI) / 180;
    const M_at_target = M_at_epoch + n * deltaTime;

    // 规范化平近点角到 [0, 2π]
    let M = M_at_target % (2 * Math.PI);
    if (M < 0) M += 2 * Math.PI;

    // 解开普勒方程得到偏近点角
    const E = this.solveKeplerEquation(M, orbitalElements.e);

    // 计算真近点角
    const v = this.calculateTrueAnomaly(E, orbitalElements.e);

    // 计算轨道半径
    const r = orbitalElements.a * (1 - orbitalElements.e * Math.cos(E));

    // 在轨道平面内的位置向量
    const x_orb = r * Math.cos(v);
    const y_orb = r * Math.sin(v);

    // 计算轨道平面内的速度
    const h = Math.sqrt(this.GM_EARTH * orbitalElements.a * (1 - orbitalElements.e * orbitalElements.e)); // 比角动量
    const vx_orb = (this.GM_EARTH * Math.sin(v)) / h;
    const vy_orb = (this.GM_EARTH * (orbitalElements.e + Math.cos(v))) / h;

    // 构建从轨道平面到J2000的旋转矩阵
    const rotMatrix = this.calculateOrbitalToJ2000Matrix(Omega, i, omega);

    // 将轨道平面坐标转换为J2000坐标
    const position = [
      rotMatrix[0][0] * x_orb + rotMatrix[0][1] * y_orb,
      rotMatrix[1][0] * x_orb + rotMatrix[1][1] * y_orb,
      rotMatrix[2][0] * x_orb + rotMatrix[2][1] * y_orb,
    ];

    const velocity = [
      rotMatrix[0][0] * vx_orb + rotMatrix[0][1] * vy_orb,
      rotMatrix[1][0] * vx_orb + rotMatrix[1][1] * vy_orb,
      rotMatrix[2][0] * vx_orb + rotMatrix[2][1] * vy_orb,
    ];

    return { position, velocity };
  }

  /**
   * 计算格林尼治平恒星时 (GMST)
   * @param {number} jd - 儒略日
   * @returns {number} GMST (弧度)
   */
  calculateGMST(jd) {
    const t = (jd - this.J2000_JD) / 36525.0; // 从J2000.0开始的世纪数

    // 计算GMST (单位: 弧度)
    let gmst = 280.46061837 + 360.98564736629 * (jd - this.J2000_JD) + 0.000387933 * t * t - (t * t * t) / 38710000;

    // 转换为弧度并规范化到 [0, 2π]
    gmst = ((gmst * Math.PI) / 180) % (2 * Math.PI);
    if (gmst < 0) gmst += 2 * Math.PI;

    return gmst;
  }

  /**
   * 将J2000坐标转换为ECEF坐标
   * @param {Array<number>} j2000Pos - J2000坐标系下的位置向量 [x, y, z] (米)
   * @param {Date} targetTime - 目标时间 (北京时间)
   * @returns {Array<number>} ECEF坐标系下的位置向量 [x, y, z] (米)
   */
  j2000ToECEF(j2000Pos, targetTime) {
    const jd = this.calculateJulianDay(targetTime);

    // 应用地球自转 (GAST - 地球相对于恒星的自转角度)
    const gmst = this.calculateGMST(jd);
    const cosGmst = Math.cos(gmst);
    const sinGmst = Math.sin(gmst);

    // 自转矩阵 (从J2000到ECEF)
    const rotationMatrixEarth = [
      [cosGmst, sinGmst, 0],
      [-sinGmst, cosGmst, 0],
      [0, 0, 1],
    ];

    // 最终ECEF坐标
    const ecefPos = [
      rotationMatrixEarth[0][0] * j2000Pos[0] + rotationMatrixEarth[0][1] * j2000Pos[1] + rotationMatrixEarth[0][2] * j2000Pos[2],
      rotationMatrixEarth[1][0] * j2000Pos[0] + rotationMatrixEarth[1][1] * j2000Pos[1] + rotationMatrixEarth[1][2] * j2000Pos[2],
      rotationMatrixEarth[2][0] * j2000Pos[0] + rotationMatrixEarth[2][1] * j2000Pos[1] + rotationMatrixEarth[2][2] * j2000Pos[2],
    ];

    return ecefPos;
  }

  /**
   * 将ECEF坐标转换为LLA坐标
   * @param {Array<number>} ecefPos - ECEF坐标系下的位置向量 [x, y, z] (米)
   * @returns {Array<number>} LLA坐标 [longitude, latitude, altitude] (度, 度, 米)
   */
  ecefToLLA(ecefPos) {
    const x = ecefPos[0];
    const y = ecefPos[1];
    const z = ecefPos[2];

    // 计算经度
    const longitude = Math.atan2(y, x);

    // 迭代计算纬度和高度
    const p = Math.sqrt(x * x + y * y);
    let lat = Math.atan2(z, p * (1 - this.EARTH_ECCENTRICITY_SQUARED));
    let prevLat;
    let height;

    do {
      prevLat = lat;
      const sinLat = Math.sin(lat);
      const N = this.EARTH_RADIUS / Math.sqrt(1 - this.EARTH_ECCENTRICITY_SQUARED * sinLat * sinLat);
      lat = Math.atan2(z + N * this.EARTH_ECCENTRICITY_SQUARED * sinLat, p);
      height = p / Math.cos(lat) - N;
    } while (Math.abs(lat - prevLat) > 1e-10);

    // 转换为度
    const latitude = (lat * 180) / Math.PI;
    const lonDeg = (longitude * 180) / Math.PI;

    return [lonDeg, latitude, height];
  }

  /**
   * 主转换函数：根据轨道六根数和时间计算LLA
   * @param {Object} orbitalElements - 轨道六根数对象
   * @param {number} orbitalElements.a - 半长轴 (m)
   * @param {number} orbitalElements.e - 偏心率
   * @param {number} orbitalElements.i - 轨道倾角 (度)
   * @param {number} orbitalElements.Omega - 升交点赤经 (度)
   * @param {number} orbitalElements.omega - 近地点幅角 (度)
   * @param {number} orbitalElements.M - 平近点角 (度)
   * @param {Date} epochTime - 历元时刻 (北京时间)
   * @param {Date} targetTime - 目标时刻 (北京时间)
   * @returns {Array<number>} LLA坐标 [longitude, latitude, altitude] (度, 度, 米)
   */
  calculateLLA(orbitalElements, epochTime, targetTime) {
    // 步骤1: 根据轨道六根数计算J2000坐标
    const j2000Result = this.calculateJ2000Position(orbitalElements, epochTime, targetTime);
    const j2000Pos = j2000Result.position;

    // 步骤2: J2000到ECEF转换
    const ecefPos = this.j2000ToECEF(j2000Pos, targetTime);

    // 步骤3: ECEF到LLA转换
    const lla = this.ecefToLLA(ecefPos);

    return lla;
  }
}

// 示例使用
const calculator = new SatelliteOrbitCalculator();

// 示例轨道六根数 (以GPS卫星为例)
const orbitalElements = {
  a: 42166188, // 半长轴 (m)
  e: 0.000429, // 偏心率
  i: 4.066796, // 轨道倾角 (度)
  Omega: 328.56763, // 升交点赤经 (度)
  omega: 60.632767, // 近地点幅角 (度)
  M: 286.51334, // 平近点角 (度)
};

// 历元时刻和目标时刻 (北京时间)
const epochTime = new Date("2026-03-18T08:00:00+08:00");
const targetTime = new Date("2026-03-19T22:00:00+08:00"); // 1分钟后

// 计算LLA坐标
const llaResult = calculator.calculateLLA(orbitalElements, epochTime, targetTime);

console.log(`轨道六根数:`);
console.log(`半长轴: ${orbitalElements.a} m`);
console.log(`偏心率: ${orbitalElements.e}`);
console.log(`轨道倾角: ${orbitalElements.i}°`);
console.log(`升交点赤经: ${orbitalElements.Omega}°`);
console.log(`近地点幅角: ${orbitalElements.omega}°`);
console.log(`平近点角: ${orbitalElements.M}°`);
console.log(`\n历元时刻: ${epochTime.toISOString()}`);
console.log(`目标时刻: ${targetTime.toISOString()}`);

console.log(`\n计算结果:`);
console.log(`经度: ${llaResult[0].toFixed(6)}°`);
console.log(`纬度: ${llaResult[1].toFixed(6)}°`);
console.log(`高度: ${llaResult[2].toFixed(2)} m`);

// 显示中间步骤
const j2000Result = calculator.calculateJ2000Position(orbitalElements, epochTime, targetTime);
console.log(`\n中间步骤:`);
console.log(`J2000坐标: [${j2000Result.position.map((x) => x.toFixed(2)).join(", ")}] m`);
const ecefPos = calculator.j2000ToECEF(j2000Result.position, targetTime);
console.log(`ECEF坐标: [${ecefPos.map((x) => x.toFixed(2)).join(", ")}] m`);
