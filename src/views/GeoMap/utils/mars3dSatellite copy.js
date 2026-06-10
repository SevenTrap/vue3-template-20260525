import * as mars3d from "mars3d";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 1 * 60 * 1000;

/**
 * 读取 Mars3D 样式对象的显示状态
 * @param {object} styleOptions - Mars3D 样式对象
 * @param {boolean} defaultValue - 默认显示状态
 * @returns {boolean} 显示状态
 */
const getStyleShow = (styleOptions, defaultValue) => {
  return typeof styleOptions?.show === "boolean" ? styleOptions.show : defaultValue;
};

/**
 * 归一化卫星模型字段
 * @param {object} satelliteModel - 卫星模型对象
 * @returns {{noradID:string|number,name:string,tle1:string,tle2:string}|null} 卫星创建参数
 */
const normalizeSatelliteModel = (satelliteModel) => {
  const noradID = satelliteModel?.noradID ?? satelliteModel?.id;
  const name = satelliteModel?.name ?? String(noradID ?? "");
  const tle1 = satelliteModel?.tle1;
  const tle2 = satelliteModel?.tle2;

  if (!noradID || !tle1 || !tle2) return null;

  return { noradID, name, tle1, tle2 };
};

/**
 * 从已有卫星 graphic 上提取重建所需的 TLE 信息
 * @param {object} graphic - Mars3D 卫星 graphic
 * @returns {{noradID:string|number,name:string,tle1:string,tle2:string}|null} 卫星创建参数
 */
const getSatelliteModelFromGraphic = (graphic) => {
  const source = graphic?._satelliteModel || graphic?.attr?.satelliteModel || graphic?.options || graphic?._options || {};
  const noradID = source.noradID ?? source.id ?? graphic?.id;
  const name = source.name ?? graphic?.name ?? String(noradID ?? "");
  const tle1 = source.tle1 ?? graphic?.tle1 ?? graphic?.tle?.tle1 ?? graphic?.tle?._tle1;
  const tle2 = source.tle2 ?? graphic?.tle2 ?? graphic?.tle?.tle2 ?? graphic?.tle?._tle2;

  return normalizeSatelliteModel({ noradID, name, tle1, tle2 });
};

/**
 * 获取已有卫星 graphic 的显示状态
 * @param {object} graphic - Mars3D 卫星 graphic
 * @returns {{modelShow:boolean,pointShow:boolean,labelShow:boolean,pathShow:boolean}} 显示状态
 */
const getSatelliteDisplayState = (graphic) => {
  return {
    modelShow: getStyleShow(graphic?.model, false),
    pointShow: getStyleShow(graphic?.point, true),
    labelShow: getStyleShow(graphic?.label, true),
    pathShow: getStyleShow(graphic?.path, true),
  };
};

/**
 * 创建卫星 graphic
 * @param {object} satelliteModel - 卫星模型对象
 * @param {number} referenceFrame - Cesium 参考系
 * @param {object} displayState - 显示状态
 * @returns {object|null} Mars3D 卫星 graphic
 */
const createSatelliteGraphic = (satelliteModel, referenceFrame = mars3d.Cesium.ReferenceFrame.FIXED, displayState = {}) => {
  const normalizedModel = normalizeSatelliteModel(satelliteModel);
  if (!normalizedModel) return null;

  const modelShow = displayState.modelShow ?? false;
  const pointShow = displayState.pointShow ?? true;
  const labelShow = displayState.labelShow ?? true;
  const pathShow = displayState.pathShow ?? true;

  const satelliteGraphic = new mars3d.graphic.Satellite({
    id: normalizedModel.noradID,
    name: normalizedModel.name,
    tle1: normalizedModel.tle1,
    tle2: normalizedModel.tle2,
    referenceFrame, // INERTIAL：惯性坐标系  FIXED：地球坐标系
    attr: {
      satelliteModel: normalizedModel,
    },
    model: {
      show: modelShow,
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
      show: pointShow,
      color: "#ff0000",
      pixelSize: 10,
    },

    label: {
      show: labelShow,
      text: normalizedModel.name,
      font_size: 20,
      font_family: "楷体",
      color: "#ffffff",
      opacity: labelShow ? 1 : 0,
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

    path: {
      show: pathShow,
      color: "#00ff00",
      width: 1,
      opacity: pathShow ? 0.5 : 0,
    },
  });

  satelliteGraphic._isSate = true;
  satelliteGraphic._satelliteModel = normalizedModel;

  return satelliteGraphic;
};

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
export function addSatellite(satelliteLayer, satelliteModel, coordinate) {
  if (!satelliteLayer || !satelliteModel) return;

  const graphicSatellite = satelliteLayer.getGraphicById(satelliteModel.noradID);
  if (graphicSatellite) return;

  const satelliteGraphic = createSatelliteGraphic(
    satelliteModel,
    coordinate === "ECI" ? mars3d.Cesium.ReferenceFrame.INERTIAL : mars3d.Cesium.ReferenceFrame.FIXED,
  );
  if (!satelliteGraphic) return;

  satelliteLayer.addGraphic(satelliteGraphic);

  return satelliteGraphic;
}

/**
 * 重建卫星 graphic 以更新参考坐标系
 * @param {object} satelliteLayer - 卫星图层
 * @param {number} referenceFrame - Cesium 参考系
 * @returns {void}
 */
export const rebuildSatelliteReferenceFrame = (satelliteLayer, referenceFrame) => {
  if (!satelliteLayer || referenceFrame === undefined || referenceFrame === null) return;

  const satellites = [];
  satelliteLayer.eachGraphic((graphic) => {
    if (graphic?._isSate) satellites.push(graphic);
  });

  satellites.forEach((graphic) => {
    const satelliteModel = getSatelliteModelFromGraphic(graphic);
    if (!satelliteModel) {
      console.warn("卫星 graphic 缺少 TLE 信息，无法重建参考坐标系", graphic);
      return;
    }

    const displayState = getSatelliteDisplayState(graphic);
    satelliteLayer.removeGraphic(graphic);

    const nextGraphic = createSatelliteGraphic(satelliteModel, referenceFrame, displayState);
    if (nextGraphic) satelliteLayer.addGraphic(nextGraphic);
  });
};

/**
 * 切换卫星轨道线显示状态
 * @param {object} satelliteLayer - 卫星图层
 * @param {boolean} showSatelliteOrbit - 是否显示轨道线
 * @returns {void}
 */
export function toggleSatelliteOrbit(satelliteLayer, showSatelliteOrbit) {
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

export function toggleSatellitePoint(satelliteLayer, showSatellitePoint) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSateLine) return;

    graphic.path.show = showSatellitePoint;
    graphic.path.opacity = showSatellitePoint ? 1 : 0;
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
