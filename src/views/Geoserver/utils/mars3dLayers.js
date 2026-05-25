import * as mars3d from "mars3d";
import { globalViewer } from "@/utils";

/**
 * 生成TileMatrixLabels
 * @param {Object} options
 * @param {string} options.prefix - 前缀
 * @param {number} options.maxLevel - 最大级别
 * @returns {string[]} TileMatrixLabels
 * */
export function generateTileMatrixLabels(options) {
  const prefix = options.prefix || "EPSG:4326";
  const maxLevel = options.maxLevel || 20;
  const tileMatrixLabels = [];
  for (let i = 0; i < maxLevel; i++) {
    tileMatrixLabels.push(`${prefix}:${i}`);
  }
  return tileMatrixLabels;
}

export function addWmtsLayer(layer) {
  const layerToRemove = globalViewer.getLayer(layer.id, "id");
  if (layerToRemove) return;

  const tileMatrixLabels = generateTileMatrixLabels({
    prefix: layer.server_type || "EPSG:4326",
    maxLevel: layer.max_level || 18,
  });

  const layerOption = new mars3d.layer.WmtsLayer({
    id: layer.id,
    name: layer.server_name || "Global_Image_4326",
    url: `${DOMAIN_CONFIG.geoserver_server_uri}/tilecache/service/wmts`,
    layer: layer.layer || "Global_Image_4326",
    format: layer.image_type || "image/jpeg",
    crs: layer.server_type || "EPSG:4326",
    type: "wmts",
    style: "",
    Version: "1.0.0",
    Service: "WMTS",
    Request: "GetTile",
    tileMatrixSetID: layer.server_type || "EPSG:4326",
    tileMatrixLabels: tileMatrixLabels,
  });

  globalViewer.addLayer(layerOption);
}

export function add3dtilesLayer(layer) {
  const layerToRemove = globalViewer.getLayer(layer.id, "id");
  if (layerToRemove) return;

  const layerOption = new mars3d.layer.TilesetLayer({
    id: layer.id,
    name: layer.server_name,
    url: `${DOMAIN_CONFIG.geoserver_server_uri}/tilecache/service/tileset/${layer.layer}/tileset.json`,
    maximumScreenSpaceError: 1,
    maxMemory: 512, // 最大缓存内存大小(MB)
    cullWithChildrenBounds: false,
    skipLevelOfDetail: true,
    preferLeaves: true,
    flyTo: true,
  });

  globalViewer.addLayer(layerOption);
}

export function addTerrainLayer(layer) {
  const layerToRemove = globalViewer.getLayer(layer.id, "id");
  if (layerToRemove) return;

  const layerOption = new mars3d.layer.TerrainLayer({
    id: layer.id,
    name: layer.server_name,
    url: `${DOMAIN_CONFIG.geoserver_server_uri}/tilecache/service/terrain/${layer.layer}/terrain.json`,
  });

  globalViewer.addLayer(layerOption);
}
