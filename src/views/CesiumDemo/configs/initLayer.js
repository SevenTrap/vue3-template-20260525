import * as mars3d from "mars3d";
const initGraphicLayerName = ["pathGraphicLayer", "satelliteGraphicLayer", "SSTGraphicLayer"];
// const initImageLayerName = ["SSTImageLayer"];

export function initLayers(globalViewer) {
  for (let i = 0; i < initGraphicLayerName.length; i++) {
    let graphicLayer = new mars3d.layer.GraphicLayer({ name: initGraphicLayerName[i] });
    globalViewer.addLayer(graphicLayer);
  }

  // for (let i = 0; i < initImageLayerName.length; i++) {
  //   let imageLayer = new mars3d.layer.ImageLayer({ name: initImageLayerName[i] });
  //   globalViewer.addLayer(imageLayer);
  // }
}
