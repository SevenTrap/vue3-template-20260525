const cesiumRouter = [
  {
    path: "/layout/cesiumDemo",
    name: "CesiumDemo",
    component: () => import("@/views/CesiumDemo/index.vue"),
    meta: {
      title: "Cesium 示例",
      roles: [],
    },
  },
  {
    path: "/layout/geoMap",
    name: "GeoMap",
    component: () => import("@/views/GeoMap/index.vue"),
    meta: {
      title: "高轨态势(cesium)",
      desc: "以mars3d为基础构建的三维球",
      roles: [],
    },
  },
];

export default cesiumRouter;
