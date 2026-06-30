import dayjs from "dayjs";
import { geoAltitudeKm, earthRadiusKm } from "@/utils/constants";
import { calculateDegOneDay } from "@/utils/mars3d";
import { buildSatelliteClassEpochMap, pickSatByTime } from "./satelliteCalculate";

// 计算总览图的数据
export function calculateOverviewChartData(satelliteNoradIDs, satelliteTles) {
  const overviewChartData = [];

  for (let si = 0; si < satelliteNoradIDs.length; si++) {
    const currentSatelliteData = [];
    const satelliteNoradID = satelliteNoradIDs[si];
    const currentSatelliteTles = satelliteTles[si];
    const { satelliteEpochs, satelliteClasses } = buildSatelliteClassEpochMap(satelliteNoradID, currentSatelliteTles);
    const allDateTime = satelliteEpochs.sort((a, b) => a - b);

    for (let di = 0; di < allDateTime.length; di++) {
      const currentTimeMs = allDateTime[di];
      const satelliteClass = satelliteClasses.get(currentTimeMs);
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
      currentTimeTrack.degOneDay = degOneDay;
      currentTimeTrack.currentLon = currentTimeTrack.lon;
      currentTimeTrack.labelShow = false;

      currentSatelliteData.push(currentTimeTrack);
    }

    overviewChartData.push(currentSatelliteData);
  }

  return overviewChartData;
}
