<template>
  <!-- 页面右上角功能菜单 -->
  <div class="icon-btns">
    <!-- 显示用户名 -->
    <label class="user-box">
      {{ userName }}
    </label>

    <a class="icon-btn" target="_blank" v-for="(item, index) in menuQuickList" :href="item.path" :title="item.label" :key="index">
      <el-icon v-if="item.iconType === 'element'" class="user-icon">
        <component :is="item.iconName" />
      </el-icon>
    </a>

    <!-- 退出登录logout -->
    <!-- <span class="icon-btn" title="退出登录" @click="signOut">
      <img src="./assets/logout.svg" />
    </span> -->
  </div>
</template>

<script>
import { removeStorage, getStorage } from "@/utils/storage.js";
const menuQuickList = SYSTEM_CONFIG.menuQuickList;

export default {
  name: "SystemFunc",
  data() {
    return {
      menuQuickList,
    };
  },
  methods: {
    // TODO 用户退出登录 需要进行二次确认
    signOut() {
      removeStorage("token");

      this.$router.push({
        path: "/login",
      });
    },
  },
  computed: {
    userName() {
      let username = getStorage("username");
      if (!username) {
        return "GEOSERVER";
      }
      return username.toLowerCase();
    },
  },
};
</script>

<style lang="scss" scoped>
.icon-btns {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: end;

  .user-box {
    // width: 28px;
    padding: 0 10px;
    height: 28px;
    font-size: 16px;
    font-weight: bold;
    color: var(--aircas-color-text);
    border-radius: 4px;
    background-color: var(--aircas-color-background-button);
    display: flex;
    justify-content: center;
    align-items: center;
    border: 2px solid var(--aircas-color-border);
    cursor: text;
    transition: all 0.3s;

    &:hover {
      color: var(--aircas-color-white);
      border-color: var(--aircas-color-border-hover);
      background-color: var(--aircas-color-background-button-hover);
    }
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
    background-color: var(--aircas-color-background-button);
    padding: 3px;
    margin-left: 6px;
    color: #f7f7f7;
    transition: all 0.5s;
    display: flex;
    justify-content: center;
    align-items: center;

    .user-icon {
      font-size: 18px;
      color: var(--aircas-color-text);
    }

    img {
      width: 18px;
      height: 18px;
    }

    &:hover {
      font-weight: 700;
      color: var(--aircas-color-white);
      background-color: var(--aircas-color-background-button-hover);
    }
  }
}
</style>
