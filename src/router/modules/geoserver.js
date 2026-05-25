const geoserverRouter = [
  {
    path: "/layout/geoserver",
    name: "Geoserver",
    component: () => import("@/views/Geoserver/index.vue"),
    meta: {
      title: "Geoserver",
      roles: [],
    },
  },
];

export default geoserverRouter;
