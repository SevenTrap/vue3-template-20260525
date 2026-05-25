const elementRouter = [
  {
    path: "/layout/treeConfigs",
    name: "TreeConfigsPage",
    component: () => import("@/views/TreeConfigs/index.vue"),
    meta: {
      title: "目录树功能测试",
      roles: [],
    },
  },
];

export default elementRouter;
