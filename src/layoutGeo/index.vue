<template>
  <TitleBarGeo></TitleBarGeo>
  <SystemFunc></SystemFunc>

  <main>
    <router-view></router-view>
  </main>
</template>

<script>
import TitleBarGeo from "./components/TitleBarGeo/index.vue";
import SystemFunc from "./components/SystemFunc/index.vue";

export default {
  name: "layoutLeo",
  components: { TitleBarGeo, SystemFunc },
};
</script>

<style lang="scss" scoped>
main {
  position: relative;
  width: 100vw;
  height: calc(100vh - 55px);
}
</style>
