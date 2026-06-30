import dayjs from "dayjs";
import { geoAltitudeKm, earthRadiusKm } from "@/utils/constants";
import { calculateDegOneDay } from "@/utils/mars3d";
import { buildSatelliteClassEpochMap, pickSatByTime } from "./satelliteCalculate";

const summaryChartOption = {
  legend: {
    // data: satelliteNoradIDs,
    top: 8,
    itemStyle: {
      color: "#000000",
      fontSize: 14,
      fontWeight: 400,
    },
    textStyle: {
      color: "#000000",
    },
  },
  toolbox: {
    show: true,
    right: 12,
    top: 6,
    feature: {
      dataZoom: {},
      restore: {},
      saveAsImage: {
        type: "png",
        backgroundColor: "#ffffff",
        name: `${new Date().getTime()}-变轨历程图`,
      },
    },
  },
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "line",
      label: {
        backgroundColor: "#505765",
      },
    },
    formatter: function (params) {
      let result = "";
      for (let i = 0; i < params.length; i++) {
        result += `时间：${params[i].value[2].timeShow}<br/> 经度：${params[i].value[0].toFixed(2)}°<br/> 高度：${params[i].value[1].toFixed(2)} km`;
      }

      return result;
    },
  },
  grid: [{ left: 40, right: 40, top: 40, bottom: 50 }],
  dataZoom: [
    // x 轴：鼠标滚轮/拖拽缩放
    {
      type: "inside",
      xAxisIndex: 0,
      filterMode: "none",
      zoomOnMouseWheel: true,
      moveOnMouseWheel: false,
      moveOnMouseMove: true,
    },
    {
      type: "slider",
      xAxisIndex: 0,
      height: 20,
      bottom: 5,
      filterMode: "none",
    },
    // y 轴：鼠标滚轮/拖拽缩放（垂直）
    {
      type: "inside",
      yAxisIndex: 0,
      filterMode: "none",
      zoomOnMouseWheel: true,
      moveOnMouseWheel: false,
      moveOnMouseMove: true,
    },
    {
      type: "slider",
      yAxisIndex: 0,
      width: 20,
      right: 5,
      filterMode: "none",
    },
  ],
  xAxis: {
    type: "value",
    // name: "经度",
    // min: minLon,
    // max: maxLon,
    // minInterval: 0.01,
    // maxInterval: 10,
    nameLocation: "middle",
    nameGap: 30,
    nameTextStyle: {
      color: "#000000",
      fontSize: 14,
      fontWeight: 400,
    },
    axisLabel: {
      show: true,
      color: "#000000",
      fontSize: 14,
      fontWeight: 600,
      formatter: (value) => {
        if (Math.abs(value) === 180) return "";
        if (Math.abs(value) === 0) return "0°";
        let sign = value > 0 ? "E" : "W";
        return Math.abs(value) + "° " + sign;
      },
    },
    axisLine: {
      lineStyle: {
        color: "#000000",
      },
    },
  },
  yAxis: {
    type: "value",
    name: "高度/km",
    nameTextStyle: {
      fontSize: 14,
      color: "#000000",
      fontWeight: 600,
    },
    // min: minHeight,
    // max: maxHeight,
    // minInterval: 0.1,
    // maxInterval: 10,
    axisLabel: {
      show: true,
      color: "#000000",
      fontSize: 14,
      fontWeight: 600,
    },
    axisLine: {
      lineStyle: {
        color: "#000000",
      },
    },
  },
  // series: allSatelliteSeriesData,
};

// 计算总结图的数据
export function calculateSummaryChartData(satelliteNoradIDs, satelliteTles, startTime, endTime) {
  const startDateMs = dayjs(startTime).hour(0).minute(0).second(0).millisecond(0).valueOf();
  const endDateMs = dayjs(endTime).hour(23).minute(59).second(59).millisecond(999).valueOf();
  const commonDateTime = [];
  const summaryChartData = [];

  for (let i = startDateMs; i <= endDateMs; i += 1000 * 60 * 60 * 24) {
    const currentDate12 = dayjs(i).hour(12).minute(0).second(0).millisecond(0).valueOf();
    commonDateTime.push(currentDate12);
  }

  for (let si = 0; si < satelliteNoradIDs.length; si++) {
    const currentSatelliteData = [];
    const satelliteNoradID = satelliteNoradIDs[si];
    const currentSatelliteTles = satelliteTles[si];
    const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(satelliteNoradID, currentSatelliteTles);
    const allDateTime = [...commonDateTime, ...satelliteEpochs].sort((a, b) => a - b);

    // console.log("allDateTime", allDateTime, satelliteEpochs, commonDateTime);

    for (let di = 0; di < allDateTime.length; di++) {
      const currentTimeMs = allDateTime[di];
      const currentEpoch = pickSatByTime(satelliteEpochs, currentTimeMs);
      const satelliteClass = satelliteClasses.get(currentEpoch);
      const currentTimeTrack = satelliteClass.getState(new Date(currentTimeMs));
      const aHeightDiff = Number(satelliteClass.a - geoAltitudeKm - earthRadiusKm);
      const degOneDay = calculateDegOneDay(aHeightDiff);

      currentTimeTrack.satelliteClass = satelliteClass;
      currentTimeTrack.timeShow = dayjs(currentTimeMs).format("MM-DD HH:mm");
      currentTimeTrack.inclination = satelliteClass.inclination;
      currentTimeTrack.a = satelliteClass.a;
      currentTimeTrack.aHeightDiff = aHeightDiff;
      currentTimeTrack.currentHeightDiff = currentTimeTrack.altKm - geoAltitudeKm;
      // TODO 暂定用历元时刻作为变轨点
      currentTimeTrack.isEpochTimePoint = String(currentTimeMs).length === 13 ? false : true;
      currentTimeTrack.isChangePoint = String(currentTimeMs).length === 13 ? false : true;
      currentTimeTrack.degOneDay = degOneDay;
      currentTimeTrack.currentLon = currentTimeTrack.lon;
      currentTimeTrack.labelShow = false;

      currentSatelliteData.push(currentTimeTrack);
    }

    summaryChartData.push(currentSatelliteData);
  }

  // console.log("calculateSummaryChartData", summaryChartData);

  return summaryChartData;
}
