import * as mars3d from "mars3d";
import "mars3d-cesium/Build/Cesium/Widgets/widgets.css";
import "mars3d/mars3d.css";
import "mars3d-space";
import { isEmpty } from "lodash-es";

let globalViewer = null;

export function initViewer(el, mapConfig = {}) {
  // 初始化球时 自定义配置项
  if (!isEmpty(mapConfig)) {
    globalViewer = new mars3d.Map(el, mapConfig);
  } else {
    globalViewer = new mars3d.Map(el, MAP_CONFIG);
  }

  // skyShow();

  return globalViewer;
}

// 加载天空盒
function skyShow() {
  globalViewer.scene.skyBox = new mars3d.Cesium.SkyBox({
    sources: {
      negativeX: "/assets/skyBox/px.png",
      negativeY: "/assets/skyBox/py.png",
      negativeZ: "/assets/skyBox/pz.png",
      positiveX: "/assets/skyBox/nx.png",
      positiveY: "/assets/skyBox/ny.png",
      positiveZ: "/assets/skyBox/nz.png",
    },
  });
}

/**
 * @description 设置 Cesium 时钟范围
 * @param {mars3d.Map} viewer - 地球图层实例
 * @param {number} startTimeMs - 开始时间（毫秒时间戳）
 * @param {number} endTimeMs - 结束时间（毫秒时间戳）
 * @returns {void}
 * */
export function setCesiumClockRange(viewer, startTimeMs, endTimeMs) {
  if (!viewer || !Number.isFinite(startTimeMs) || !Number.isFinite(endTimeMs)) return;

  viewer.clock.stopTime = mars3d.Cesium.JulianDate.fromDate(new Date(endTimeMs));
  viewer.clock.startTime = mars3d.Cesium.JulianDate.fromDate(new Date(startTimeMs));
  viewer.clock.currentTime = mars3d.Cesium.JulianDate.fromDate(new Date(startTimeMs));
  viewer.clock.clockRange = mars3d.Cesium.ClockRange.LOOP_STOP;
  viewer.clock.shouldAnimate = true;

  if (viewer.timeline) {
    viewer.timeline.zoomTo(startTimeMs, endTimeMs);
  }
}

export { globalViewer };
