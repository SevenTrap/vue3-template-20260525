import { formatOrbitHeightToYAxis } from "@/echartsGeoOptions/index";

let yAxisMin = window.echartsConfigGeo.yAxisMin;
let yAxisMax = window.echartsConfigGeo.yAxisMax;
let yAxisValues = window.echartsConfigGeo.yAxisValues;
let viewConfig = window.echartsConfigGeo.viewConfig;
let gridLabelColor = window.echartsConfigGeo.gridLabelColor;
let gridLineColor = window.echartsConfigGeo.gridLineColor;
let zoomThrottle = window.echartsConfigGeo.zoomThrottle;

export const geoEchartsOption = {
  animation: true,
  grid: {
    show: true,
    zlevel: 100,
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    containLabel: true, // grid 区域是否包含坐标轴的刻度标签 true为包含 false为不包含
  },
  xAxis: [
    {
      position: "bottom",
      min: -180,
      max: 180,
      minInterval: 1,
      maxInterval: 10,
      zlevel: -100,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        inside: true,
        fontSize: 14,
        fontWeight: 600,
        color: gridLabelColor,
        formatter(value) {
          if (Math.abs(value) === 180) return "";
          else if (value === 0) return "0°";
          else {
            let sign = value > 0 ? "E" : "W";
            return Math.abs(value) + "°" + sign;
          }
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: gridLineColor,
          width: 1,
        },
      },
    },
    {
      position: "top",
      min: -180,
      max: 180,
      minInterval: 1,
      maxInterval: 10,
      zlevel: -100,
      axisLabel: {
        inside: true,
        color: gridLabelColor,
        fontSize: 14,
        fontWeight: 600,
        formatter(value) {
          if (Math.abs(value) === 180) return "";
          else if (value === 0) return "0°";
          else {
            let sign = value > 0 ? "E" : "W";
            return Math.abs(value) + "°" + sign;
          }
        },
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: gridLineColor,
          width: 1,
        },
      },
    },
    {
      position: "top",
      min: -180,
      max: 180,
      minInterval: 1,
      maxInterval: 5,
      zlevel: -100,
      axisLabel: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: gridLineColor,
          width: 1,
          opacity: 0.4,
        },
      },
    },
  ],
  yAxis: [
    {
      scale: true,
      position: "left",
      min: yAxisMin,
      max: yAxisMax,
      splitNumber: 2 * yAxisValues.length + 1,
      interval: yAxisMax / yAxisValues.length,
      zlevel: -100,
      axisLine: {
        onZero: false,
      },
      axisTick: {
        inside: false,
      },
      axisLabel: {
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
    {
      scale: true,
      position: "right",
      min: yAxisMin,
      max: yAxisMax,
      splitNumber: 2 * yAxisValues.length + 1,
      interval: yAxisMax / yAxisValues.length,
      zlevel: -100,
      axisLine: {
        onZero: false,
      },
      axisTick: {
        inside: true,
      },
      axisLabel: {
        inside: true,
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
  ],
  dataZoom: [
    {
      id: "xAxis",
      type: "inside",
      xAxisIndex: [0, 1, 2],
      startValue: viewConfig[0],
      endValue: viewConfig[1],
      filterMode: "empty",
      throttle: zoomThrottle,
    },
    {
      id: "yAxis",
      type: "slider",
      showDetail: false,
      yAxisIndex: [0, 1],
      startValue: yAxisMin,
      endValue: yAxisMax,
      left: 2,
      width: 20,
      filterMode: "empty",
      zoomLock: false,
      brushSelect: false,
      handleStyle: {
        borderWidth: 5,
      },
      throttle: zoomThrottle,
    },
  ],
  series: [
    {
      name: "symbolLine",
      type: "scatter",
      animation: false,
      zlevel: -100,
      markLine: {
        symbol: "none",
        emphasis: { disabled: true },
        data: drawSymbolLineData(),
      },
    },
  ],
};

function drawSymbolLineData() {
  const lineChartData = [];

  yAxisValues.forEach((item, i) => {
    const value = formatOrbitHeightToYAxis(item);

    let width = ((yAxisMax - value) / yAxisMax) * 0.6 + 0.4;
    lineChartData.push({
      yAxis: value,
      lineStyle: {
        type: "solid",
        color: gridLineColor,
        width,
      },
      emphasis: {
        disabled: true,
      },
      label: {
        show: i !== yAxisValues.length - 1,
        position: "insideStartTop",
        color: gridLabelColor,
        fontSize: 14,
        fontWeight: 600,
        formatter: item + "km",
      },
    });

    lineChartData.push({
      yAxis: value,
      lineStyle: {
        type: "solid",
        color: gridLineColor,
        width,
      },
      emphasis: {
        disabled: true,
      },
      label: {
        show: i !== yAxisValues.length - 1,
        position: "insideEndTop",
        color: gridLabelColor,
        fontSize: 14,
        fontWeight: 600,
        formatter: Math.round(item * -0.0128 * 100) / 100 + "°/天",
      },
    });

    lineChartData.push({
      yAxis: -value,
      lineStyle: {
        type: "solid",
        color: gridLineColor,
        width,
      },
      emphasis: {
        disabled: true,
      },
      label: {
        show: i !== yAxisValues.length - 1,
        position: "insideStartTop",
        color: gridLabelColor,
        fontSize: 14,
        fontWeight: 600,
        formatter: -item + "km",
      },
    });

    lineChartData.push({
      yAxis: -value,
      lineStyle: {
        type: "solid",
        color: gridLineColor,
        width,
      },
      emphasis: {
        disabled: true,
      },
      label: {
        show: i !== yAxisValues.length - 1,
        position: "insideEndTop",
        color: gridLabelColor,
        fontSize: 14,
        fontWeight: 600,
        formatter: Math.round(-item * -0.0128 * 100) / 100 + "°/天",
      },
    });
  });

  lineChartData.push({
    yAxis: 0,
    lineStyle: {
      type: "solid",
      color: gridLineColor,
      width: 1.5,
    },
    emphasis: {
      disabled: true,
    },
    label: {
      show: true,
      position: "insideStartTop",
      color: gridLabelColor,
      fontSize: 14,
      fontWeight: 600,
      formatter: "0km",
    },
  });

  lineChartData.push({
    yAxis: 0,
    lineStyle: {
      type: "solid",
      color: gridLineColor,
      width: 1.5,
    },
    emphasis: {
      disabled: true,
    },
    label: {
      show: true,
      position: "insideEndTop",
      color: gridLabelColor,
      fontSize: 14,
      fontWeight: 600,
      formatter: "地球同步轨道带",
    },
  });

  return lineChartData;
}
