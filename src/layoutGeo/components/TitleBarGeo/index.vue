<template>
  <div class="header-title-bar">
    <img class="logo" src="./assets/logo.svg" />
    <h1 class="title-name">基于经高网构建的二维直角坐标系</h1>
  </div>
</template>

<style lang="scss" scoped>
.header-title-bar {
  position: relative;
  width: 100vw;
  height: 55px;
  background: #ffffff;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #aaaaaa;
  box-shadow: 0px 0px 5px #000000;
  z-index: 10;

  .logo {
    width: 70px;
    height: 60px;
  }

  .title-name {
    font-size: 28px;
    font-weight: 800;
    color: #363636;
  }
}
</style>
