<template>
  <!-- 页面右上角功能菜单 -->
  <div class="iconbtns-box">
    <!-- 显示用户名 -->
    <h2 class="user-box" :title="username">{{ userName }}</h2>

    <!-- 退出登录logout -->
    <span class="icon-btn" title="退出登录" @click="signOut">
      <img src="./assets/logout.svg" />
    </span>
  </div>
</template>

<script>
import { removeStorage, getStorage } from "@/utils/storage.js";

export default {
  name: "SystemFunc",
  data() {
    return {
      username: "",
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
      this.username = username;
      if (!username) {
        return "NONE";
      } else {
        return username.toLocaleUpperCase();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.iconbtns-box {
  position: absolute;
  top: 14px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: end;

  .user-box {
    padding: 3px 10px;
    min-width: 60px;
    height: 28px;
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
    border-radius: 4px;
    background-color: #ad5a18;
    display: flex;
    justify-content: center;
    align-items: center;
    word-break: keep-all;
    border: 2px solid #ad5a18;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background-color: #d37426;
    }
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
    background-color: #0a95ab;
    padding: 3px;
    margin-left: 6px;
    color: #f7f7f7;
    transition: all 0.5s;
    display: flex;
    justify-content: center;
    align-items: center;

    .user-icon {
      font-size: 18px;
      color: #ffffff;
    }

    img {
      width: 18px;
      height: 18px;
    }

    &:hover {
      background-color: #ad5a18;
    }
  }
}
</style>
