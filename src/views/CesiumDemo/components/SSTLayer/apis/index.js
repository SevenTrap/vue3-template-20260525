import { service } from "@/utils/service.js";

/**
 * @description 内孤立波预报中的海水温度数据
 * 数据来源于课题3.4
 * @param {String} bbox "[115.802393355, 123.915865971, 17.802393355, 22.392847773]"
 * @param {String} start_time 数据预报时间
 * @param {String} level 2.5 或者置空
 * @param {Number} sample 采样点数 为正整数
 * @param {String} result_type 返回的数据类型 nc/h3
 * @param {Number} h3_resolution 如果result_type为h3。则表示网格层级
 * */
export function querySSTData(params) {
  return service({
    url: DOMAIN_CONFIG.task0603_python_server + "/nanhai_master/34neigulibo/predict/temp_bbox",
    method: "get",
    params: params,
  });
}
