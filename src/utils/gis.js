// 引入 satellite.js（确保已通过 npm 或 script 引入）
// const satellite = require('satellite.js');

/**
 * 计算 WGS84 坐标系下两点之间的 3D 距离（考虑高度）
 * @param {number} lat1 - 第一点纬度（度）
 * @param {number} lon1 - 第一点经度（度）
 * @param {number} alt1 - 第一点高度（米，相对于 WGS84 椭球面）
 * @param {number} lat2 - 第二点纬度（度）
 * @param {number} lon2 - 第二点经度（度）
 * @param {number} alt2 - 第二点高度（米）
 * @param {Date} [date=new Date()] - 计算时刻（影响 ECI 转换）
 * @returns {number} 两点之间的 3D 距离（米）
 */
function calculateDistance(lat1, lon1, alt1, lat2, lon2, alt2, date = new Date()) {
  // 创建 Geodetic 对象
  const pos1 = new satellite.Geodetic(satellite.degreesToRadians(lat1), satellite.degreesToRadians(lon1), alt1);
  const pos2 = new satellite.Geodetic(satellite.degreesToRadians(lat2), satellite.degreesToRadians(lon2), alt2);

  // 转换为 ECI 坐标
  const eci1 = satellite.geodeticToEci(pos1, date);
  const eci2 = satellite.geodeticToEci(pos2, date);

  // 计算 3D 欧氏距离
  const dx = eci1.x - eci2.x;
  const dy = eci1.y - eci2.y;
  const dz = eci1.z - eci2.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  return distance;
}

/**
 * 计算 WGS84 坐标系下两点之间的地表大圆距离（忽略高度，仅用经纬度）
 * @param {number} lat1 - 第一点纬度（度）
 * @param {number} lon1 - 第一点经度（度）
 * @param {number} lat2 - 第二点纬度（度）
 * @param {number} lon2 - 第二点经度（度）
 * @returns {number} 地表大圆距离（米）
 */
function calculateSurfaceDistance(lat1, lon1, lat2, lon2) {
  // 使用 Haversine 公式（WGS84 近似，适合地表距离）
  const R = 6378137; // WGS84 赤道半径（米）
  const φ1 = satellite.degreesToRadians(lat1);
  const φ2 = satellite.degreesToRadians(lat2);
  const Δφ = satellite.degreesToRadians(lat2 - lat1);
  const Δλ = satellite.degreesToRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 导出函数
module.exports = {
  calculateDistance,
  calculateSurfaceDistance,
};
