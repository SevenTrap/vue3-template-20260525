const openlayersRouter = [
  {
    path: "/layoutGeo/openlayersDemo",
    name: "OpenLayersMap",
    component: () => import("@/views/OpenlayersMap/index.vue"),
    meta: {
      title: "OpenLayers 示例",
      roles: [],
    },
  },
];

export default openlayersRouter;
