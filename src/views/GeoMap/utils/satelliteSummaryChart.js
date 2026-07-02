import dayjs from "dayjs";
import { geoAltitudeKm, earthRadiusKm } from "@/utils/constants";
import { calculateDegOneDay } from "@/utils/mars3d";
import { buildSatelliteClassEpochMap, pickSatByTime } from "./satelliteCalculate";

export const summaryChartOption = {
  legend: {
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
        result += `${params[i].value[2].name}<br/> 时间：${params[i].value[2].timeShow}<br/> 经度：${params[i].value[0].toFixed(2)}°<br/> 高度差：${params[i].value[1].toFixed(2)} km`;
      }

      return result;
    },
  },
  grid: [{ left: 40, right: 40, top: 40, bottom: 50 }],
  dataZoom: [
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
    name: "经度",
    min: function (value) {
      const halfValue = (value.max - value.min) / 2;
      const result = Number(Number(value.min - halfValue).toFixed(2));
      if (result > 180) return 180;
      if (result < -180) return -180;
      return result;
    },
    max: function (value) {
      const halfValue = (value.max - value.min) / 2;
      const result = Number(Number(value.max + halfValue).toFixed(2));
      if (result > 180) return 180;
      if (result < -180) return -180;
      return result;
    },

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
    min: function (value) {
      const halfValue = (value.max - value.min) / 2;
      return Number(Number(value.min - halfValue).toFixed(2));
    },
    max: function (value) {
      const halfValue = (value.max - value.min) / 2;
      return Number(Number(value.max + halfValue).toFixed(2));
    },
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
};

// 计算总结图的数据
export function calculateSummaryChartData(satelliteNoradIDs, satelliteTles, startTime, endTime, interval = 1 * 60 * 60 * 1000) {
  const startDateMs = dayjs(startTime).hour(0).minute(0).second(0).millisecond(0).valueOf();
  const endDateMs = dayjs(endTime).hour(23).minute(59).second(59).millisecond(999).valueOf();
  const commonDateTime = [];
  const allChartData = [];

  for (let i = startDateMs; i <= endDateMs; i += interval) {
    commonDateTime.push(i);
  }

  for (let si = 0; si < satelliteNoradIDs.length; si++) {
    const currentSatelliteData = [];
    const satelliteNoradID = satelliteNoradIDs[si];
    const currentSatelliteTles = satelliteTles[si];
    const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(satelliteNoradID, currentSatelliteTles);

    // 如果tle的历元时间不在startTime、endTime之间，则不显示该时间的轨迹
    for (let ei = 0; ei < satelliteEpochs.length; ei++) {
      const currentEpoch = satelliteEpochs[ei];
      if (currentEpoch < startDateMs || currentEpoch > endDateMs) continue;
      commonDateTime.push(currentEpoch);
    }

    const allDateTime = commonDateTime.sort((a, b) => a - b);

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

    allChartData.push(currentSatelliteData);
  }

  return allChartData;
}
