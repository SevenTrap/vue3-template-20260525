import { globalViewer } from "@/utils/initEarth";

import * as mars3d from "mars3d";

// 设置 ECEF 默认视角
export function setDefaultPoleECEF(satelliteLayer, satelliteID) {
  if (!satelliteLayer) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  globalViewer.flyToGraphic(graphic, {
    duration: 1.5,
    heading: 0,
    pitch: -89,
    roll: 0,
  });
}

// 设置 ECEF 南极正视
export function setSouthPoleFrontECEF(satelliteLayer) {
  if (!satelliteLayer) return;

  globalViewer.camera.flyTo({
    destination: mars3d.Cesium.Cartesian3.fromDegrees(0, -90, 160_000_000),
    orientation: {
      heading: mars3d.Cesium.Math.toRadians(107.5),
      pitch: mars3d.Cesium.Math.toRadians(-90),
      roll: 0,
    },
    duration: 1.5,
  });
}

// 设置 ECEF 南极侧视
export function setSouthPoleSideECEF(satelliteLayer, satelliteID) {
  if (!satelliteLayer || !satelliteID) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  graphic.flyToPoint({
    scale: 0.8,
    heading: 180,
    pitch: 89,
    roll: 0,
  });

  globalViewer.trackedEntity = graphic;
}

// 设置 ECEF 恒星视角
export function setStarPoleECEF(satelliteLayer, satelliteID) {
  if (!satelliteLayer || !satelliteID) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  graphic.flyToPoint({
    scale: 1,
    heading: 0,
    pitch: -90,
    roll: 0,
  });

  globalViewer.trackedEntity = graphic;
}

// 设置 ECI 默认视角
export function setDefaultPoleECI(satelliteLayer, satelliteID) {
  if (!satelliteLayer || !satelliteID) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  graphic.flyToPoint({
    scale: 1,
    heading: 0,
    pitch: -89,
    roll: 0,
  });
}

// 设置 ECI 南极正视
export function setSouthPoleFrontECI(satelliteLayer) {
  if (!satelliteLayer) return;

  globalViewer.camera.flyTo({
    destination: mars3d.Cesium.Cartesian3.fromDegrees(0, -90, 160_000_000),
    orientation: {
      heading: mars3d.Cesium.Math.toRadians(107.5),
      pitch: mars3d.Cesium.Math.toRadians(-90),
      roll: 0,
    },
  });
}

// 设置 ECI 南极侧视
export function setSouthPoleSideECI(satelliteLayer, satelliteID) {
  if (!satelliteLayer || !satelliteID) return;

  const graphic = satelliteLayer.getGraphicById(satelliteID);
  if (!graphic) return;

  graphic.flyToPoint({
    scale: 0.6,
    heading: 180,
    pitch: 89,
    roll: 0,
  });

  // globalViewer.trackedEntity = graphic.trackedEntity;
}
