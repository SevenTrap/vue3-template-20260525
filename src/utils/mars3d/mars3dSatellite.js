import * as mars3d from "mars3d";

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
      // show: satelliteModel.options.orbitPath,
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
