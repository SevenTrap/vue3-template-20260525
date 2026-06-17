import * as mars3d from "mars3d";
import * as satellite from "satellite.js";

/** 天文单位（km），用于将 sunPos 的 rsun(AU) 换算为 km */
const AU_KM = 149597870.7;

/**
 * 将 Cesium JulianDate 转为毫秒时间戳
 * @param {object} julianDate - Cesium.JulianDate
 * @returns {number} 毫秒时间戳
 */
export const julianDateToTimeMs = (julianDate) => {
  if (!julianDate) return 0;
  return mars3d.Cesium.JulianDate.toDate(julianDate).getTime();
};

/**
 * 将毫秒时间戳转为 Cesium JulianDate
 * @param {number} timeMs - 毫秒时间戳
 * @returns {object} Cesium.JulianDate
 */
export const timeMsToJulianDate = (timeMs) => {
  if (!timeMs) return 0;
  return mars3d.Cesium.JulianDate.fromDate(new Date(timeMs));
};

/**
 * 获取太阳在 ECI 坐标系下的位置（km）
 * @param {Date} date - UTC 时间
 * @returns {{x:number,y:number,z:number}|null} 太阳 ECI 位置
 */
export const getSunEciKm = (date) => {
  const jd = satellite.jday(date);
  const sunPos = satellite.sunPos(jd);
  const rsun = sunPos && sunPos.rsun;
  if (!rsun) return null;

  const sunEci = {
    x: (rsun.x ?? rsun[0]) * AU_KM,
    y: (rsun.y ?? rsun[1]) * AU_KM,
    z: (rsun.z ?? rsun[2]) * AU_KM,
  };
  const magnitude = Math.sqrt(sunEci.x * sunEci.x + sunEci.y * sunEci.y + sunEci.z * sunEci.z);
  return magnitude ? sunEci : null;
};

/**
 * 添加卫星
 * @param satelliteModel 卫星模型对象
 */
export function addSatellite(satelliteLayer, satelliteModel) {
  if (!satelliteLayer || !satelliteModel) {
    return;
  }

  const graphicSatellite = satelliteLayer.getGraphicById(satelliteModel.noradID);
  if (graphicSatellite) {
    return;
  }

  const satelliteGraphic = new mars3d.graphic.Satellite({
    id: satelliteModel.noradID,
    name: satelliteModel.name,
    tle1: satelliteModel.tle1,
    tle2: satelliteModel.tle2,
    model: {
      url: "assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      silhouette: false,
    },

    label: {
      text: satelliteModel.name,
      font_size: 20,
      font_family: "楷体",
      color: "#ffffff",
      opacity: 1,
      outline: true,
      outlineColor: "#000000",
      outlineWidth: 2,
      background: true,
      backgroundColor: "#000000",
      backgroundOpacity: 0.5,
      backgroundPadding: new mars3d.Cesium.Cartesian2(2, 5),
      pixelOffsetX: 0,
      pixelOffsetY: -20,
      pixelOffsetScaleByDistance: true,
      pixelOffsetScaleByDistance_far: 1000000,
      pixelOffsetScaleByDistance_farValue: 0.5,
      pixelOffsetScaleByDistance_near: 1000,
      pixelOffsetScaleByDistance_nearValue: 1.0,
      scaleByDistance: true,
      scaleByDistance_far: 1000000,
      scaleByDistance_farValue: 0.5,
      scaleByDistance_near: 1000,
      scaleByDistance_nearValue: 1.0,
    },

    cone: {
      sensorType: mars3d.graphic.SatelliteSensor.Type.Conic,
      angle1: 30,
      angle: 15,
      color: "rgba(0,255,0,0.3)",
      show: satelliteModel.options.sensorShow,
    },

    path: {
      show: false,
      color: "#00ff00",
      width: 1,
      opacity: 0.5,
    },
  });

  const line = new mars3d.graphic.PolylineEntity({
    id: satelliteModel.noradID + "-path",
    positions: new mars3d.Cesium.CallbackProperty((time) => {
      const satPosition = satelliteGraphic.position;
      if (!satPosition) {
        return [];
      }
      const cartographic = mars3d.Cesium.Cartographic.fromCartesian(satPosition);

      const groundPosition = mars3d.Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);

      return [satPosition, groundPosition];
    }, false),
    style: {
      color: "#00ff00",
      opacity: 0.5,
      width: 1,
      outline: false,
    },
  });

  satelliteLayer.addGraphic(line);
  satelliteLayer.addGraphic(satelliteGraphic);

  satelliteGraphic._isSate = true;
  satelliteGraphic._sateLinks = {};
  return satelliteGraphic;
}
