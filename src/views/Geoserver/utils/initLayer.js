import * as mars3d from "mars3d";
const initGraphicLayerName = ["pathGraphicLayer", "satelliteGraphicLayer", "SSTGraphicLayer"];

export function initLayers(globalViewer) {
  for (let i = 0; i < initGraphicLayerName.length; i++) {
    let graphicLayer = new mars3d.layer.GraphicLayer({
      name: initGraphicLayerName[i],
    });
    globalViewer.addLayer(graphicLayer);
  }
}
