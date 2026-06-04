import * as mars3d from "mars3d";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 1 * 60 * 1000;

/**
 * 创建卫星轨迹采样数据（前后各1天，每1小时1个点）
 * @param {object} satelliteModel - 卫星模型对象
 * @returns {{positions:Array, sampledPosition:object|null}} 轨迹线点位与时序位置属性
 */
const createOrbitTrajectoryData = (satelliteModel) => {
  const Cesium = mars3d.Cesium;
  if (!satelliteModel?.getLLAs) return { positions: [], sampledPosition: null };

  const now = new Date();
  const startTime = new Date(now.getTime() - ONE_DAY_MS);
  const endTime = new Date(now.getTime() + ONE_DAY_MS);
  const llas = satelliteModel.getLLAs(startTime, endTime, ONE_HOUR_MS) || [];
  if (!llas.length) return { positions: [], sampledPosition: null };

  const positions = [];
  const sampledPosition = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.FIXED);
  sampledPosition.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
  sampledPosition.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

  llas.forEach((lla, index) => {
    if (!lla) return;
    const position = Cesium.Cartesian3.fromDegrees(lla.lon, lla.lat, (lla.altKm || 0) * 1000);
    positions.push(position);
    const sampleTime = new Date(startTime.getTime() + index * ONE_HOUR_MS);
    sampledPosition.addSample(Cesium.JulianDate.fromDate(sampleTime), position);
  });

  return { positions, sampledPosition };
};

// 添加卫星上球展示
export function addSatellite(satelliteLayer, satelliteModel) {
  if (!satelliteLayer || !satelliteModel) return;

  const graphicSatellite = satelliteLayer.getGraphicById(satelliteModel.noradID);
  if (graphicSatellite) return;

  console.log(satelliteModel.noradID, "addSatellite");

  const satelliteGraphic = new mars3d.graphic.Satellite({
    id: satelliteModel.noradID,
    name: satelliteModel.name,
    tle1: satelliteModel.tle1,
    tle2: satelliteModel.tle2,
    referenceFrame: mars3d.Cesium.ReferenceFrame.FIXED, // INERTIAL：惯性坐标系  FIXED：地球坐标系
    model: {
      show: false,
      url: "/assets/gltf/weixin.gltf",
      scale: 1,
      minimumPixelSize: 90,
      silhouette: false,
      mergeOrientation: false,
      heading: 90,
      pitch: 0,
      roll: 0,
    },
    point: {
      show: true,
      color: "#ff0000",
      pixelSize: 10,
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

    // cone: {
    //   sensorType: mars3d.graphic.SatelliteSensor.Type.Conic,
    //   angle1: 30,
    //   angle: 15,
    //   color: "rgba(0,255,0,0.3)",
    //   show: satelliteModel.options.sensorShow,
    // },

    path: {
      show: true,
      color: "#00ff00",
      width: 1,
      opacity: 0.5,
    },
  });

  // const satelliteLine = new mars3d.graphic.PolylineEntity({
  //   id: satelliteModel.noradID + "-path",
  //   positions: new mars3d.Cesium.CallbackProperty((time) => {
  //     const satPosition = satelliteGraphic.position;
  //     if (!satPosition) {
  //       return [];
  //     }
  //     const cartographic = mars3d.Cesium.Cartographic.fromCartesian(satPosition);

  //     const groundPosition = mars3d.Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);

  //     return [satPosition, groundPosition];
  //   }, false),
  //   style: {
  //     color: "#00ff00",
  //     opacity: 0.5,
  //     width: 1,
  //     outline: false,
  //   },
  // });

  // const { positions: orbitTrajectoryPositions, sampledPosition } = createOrbitTrajectoryData(satelliteModel);
  // const orbitTrajectoryLine = new mars3d.graphic.PolylinePrimitive({
  //   id: `${satelliteModel.noradID}-orbit-trajectory`,
  //   positions: orbitTrajectoryPositions,
  //   style: {
  //     color: "#00ff00",
  //     opacity: 0.65,
  //     width: 2,
  //     arcType: mars3d.Cesium.ArcType.NONE,
  //     clampToGround: false,
  //   },
  // });

  // if (sampledPosition) {
  //   satelliteGraphic.position = sampledPosition;
  //   satelliteGraphic.orientation = new mars3d.Cesium.VelocityOrientationProperty(sampledPosition);
  // }

  // satelliteLayer.addGraphic(orbitTrajectoryLine);
  // satelliteLayer.addGraphic(satelliteLine);
  satelliteLayer.addGraphic(satelliteGraphic);

  satelliteGraphic._isSate = true;
  // satelliteLine._isSateLine = true;
  // orbitTrajectoryLine._isSateTrajectory = true;
  return satelliteGraphic;
}

/**
 * 切换卫星轨道线显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteOrbit - 是否显示轨道线
 * @returns {void}
 */
export function toggleSatelliteOribit(satelliteLayer, showSatelliteOrbit) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;

    graphic.path.show = showSatelliteOrbit;
    graphic.path.opacity = showSatelliteOrbit ? 0.5 : 0;
  });
}

/**
 * 切换卫星轨迹线显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteTrajectory - 是否显示轨迹线
 * @returns {void}
 */
export function toggleSatelliteTrajectory(satelliteLayer, showSatelliteTrajectory) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSateTrajectory) return;

    graphic.show = showSatelliteTrajectory;
    graphic.opacity = showSatelliteTrajectory ? 0.5 : 0;
  });
}

/**
 * 切换卫星名称显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteName - 是否显示卫星名称
 * @returns {void}
 */
export function toggleSatelliteName(satelliteLayer, showSatelliteName) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;

    graphic.label.show = showSatelliteName;
    graphic.label.opacity = showSatelliteName ? 1 : 0;
  });
}

/**
 * 切换卫星模型显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteModel - 是否显示卫星模型
 * @returns {void}
 */
export function toggleSatelliteModel(satelliteLayer, showSatelliteModel) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;
    console.log(graphic, "111");

    graphic.model.show = showSatelliteModel;
    graphic.model.opacity = showSatelliteModel ? 1 : 0;
  });
}

/**
 * 切换卫星坐标系显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteCoordinate - 是否显示卫星坐标系
 * @returns {void}
 */
export function toggleSatelliteCoordinate(satelliteLayer, showSatelliteCoordinate) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;

    graphic.referenceFrame = showSatelliteCoordinate ? mars3d.Cesium.ReferenceFrame.INERTIAL : mars3d.Cesium.ReferenceFrame.FIXED;

    console.log(graphic, "222");
  });
}

export function toggleSatellitePoint(satelliteLayer, showSatellitePoint) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSateLine) return;

    graphic.show = showSatellitePoint;
    graphic.opacity = showSatellitePoint ? 1 : 0;
  });
}

/**
 * 切换卫星模型朝向：启用时模型始终指向地心（nadir），禁用时还原沿速度方向
 * @param {object} satelliteLayer - 卫星图层
 * @param {string|number} noradID - 卫星 NORAD ID
 * @param {boolean} enable - true：朝向地球；false：还原速度朝向
 * @returns {void}
 */
export const setSatelliteFaceEarth = (satelliteLayer, noradID, enable) => {
  if (!satelliteLayer || !noradID) return;

  const graphic = satelliteLayer.getGraphicById(noradID);
  const entity = graphic?.entity;
  if (!entity || !entity.position) return;

  const Cesium = mars3d.Cesium;
  const positionProperty = entity.position;

  if (enable) {
    entity.orientation = new Cesium.CallbackProperty((time, result) => {
      const position = positionProperty.getValue(time);
      if (!position) return undefined;
      const hpr = new Cesium.HeadingPitchRoll(0, Cesium.Math.toRadians(-90), 0);
      return Cesium.Transforms.headingPitchRollQuaternion(position, hpr, Cesium.Ellipsoid.WGS84, undefined, result);
    }, false);
  } else {
    entity.orientation = new Cesium.VelocityOrientationProperty(positionProperty);
  }
};
