let xAxisMin = window.echartsConfigLeo.xAxisMin;
let xAxisMax = window.echartsConfigLeo.xAxisMax;
let yAxisMin = window.echartsConfigLeo.yAxisMin;
let yAxisMax = window.echartsConfigLeo.yAxisMax;
let yAxisValues = window.echartsConfigLeo.yAxisValues;
let viewConfig = window.echartsConfigLeo.viewConfig;
let gridLabelColor = window.echartsConfigLeo.gridLabelColor;
let gridLineColor = window.echartsConfigLeo.gridLineColor;
let zoomThrottle = window.echartsConfigLeo.zoomThrottle;

export const leoEchartsOption = {
  animation: true,
  grid: {
    show: true,
    zlevel: 100,
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    containLabel: true,
  },
  xAxis: [
    {
      position: "bottom",
      min: xAxisMin,
      max: xAxisMax,
      minInterval: 1,
      maxInterval: 10,
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
        zlevel: -100,
        formatter: function (value) {
          if (Math.abs(value) === 180) return "";
          if (Math.abs(value) === 0) return "0°";
          let sign = value > 0 ? "E" : "W";
          return Math.abs(value) + "°" + sign;
        },
      },
    },
    {
      position: "top",
      min: xAxisMin,
      max: xAxisMax,
      minInterval: 1,
      maxInterval: 10,
      axisLabel: {
        inside: true,
        color: gridLabelColor,
        fontSize: 14,
        fontWeight: 600,
        formatter: function (value) {
          if (Math.abs(value) === 180) return "";
          if (Math.abs(value) === 0) return "0°";
          let sign = value > 0 ? "E" : "W";
          return Math.abs(value) + "°" + sign;
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
      min: xAxisMin,
      max: xAxisMax,
      minInterval: 1,
      maxInterval: 5,
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
          opacity: 0.5,
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
      splitNumber: 1,
      interval: 10,
      zlevel: -100,
      axisLine: {
        onZero: false,
      },
      axisTick: {
        show: false,
        inside: true,
      },
      axisLabel: {
        show: false,
        inside: true,
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
      splitNumber: 1,
      interval: 10,
      zlevel: -100,
      axisLine: {
        onZero: false,
      },
      axisTick: {
        show: false,
        inside: true,
      },
      axisLabel: {
        show: false,
        inside: true,
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
      type: "inside",
      yAxisIndex: [0, 1],
      startValue: viewConfig[2],
      endValue: viewConfig[3],
      filterMode: "empty",
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
    const value = item;

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
        formatter: item + "°N",
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
        formatter: item + "°N",
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
        formatter: item + "°S",
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
        formatter: item + "°S",
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
      formatter: "0°",
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
      formatter: "赤道",
    },
  });

  return lineChartData;
}
