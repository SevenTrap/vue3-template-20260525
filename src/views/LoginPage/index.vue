<template>
  <div class="login-page">
    <div class="login-plane">
      <!-- <img class="system-logo" src="@/assets/logo.ae82d05a.png" /> -->

      <h1 class="system-title">{{ systemTitle }}</h1>

      <div class="login-form-container">
        <div class="login-form">
          <label class="login-label" for="username">账号：</label>
          <input id="username" v-model="formData.username" placeholder="请输入账号" />

          <label class="login-label" for="password">密码：</label>
          <input
            id="password"
            type="password"
            placeholder="请输入密码"
            v-model="formData.password"
            show-password
            @keyup.enter="onSubmit"
          />

          <el-button class="login-button" @click="onSubmit">登录</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { setStorage } from "@/utils/storage.js";
const systemTitle = SYSTEM_CONFIG.systemTitle;
export default {
  name: "LoginPage",
  data() {
    return {
      systemTitle,
      formData: {
        username: "admin",
        password: "123456",
      },
    };
  },

  methods: {
    onSubmit() {
      let username = this.formData.username.trim();
      let password = this.formData.password.trim();

      if (username == "" || password == "") {
        this.$message({
          type: "warning",
          message: "请输入账号密码！",
          duration: 1000,
        });

        return false;
      }

      setStorage("token", true);
      setStorage("username", username);

      this.$router.push({
        path: "/",
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.login-page {
  position: relative;
  width: 100%;
  height: 100%;
  background: url("./assets/bg-login-page.png") no-repeat;
  background-size: cover;
}

.login-plane {
  position: absolute;
  top: calc(50% - 210px);
  right: 200px;

  .system-title {
    font-size: 48px;
    margin-bottom: 20px;
    text-align: center;
    color: #00d0ff;
    font-weight: bold;
  }

  .login-form-container {
    margin: 0 auto;
    width: 500px;
    height: 350px;
    padding: 6px;
    background: url("./assets/login-form-container.png") no-repeat;
    background-size: 100% 100%;

    .login-form {
      width: 100%;
      height: 100%;
      border-radius: 15px;
      padding: 0 100px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: rgba($color: #000000, $alpha: 0.6);
    }

    .login-label {
      font-size: 18px;
      display: block;
      width: 60px;
      margin-bottom: 10px;
      color: #ffffff;
    }

    #username,
    #password {
      font-size: 14px;
      margin-bottom: 20px;
      padding: 0 15px;
      height: 38px;
      display: block;
      outline: none;
      color: #ffffff;
      background-color: #0f1518;
      border: 1px solid #4dd2ff;
      transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
    }

    .login-button {
      width: 100%;
      height: 38px;
      color: #ffffff;
      background-color: #0d76a8;
      border: 1px solid #4dd2ff;
    }
  }
}
</style>
