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

  skyShow();

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

export { globalViewer };
