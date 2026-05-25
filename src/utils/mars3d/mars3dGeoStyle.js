import * as mars3d from "mars3d";
const GEO_HEIGHT = 35786 * 1000;
const ALT_HEIGHT = 20000 * 1000;

function createGeoCirclePositions(stepDeg = 1) {
  const positions = [];

  for (let lon = 0; lon <= 360; lon += stepDeg) {
    positions.push(mars3d.Cesium.Cartesian3.fromDegrees(lon, 0, GEO_HEIGHT));
  }

  return positions;
}

export function addGeoCirclePositions(viewer) {
  const geoCirclePositionsEntity = {
    id: "geoCirclePositionsEntity",
    name: "地球同步轨道-虚线",
    polyline: {
      positions: createGeoCirclePositions(2),
      width: 1.5,
      material: new mars3d.Cesium.PolylineDashMaterialProperty({
        color: mars3d.Cesium.Color.WHITE,
        gapColor: mars3d.Cesium.Color.TRANSPARENT,
        dashLength: 5,
      }),
      arcType: mars3d.Cesium.ArcType.NONE,
    },
  };

  viewer.entities.add(geoCirclePositionsEntity);
}

export function removeGeoCirclePositions(viewer) {
  const entity = viewer.entities.getById("geoCirclePositionsEntity");
  if (entity) {
    viewer.entities.remove(entity);
  }
}

export function addGeoCircleLabel(viewer) {
  const geoLabelGraphicLayer = new mars3d.layer.GraphicLayer({ id: "geoLabelGraphicLayer" });

  viewer.addLayer(geoLabelGraphicLayer);

  for (let lon = -180; lon < 180; lon += 30) {
    const lonStr = String(lon);

    const labelGraphic = new mars3d.graphic.PointEntity({
      position: new mars3d.LngLatPoint(lon, 0, ALT_HEIGHT),
      style: {
        pixelSize: 6,
        color: "#ff0000",
        outline: true,
        outlineColor: "#ffffff",
        outlineWidth: 1,

        label: {
          show: true,
          text: lonStr,
          font_size: 16,
          font_family: "微软雅黑",
          font_weight: "bold",
          color: "#ffffff",
          outline: true,
          outlineColor: "#000000",
          outlineWidth: 1,
          pixelOffsetY: -10,
        },
      },
    });

    geoLabelGraphicLayer.addGraphic(labelGraphic);
  }
}

export function removeGeoCircleLabel(viewer) {
  const layer = viewer.getLayerById("geoLabelGraphicLayer");
  if (layer) {
    viewer.removeLayer(layer);
  }
}
