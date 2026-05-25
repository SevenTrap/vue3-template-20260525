<template>
  <div class="page-list-container">
    <div class="page-item aircas-card" v-for="(route, index) in routes" :key="index" @click="handleJumpPage(route)">
      <h3>{{ route.meta.title }}</h3>
      <span>{{ route.meta?.desc || "--" }}</span>
    </div>
  </div>
</template>

<script>
import router from "@/router/index";
export default {
  name: "HomePage",

  methods: {
    handleJumpPage(routeItem) {
      console.log("当前点击进入页面：", routeItem);

      const routeData = this.$router.resolve({
        path: routeItem.path,
        query: {},
      });

      window.open(routeData.href, "_blank");
    },
  },
  computed: {
    routes() {
      const routesTemp = [];

      router.getRoutes().map((route) => {
        if (route.meta && route.meta.title) routesTemp.push(route);
      });

      return routesTemp;
    },
  },
};
</script>

<style lang="scss" scoped>
.page-list-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, 400px);
  grid-template-rows: repeat(auto-fill, 140px);
  column-gap: 10px;
  row-gap: 10px;
  justify-content: center;

  .page-item {
    width: 100%;
    height: 100%;
    padding: 0 15px;
    background: linear-gradient(158deg, rgba(31, 30, 30, 0.9), rgba(31, 30, 30, 0.9) 50%, rgba(5, 186, 245, 0.31) 0, rgba(5, 186, 245, 0.31));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;

    cursor: pointer;
    border-radius: 4px;
    border: 2px solid #2187a8;
    transition: all 0.5s;
    color: #ffffff;

    h3 {
      font-size: 2.5rem;
      text-align: center;
      margin-bottom: 10px;
    }
    span {
      font-size: 1.8rem;
      text-align: center;
    }

    &:hover {
      filter: hue-rotate(250deg);
    }
  }
}
</style>
