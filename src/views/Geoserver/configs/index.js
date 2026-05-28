import { v4 as uuidV4 } from "uuid";

export const layerManagerTree = [
  {
    id: uuidV4(),
    name: "基础地图",
    label: "基础地图",
    children: [],
  },
  {
    id: uuidV4(),
    name: "三维模型",
    label: "三维模型",
    children: [],
  },
  {
    id: uuidV4(),
    name: "数字高程",
    label: "数字高程",
    children: [],
  },
];
