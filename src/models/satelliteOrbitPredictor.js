/**
 * 卫星轨道预测器 (二体模型)
 */
class SatelliteOrbitPredictor {
  constructor(elements, epoch) {
    this.elements = elements;
    this.epoch = epoch; // 历元时刻 (Date对象)

    this.a = elements.a; // 半长轴 (km)
    this.e = elements.e; // 偏心率
    this.i = elements.i; // 轨道倾角 (radians)
    this.raan = elements.raan; // 升交点赤经 (radians)
    this.argp = elements.argp; // 近地点幅角 (radians)
    this.m0 = elements.m0; // 平近点角 (radians)

    this.GM = 398600.8; // 地球引力常数 (km^3/s^2)
    this.WGS84_A = 6378.137; // WGS84 长轴 (km)
    this.WGS84_B = 6356.7523142; // WGS84 短轴 (km)
  }

  /**
   * 主调用函数：获取任意时刻的地理坐标
   * @param {Object} elements 轨道六根数 (角度请预先转为弧度)
   * @param {Date} epoch 历元时刻
   * @param {Date} targetTime 目标计算时刻
   */
  getPosition(targetTime) {
    // 1. 计算 ECI 坐标
    const eci = this._calculateECI(this.elements, this.epoch, targetTime);

    // 2. 转换为 ECEF 坐标 (考虑地球自转)
    const ecef = this._eciToECEF(eci, targetTime);

    // 3. 转换为 WGS84 (经纬度)
    const lla = this._ecefToWGS84(ecef);

    return {
      eci,
      ecef,
      lla, // { lat, lon, alt }
    };
  }

  _calculateECI(elements, epoch, targetTime) {
    const { a, e, i, raan, argp, m0 } = elements;
    const dt = (targetTime.getTime() - epoch.getTime()) / 1000;

    // 平均角速度
    const n = Math.sqrt(this.GM / Math.pow(a, 3));

    // 目标时刻平近点角
    let M = (m0 + n * dt) % (2 * Math.PI);

    // 迭代解开普勒方程求偏近点角 E
    let E = M;
    for (let j = 0; j < 10; j++) {
      let deltaE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
      E += deltaE;
      if (Math.abs(deltaE) < 1e-10) break;
    }

    // 轨道平面坐标 (PQW)
    const x_p = a * (Math.cos(E) - e);
    const y_p = a * Math.sqrt(1 - e * e) * Math.sin(E);

    // 坐标系转换矩阵计算 (PQW -> ECI)
    const cos_R = Math.cos(raan);
    const sin_R = Math.sin(raan);
    const cos_i = Math.cos(i);
    const sin_i = Math.sin(i);
    const cos_a = Math.cos(argp);
    const sin_a = Math.sin(argp);

    const x = (cos_R * cos_a - sin_R * cos_i * sin_a) * x_p + (-cos_R * sin_a - sin_R * cos_i * cos_a) * y_p;
    const y = (sin_R * cos_a + cos_R * cos_i * sin_a) * x_p + (-sin_R * sin_a + cos_R * cos_i * cos_a) * y_p;
    const z = sin_i * sin_a * x_p + sin_i * cos_a * y_p;

    return { x, y, z };
  }

  _eciToECEF(eci, date) {
    // 计算格林尼治平恒星时 (GMST)
    const JD = date.getTime() / 86400000 + 2440587.5;
    const T = (JD - 2451545.0) / 36525.0;
    let gmstSec = 24110.54841 + 8640184.812866 * T + 0.093104 * T * T - 6.2e-6 * T * T * T;
    let theta = ((gmstSec / 240) % 360) * (Math.PI / 180);

    return {
      x: eci.x * Math.cos(theta) + eci.y * Math.sin(theta),
      y: -eci.x * Math.sin(theta) + eci.y * Math.cos(theta),
      z: eci.z,
    };
  }

  _ecefToWGS84(ecef) {
    const { x, y, z } = ecef;
    const e2 = (Math.pow(this.WGS84_A, 2) - Math.pow(this.WGS84_B, 2)) / Math.pow(this.WGS84_A, 2);
    const ep2 = (Math.pow(this.WGS84_A, 2) - Math.pow(this.WGS84_B, 2)) / Math.pow(this.WGS84_B, 2);

    const p = Math.sqrt(x * x + y * y);
    const theta = Math.atan2(z * this.WGS84_A, p * this.WGS84_B);

    const lon = Math.atan2(y, x);
    const lat = Math.atan2(z + ep2 * this.WGS84_B * Math.pow(Math.sin(theta), 3), p - e2 * this.WGS84_A * Math.pow(Math.cos(theta), 3));

    const N = this.WGS84_A / Math.sqrt(1 - e2 * Math.pow(Math.sin(lat), 2));
    const alt = p / Math.cos(lat) - N;

    return {
      lat: (lat * 180) / Math.PI,
      lon: (lon * 180) / Math.PI,
      alt: alt,
    };
  }
}

export default SatelliteOrbitPredictor;
