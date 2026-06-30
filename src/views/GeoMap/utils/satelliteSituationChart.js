import dayjs from "dayjs";
import { geoAltitudeKm, earthRadiusKm } from "@/utils/constants";
import { calculateDegOneDay } from "@/utils/mars3d";
import { buildSatelliteClassEpochMap, pickSatByTime } from "./satelliteCalculate";

// 计算态势图的数据
export function calculateSituationChartData(satelliteNoradIDs, satelliteTles, startTime, endTime) {
  const startDateMs = dayjs(startTime).hour(0).minute(0).second(0).millisecond(0).valueOf();
  const endDateMs = dayjs(endTime).hour(23).minute(59).second(59).millisecond(999).valueOf();
  const commonDateTime = [];
  const allChartData = [];

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

    allChartData.push(currentSatelliteData);
  }

  return allChartData;
}
