import { v4 as uuidV4 } from "uuid";

/**
 * 根据卫星的llas数据渲染卫星轨迹
 * */
export function addSatelliteOribitByLLAs(graphicLayer, llas, id) {
  const uuid = id || uuidV4();
  console.log(uuid);
}
