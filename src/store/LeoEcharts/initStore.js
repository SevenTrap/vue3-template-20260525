export function initLeoStore(leoEchartsStore) {
  let yAxisMin = window.echartsConfigLeo.yAxisMin; // 经度最小值
  let yAxisMax = window.echartsConfigLeo.yAxisMax; // 经度最大值
  let yAxisValues = window.echartsConfigLeo.yAxisValues; // 经度刻度值
  let viewConfig = window.echartsConfigLeo.viewConfig; // 默认视窗经度范围
  let gridLabelColor = window.echartsConfigLeo.gridLabelColor; // 网格标签颜色
  let gridLineColor = window.echartsConfigLeo.gridLineColor; // 网格线颜色
  let zoomThrottle = window.echartsConfigLeo.zoomThrottle; // 缩放节流时间
  let mapUrl = window.echartsConfigLeo.mapUrl; // 地图数据URL

  let xStart = viewConfig[0]; // 经度范围起始值
  let xEnd = viewConfig[1]; // 经度范围结束值
  let yStart = viewConfig[2]; // 经度范围结束值
  let yEnd = viewConfig[3]; // 经度范围结束值

  leoEchartsStore.setYAxisMin(yAxisMin);
  leoEchartsStore.setYAxisMax(yAxisMax);
  leoEchartsStore.setYAxisValues(yAxisValues);
  leoEchartsStore.setViewConfig(viewConfig);
  leoEchartsStore.setGridLabelColor(gridLabelColor);
  leoEchartsStore.setGridLineColor(gridLineColor);
  leoEchartsStore.setZoomThrottle(zoomThrottle);
  leoEchartsStore.setMapUrl(mapUrl);

  // 初始化地图视野地理坐标范围
  leoEchartsStore.setXStart(xStart);
  leoEchartsStore.setXEnd(xEnd);
  leoEchartsStore.setYStart(yStart);
  leoEchartsStore.setYEnd(yEnd);
}
