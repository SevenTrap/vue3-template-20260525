import * as echarts from "echarts";
import axios from "axios";

let echartsMapInstance = null;
let mapUrl = window.echartsConfigLeo.mapUrl;
/**
 * 根据直角坐标系范围计算地图显示的地理坐标范围
 * @param {number} x1 - 直角坐标系x轴的起始值
 * @param {number} x2 - 直角坐标系x轴的结束值
 * @param {number} y1 - 直角坐标系y轴的起始值
 * @param {number} y2 - 直角坐标系y轴的结束值
 * @returns {Array}
 * */
export function getBoundingCoords(x1, x2, y1, y2) {
  let xStart = (x1 / 100) * 360 - 180;
  let xEnd = (x2 / 100) * 360 - 180;
  let yStart = (y1 / 100) * 180 - 90;
  let yEnd = (y2 / 100) * 180 - 90;

  return [
    [xStart, yEnd],
    [xEnd, yStart],
  ];
}

export const echartsMapOption = {
  animation: false,
  grid: {
    show: true,
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    zlevel: 100,
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
      boundingCoords: [
        [-180, 90],
        [180, -90],
      ],
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

  await axios.get(mapUrl).then((res) => {
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
