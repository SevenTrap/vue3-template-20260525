const cesiumRouter = [
  {
    path: "/layoutGeo/cesiumDemo",
    name: "CesiumDemo",
    component: () => import("@/views/CesiumDemo/index.vue"),
    meta: {
      title: "Cesium 示例",
      roles: [],
    },
  },
];

export default cesiumRouter;
