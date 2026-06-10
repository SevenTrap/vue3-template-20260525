import * as mars3d from "mars3d";
import { useGeoMapStore } from "@/store/useGeoMapStore";

const geoMapStore = useGeoMapStore();

/**
 * 创建卫星 graphic
 * @param {object} satelliteModel - 卫星模型对象
 * @param {number} referenceFrame - Cesium 参考系
 * @param {object} displayState - 显示状态
 * @returns {object|null} Mars3D 卫星 graphic
 */
const createSatelliteGraphic = (satelliteModel) => {
  const coordinate = geoMapStore.coordinate;

  const referenceFrame = coordinate === "ECI" ? mars3d.Cesium.ReferenceFrame.INERTIAL : mars3d.Cesium.ReferenceFrame.FIXED;

  const satelliteGraphic = new mars3d.graphic.Satellite({
    id: satelliteModel.noradID,
    name: satelliteModel.name,
    tle1: satelliteModel.tle1,
    tle2: satelliteModel.tle2,
    referenceFrame, // INERTIAL：惯性坐标系  FIXED：地球坐标系

    model: {
      show: true,
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
      debugAxis: true,
      debugAxisLength: 1000000,
    },

    label: {
      show: true,
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

    path: {
      show: true,
      color: "#00ff00",
      width: 1,
      opacity: 0.5,
    },
  });

  satelliteGraphic._isSate = true;
  satelliteGraphic._satelliteModel = satelliteModel;

  return satelliteGraphic;
};

// 添加卫星上球展示
export function addSatellite(satelliteLayer, satelliteModel) {
  if (!satelliteLayer || !satelliteModel) return;

  const graphicSatellite = satelliteLayer.getGraphicById(satelliteModel.noradID);
  if (graphicSatellite) return;

  const satelliteGraphic = createSatelliteGraphic(satelliteModel);
  if (!satelliteGraphic) return;

  satelliteLayer.addGraphic(satelliteGraphic);
}

/**
 * 重建卫星 graphic 以更新参考坐标系
 * @param {object} satelliteLayer - 卫星图层
 * @param {number} referenceFrame - Cesium 参考系
 * @returns {void}
 */
export const rebuildSatelliteReferenceFrame = (satelliteLayer) => {
  if (!satelliteLayer) return;

  geoMapStore.checkedNorads.forEach((norad) => {
    const satelliteModel = geoMapStore.satelliteModels.get(norad);
    if (!satelliteModel) return;

    const graphic = satelliteLayer.getGraphicById(norad);
    if (graphic) satelliteLayer.removeGraphic(graphic);

    const nextGraphic = createSatelliteGraphic(satelliteModel);
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
    graphic.model.show = showSatelliteModel;
  });
}

export function toggleSatellitePoint(satelliteLayer, showSatellitePoint) {
  if (!satelliteLayer) return;

  satelliteLayer.eachGraphic((graphic) => {
    if (!graphic._isSate) return;
    graphic.point.show = showSatellitePoint;
  });
}
