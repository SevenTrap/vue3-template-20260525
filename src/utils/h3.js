import * as h3 from "h3-js";

/**
 * 根据经纬度范围获取指定分辨率下的所有 H3 hex ID
 * @param {number} minLat
 * @param {number} minLng
 * @param {number} maxLat
 * @param {number} maxLng
 * @param {number} resolution  0-15
 */
export function getH3IndexesFromBBox(minLat, minLng, maxLat, maxLng, resolution) {
  const polygon = [
    [minLng, minLat],
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
  ];

  // 获取覆盖该区域的所有 hex
  const hexIds = h3.polygonToCells(polygon, resolution);

  return hexIds;
}
