const aiRouter = [
  {
    path: "/layoutGeo/aiDemo",
    name: "OllamaChat",
    component: () => import("@/views/OllamaChat/index.vue"),
    meta: {
      title: "Ollama Chat",
      roles: [],
    },
  },
];

export default aiRouter;
