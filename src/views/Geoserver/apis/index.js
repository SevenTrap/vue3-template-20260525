import { service } from "@/utils/service";

/**
 * 获取geoserver图层树
 * @returns {Promise<any>}
 */
export const getLayersTree = (params) => {
  return service({
    url: `${DOMAIN_CONFIG.geoserver_server_uri}/geoserver/getServer`,
    method: "get",
    params: params,
  });
};
