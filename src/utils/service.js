import axios from "axios";

const instance = axios.create({
  timeout: 60 * 1000,
  headers: {
    common: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    get: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    post: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    put: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    delete: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  },
});

const httpCode = {
  400: "请求参数错误",
  401: "权限不足，请重新登录",
  403: "服务器拒绝本次访问",
  404: "请求资源未找到",
  405: "请求方法错误",
  500: "内部服务器错误",
  501: "服务器不支持该请求中使用的方法",
  502: "网关错误",
  503: "服务器不可用",
  504: "网关超时",
};

instance.interceptors.request.use(
  (config) => {
    try {
      let userId = localStorage.getItem("userId");

      if (userId) {
        config.headers = config.headers || {};
        config.headers.userId = userId;
      }

      return config;
    } catch (error) {
      console.error("Request interceptor error:", error);

      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  },
);

instance.interceptors.response.use(
  (response) => {
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
  },
  (error) => {
    console.log(error.response?.status);

    if (error && error.response) {
      let status = error.response.status;
      let tips = status in httpCode ? httpCode[status] : error.response.data.message;

      console.log(tips);

      return Promise.reject(error);
    } else {
      console.log("请求超时，请刷新重试");
      return Promise.reject(new Error("请求超时，连接服务器失败"));
    }
  },
);

export const service = instance;
