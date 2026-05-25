let yAxisMax = window.echartsConfigGeo.yAxisMax;
let yAxisValues = window.echartsConfigGeo.yAxisValues;

/**
 * 将卫星轨道高度转换为坐标系高度
 * @param {Number} orbitHeight 传入的卫星轨道高度
 * @param {Boolean} isReal 如果为true，则为实际轨道高度  如果为false，则表示为减去同步轨道高度后的值
 * @returns {Number} yAxis
 */
export function formatOrbitHeightToYAxis(orbitHeight, isReal = false) {
  let yAxisValue = null;
  const height = isReal ? orbitHeight - 35786 : orbitHeight;
  const perVal = yAxisMax / yAxisValues.length;
  const absHeight = Math.abs(height);
  const signDHeight = Math.sign(height);

  for (let i = 0; i < yAxisValues.length; i++) {
    const y0 = i > 0 ? yAxisValues[i - 1] : 0;
    const y1 = yAxisValues[i];
    const yAxisPer = i * perVal;

    if (absHeight < y1) {
      return yAxisPer + ((absHeight - y0) / (y1 - y0)) * perVal;
    } else if (absHeight === y1) {
      return yAxisPer + perVal;
    }
  }

  return yAxisValue * signDHeight;
}

/**
 * myChart滚动缩放时，zoomHeight区间在【0~100】，需要将其映射到Y坐标轴范围【-360~360】
 * @param {Number} zoomHeight
 * @returns {Number} yAxis
 * */
export function formatZoomHeightToYAxis(zoomHeight) {
  return (zoomHeight / 100) * 2 * yAxisMax - yAxisMax;
}

/**
 * myChart滚动缩放时，zoomWidth区间在【0~100】，需要将其映射到Y坐标轴范围【-180~180】
 * @param {Number} zoomWidth
 * @returns {Number} xAxis
 * */
export function formatZoomWidthToxAxis(zoomWidth) {
  return zoomWidth * 3.6 - 180;
}

export function formatYAxisToOrbitHeight(yAxis, isReal = false) {}
