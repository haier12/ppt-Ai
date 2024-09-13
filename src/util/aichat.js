import axios from "axios";
import { getSignature } from "./index";

let appId = "2ff2cc26";
let secret = "YTMyZWFiOGVlYTc5ZGM5NGIwOTU3NWMx";
let timestamp = Math.floor(Date.now() / 1000);
let signature = getSignature(appId, secret, timestamp);

export function text2Text(data) {
  return axios({
    url: "v1/chat/completions",
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer yjCwlZCeUtBYvjHAQZdk:FtWNmJSWcZMCmTBQZfoH",
      Accept: "*/*",
    },
    data: {
      model: "4.0Ultra",
      messages: data,
      stream: false,
    },
  });
}
export function uploadDoc(data) {
  return axios({
    url: "openapi/v1/file/upload",
    method: "post",
    headers: {
      "Content-Type": "multipart/form-data",
      appId: appId,
      timestamp: timestamp,
      signature: signature,
    },
    data: data,
  });
}
export function queryDocStatus(data) {
  return axios({
    url: "openapi/v1/file/status",
    method: "post",
    headers: {
      "Content-Type": "application/form-data",
      appId: appId,
      timestamp: timestamp,
      signature: signature,
    },
    data: data,
  });
}
export function chatByDoc(fileId, question) {
  const wsUrl = `wss://chatdoc.xfyun.cn/openapi/chat?fileId=${fileId}&appId=${appId}&timestamp=${timestamp}&signature=${signature}`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    const messageBody = {
      fileIds: [fileId],
      messages: [
        {
          role: "user",
          content: "这段文章讲了什么",
        },
      ],
      chatExtends: {
        wikiPromptTpl:
          "请将以下内容作为已知信息：\n<wikicontent>\n请根据以上内容回答用户的问题。\n问题:<wikiquestion>\n回答:",
        wikiFilterScore: 0.82,
        temperature: 0.5,
        sparkWhenWithoutEmbedding: false,
      },
    };

    ws.send(JSON.stringify(messageBody));
  };

  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    console.log("WebSocket 消息:", response);
  };

  ws.onerror = (error) => {
    console.error("WebSocket 错误:", error);
  };
}
