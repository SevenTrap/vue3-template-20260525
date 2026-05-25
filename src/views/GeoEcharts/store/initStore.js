import { getBoundingCoords } from "@/echartsGeoOptions/index";
export function initGeoStore(geoEchartsStore) {
  let yAxisMin = window.echartsConfigGeo.yAxisMin; // 经度最小值
  let yAxisMax = window.echartsConfigGeo.yAxisMax; // 经度最大值
  let yAxisValues = window.echartsConfigGeo.yAxisValues; // 经度刻度值
  let viewConfig = window.echartsConfigGeo.viewConfig; // 默认视窗经度范围
  let gridLabelColor = window.echartsConfigGeo.gridLabelColor; // 网格标签颜色
  let gridLineColor = window.echartsConfigGeo.gridLineColor; // 网格线颜色
  let zoomThrottle = window.echartsConfigGeo.zoomThrottle; // 缩放节流时间
  let mapUrl = window.echartsConfigGeo.mapUrl; // 地图数据URL

  let xStart = viewConfig[0]; // 经度范围起始值
  let xEnd = viewConfig[1]; // 经度范围结束值
  let { yStart, yEnd } = getBoundingCoords(xStart, xEnd, yAxisMin, yAxisMax, false); // 获取y轴的地理坐标范围

  geoEchartsStore.setYAxisMin(yAxisMin);
  geoEchartsStore.setYAxisMax(yAxisMax);
  geoEchartsStore.setYAxisValues(yAxisValues);
  geoEchartsStore.setViewConfig(viewConfig);
  geoEchartsStore.setGridLabelColor(gridLabelColor);
  geoEchartsStore.setGridLineColor(gridLineColor);
  geoEchartsStore.setZoomThrottle(zoomThrottle);
  geoEchartsStore.setMapUrl(mapUrl);

  // 初始化地图视野地理坐标范围
  geoEchartsStore.setXStart(xStart);
  geoEchartsStore.setXEnd(xEnd);
  geoEchartsStore.setYStart(yStart);
  geoEchartsStore.setYEnd(yEnd);
}
