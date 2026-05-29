import * as mars3d from "mars3d";
import { globalViewer } from "@/utils/initEarth.js";

let satelliteLayer = null;
let satellitePathLayer = null;
let satelliteLinkLayer = null;

// 初始化页面中涉及的所有图层
export function initMars3dLayers() {
  satelliteLayer = new mars3d.layer.GraphicLayer({ name: "卫星轨道图层" });
  satellitePathLayer = new mars3d.layer.GraphicLayer({ name: "卫星轨迹图层" });
  satelliteLinkLayer = new mars3d.layer.GraphicLayer({ name: "卫星链路图层" });

  globalViewer.addLayer(satelliteLayer);
  globalViewer.addLayer(satellitePathLayer);
  globalViewer.addLayer(satelliteLinkLayer);

  satelliteLayer.on(mars3d.EventType.click, (event) => {
    console.log("点击了卫星", event);
  });

  satelliteLayer.on(mars3d.EventType.change, (event) => {
    // requestAnimationFrame(() => {
    //   this.processInArea(event.graphic);
    //   this.processSatsLinks(event.graphic);
    // });
    // this.processInArea(event.graphic);
    // this.processSatsLinks(event.graphic);
  });
}

export { satelliteLayer, satellitePathLayer, satelliteLinkLayer };
