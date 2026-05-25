import * as echarts from "echarts";
import axios from "axios";

let echartsMapInstance = null;
let yAxisMax = window.echartsConfigGeo.yAxisMax;
/**
 * 根据直角坐标系范围计算地图显示的地理坐标范围
 * @param {number} x1 - 直角坐标系x轴的起始值
 * @param {number} x2 - 直角坐标系x轴的结束值
 * @param {number} y1 - 直角坐标系y轴的起始值
 * @param {number} y2 - 直角坐标系y轴的结束值
 * @param {boolean} isBounding - 是否返回边界坐标 true: 返回边界坐标，false: 返回y轴的地理坐标范围
 * @returns {Array|Object} - 如果isBounding为true，返回边界坐标数组；如果isBounding为false，返回y轴的地理坐标范围对象
 * */
export function getBoundingCoords(x1, x2, y1, y2, isBounding = true) {
  let scale = (x2 - x1) / 360;
  let ymid = ((y1 + y2) / 2 / yAxisMax) * 90;
  let yStart = ymid - scale * 90;
  let yEnd = ymid + scale * 90;

  if (isBounding) {
    return [
      [x1, yEnd],
      [x2, yStart],
    ];
  } else {
    return {
      yStart,
      yEnd,
    };
  }
}

export const echartsMapOption = {
  animation: false,
  grid: {
    show: true,
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    zlevel: 99,
    containLabel: true,
  },
  series: [
    {
      type: "map",
      map: "world",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      itemStyle: {
        areaColor: "#ffffff",
        borderColor: "#9ec1c9",
        borderWidth: 0.5,
      },
      label: {
        show: false,
      },
    },
  ],
};

export async function initEchartsMap(dom, geoEchartsStore) {
  let xStart = geoEchartsStore.xStart;
  let xEnd = geoEchartsStore.xEnd;
  let yStart = geoEchartsStore.yStart;
  let yEnd = geoEchartsStore.yEnd;

  await axios.get(window.echartsConfigGeo.mapUrl).then((res) => {
    echarts.registerMap("world", res.data);
    echartsMapInstance = echarts.init(dom);
    echartsMapOption.series[0].boundingCoords = [
      [xStart, yEnd],
      [xEnd, yStart],
    ];
    echartsMapInstance.setOption(echartsMapOption);
  });
}

export function echartsMapZoomMove(x1, x2, y1, y2) {
  echartsMapOption.series[0].boundingCoords = getBoundingCoords(x1, x2, y1, y2);
  echartsMapInstance.setOption(echartsMapOption);
}

export { echartsMapInstance };
