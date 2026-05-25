<template>
  <main>
    <!-- <div class="layout-header-placeholder"></div> -->

    <TitleBar></TitleBar>
    <SystemFunc></SystemFunc>
    <router-view class="layout-page"></router-view>
  </main>
</template>

<script>
import TitleBar from "./components/TitleBar/index.vue";
import SystemFunc from "./components/SystemFunc/index.vue";

export default {
  name: "layout",
  components: { TitleBar, SystemFunc },
};
</script>

<style lang="scss" scoped>
main {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-image: url("@/assets/background.jpg");
  background-size: cover;
  background-repeat: no-repeat;

  .layout-page {
    position: relative;
    width: 100%;
    height: 100%;
  }
}
</style>
