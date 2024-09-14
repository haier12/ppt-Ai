import axios from "axios";
import { getSignature } from "./index";
import { ElMessage } from "element-plus";

let appId = "2ff2cc26";
let secret = "YTMyZWFiOGVlYTc5ZGM5NGIwOTU3NWMx";
let timestamp = Math.floor(Date.now() / 1000);
let signature = getSignature(appId, secret, timestamp);

const instance = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
    appId: appId,
    timestamp: timestamp,
    signature: signature,
  },
});

const createOutline = async (data) => {
  console.log("createOutline data:", data);
  try {
    const response = await instance.post(
      "/parth/api/aippt/createOutline",
      data
    );
    console.log("createOutline response:", response);
    if (response.code == 81002) {
      ElMessage.error("并发数量超过限制");
    }
    return response.data;
  } catch (error) {
    console.error("请求失败:", error);
    throw error;
  }
};
const getBackGround = async () => {
  try {
    const response = await instance.get("/parth/api/aippt/themeList");
    return response.data;
  } catch (error) {
    console.error("请求失败:", error);
    throw error;
  }
};
const createPPT = async (data) => {
  try {
    const response = await instance.post("/parth/api/aippt/create", data);
    console.log("createOutline response:", response);

    return response.data;
  } catch (error) {
    console.error("请求失败:", error);
    throw error;
  }
};
const createByOutline = async (data) => {
  try {
    const response = await instance.post("/parth/api/aippt/createByOutline", data);
    console.log("createByOutline response:", response);

    return response.data;
  } catch (error) {
    console.error("请求失败:", error);
    throw error;
  }
};
const getProgress = async (id) => {
  try {
    const response = await instance.get(`/parth/api/aippt/progress?sid=${id}`);
    return response.data;
  } catch (error) {
    console.error("请求失败:", error);
    throw error;
  }
};

export { instance, createOutline, getBackGround, createPPT, getProgress, createByOutline };
