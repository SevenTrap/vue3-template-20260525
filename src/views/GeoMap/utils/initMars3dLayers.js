import * as mars3d from "mars3d";
import { globalViewer } from "@/utils/initEarth.js";

let satelliteLayer = null;
let satelliteSceneLayer = null;

// 初始化页面中涉及的所有图层
export function initMars3dLayers() {
  satelliteLayer = new mars3d.layer.GraphicLayer({ name: "卫星基础图层" });
  satelliteSceneLayer = new mars3d.layer.GraphicLayer({ name: "卫星场景图层" });

  globalViewer.addLayer(satelliteLayer);
  globalViewer.addLayer(satelliteSceneLayer);
}

export { satelliteLayer, satelliteSceneLayer };
