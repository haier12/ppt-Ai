<script setup>
import typewriter from "./typewriter.vue";
import { ref, onMounted } from "vue";
import {
  createOutline,
  getBackGround,
  createPPT,
  getProgress,
} from "./util/request.js";
import { text2Text, uploadDoc } from "./util/aichat.js";
import CryptoJS from "crypto-js";

import axios from "axios";

const outputText = ref("");

const inputValue = ref("");

const backGroundList = ref([]);

const treeData = ref([]);
const outline = ref([]);
const status = ref("init");

var timer = null;
let httpUrl = new URL("https://spark-api.xf-yun.com/v3.5/chat");
let modelDomain;

const getOutline = (str) => {
  createOutline({
    query: str,
    author: "Aix平台",
    is_figure: true,
  }).then((res) => {
    console.log(res);
    treeData.value = parseTreeData(res.data.outline);
    outline.value = res.data;
  });
};

const parseTreeData = (data) => {
  return [
    {
      id: data.id,
      label: `${data.title} - ${data.subTitle}`,
      children: data.chapters.map((chapter) => ({
        id: chapter.id,
        label: chapter.chapterTitle,
        children: chapter.chapterContents
          ? chapter.chapterContents.map((content) => ({
              id: content.id,
              label: content.chapterTitle,
            }))
          : [],
      })),
    },
  ];
};

const send = () => {
  console.log("发送内容:", inputValue.value);
  getOutline(inputValue.value);
};
const getBackground = () => {
  treeData.value = [];
  getBackGround().then((res) => {
    console.log(res);
    backGroundList.value = res.data;
  });
};
const selectBackground = (id) => {
  let data = {
    sid: outline.value.sid,
  };
  createPPT(data).then((res) => {
    console.log(res, "正在生成中");

    const checkProgress = () => {
      getProgress(res.data.sid).then((response) => {
        if (
          response.data &&
          response.data.pptUrl &&
          response.data.pptUrl.length > 4
        ) {
          window.location.href = response.data.pptUrl;
          Elmessage.success("生成成功");
        } else {
          checkProgress();
        }
      });
    };

    checkProgress();
  });
};
const conversation = ref([]);
const result = ref([]);
const inputData = ref([]);
// const submitData = async () => {
//   // try {
//   //   const response = await text2Text(conversation.value);
//   //   result.value = response.data.choices[0].message.content;
//   //   conversation.value.push({
//   //     role: "assistant",
//   //     content: result.value
//   //   });
//   //   console.log(result);
//   //   console.log(result.value);
//   // } catch (error) {
//   //   console.log("Error:", error);
//   // }
// }

const addMessage = () => {
  conversation.value.push({
    role: "user",
    content: inputData.value,
  });
  inputData.value = "";
  submitData();
};

const selectedFile = ref(null);

const maxSize = 1024 * 1024 * 20;
const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
];
const fileType = "wiki";
const parseType = "AUTO";
const onFileChange = (file) => {
  console.log(file);
  if (!allowedTypes.includes(file.raw.type)) {
    console.error("不支持的文件类型");
    return;
  }
  if (file.size > maxSize) {
    console.error("文件过大");
    return;
  }
  selectedFile.value = file.raw;
  uploadFile();
};
const beforeUpload = (file) => {
  return false;
};
const uploadFile = async () => {
  if (!selectedFile.value) {
    console.error("请先选择文件");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("fileType", fileType);
  formData.append("parseType", parseType);

  for (const pair of formData.entries()) {
    console.log(pair[0], pair[1]);
  }

  try {
    const response = await uploadDoc(formData);
    console.log(response);
  } catch (error) {
    console.error(error);
  }
};
function connectWebSocket() {
  status.value = "ttsing";
  return getWebsocketUrl().then((url) => {
    let ttsWS = new WebSocket(url);

    ttsWS.onopen = () => {
      webSocketSend(ttsWS);
    };
    ttsWS.onmessage = (e) => {
      result1(e.data);
    };
    ttsWS.onerror = (e) => {
      status.value = "error";
      console.log("WebSocket error:", e);
    };
    ttsWS.onclose = () => {
      status.value = "init";
    };
  });
}

function getWebsocketUrl() {
  return new Promise((resolve, reject) => {
    var apiKey = "eaebcaf5da87a509b52f0f8931248403";
    var apiSecret = "YTMyZWFiOGVlYTc5ZGM5NGIwOTU3NWMx";
    var url = "wss://spark-api.xf-yun.com/v4.0/chat";

    var host = "spark-api.xf-yun.com"; 
    var date = new Date().toGMTString();
    var algorithm = "hmac-sha256";
    var headers = "host date request-line";
    var signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v4.0/chat HTTP/1.1`;
    var signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret);
    var signature = CryptoJS.enc.Base64.stringify(signatureSha);

    var authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    var authorization = CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Utf8.parse(authorizationOrigin)
    );

    url = `${url}?authorization=${authorization}&date=${date}&host=${host}`;
    console.log(url);
    resolve(url);
  });
}
function webSocketSend(ws) {
  const params = {
    header: {
      app_id: "2ff2cc26",
    },
    parameter: {
      chat: {
        domain: "4.0Ultra",
        temperature: 0.5,
        max_tokens: 1024,
      },
    },
    payload: {
      message: {
        text: [{ role: "user", content: "我心情不好给我一点建议" }],
      },
    },
  };
  ws.send(JSON.stringify(params));
}

function result1(resultData) {
  let jsonData = JSON.parse(resultData);
  console.log(jsonData);
  outputText.value += jsonData.payload.choices.text[0].content;
  console.log(outputText.value);
  if (jsonData.header.code !== 0) {
    alert(`提问失败: ${jsonData.header.code}:${jsonData.header.message}`);
  }
}

onMounted(() => {
  connectWebSocket();
  getBackground();
});
</script>

<template>
  <!-- <div class="center-content">
      <el-input v-model="inputValue" placeholder="请输入内容" class="input"></el-input>
      <el-button type="primary" @click="send">发送</el-button>
    </div>
    <div>
      <el-input v-model="inputData" placeholder="请输入对话" class="input"></el-input>
      <el-button type="primary" @click="submitData">发送</el-button>
    </div>
    <div>
      <el-tree :data="treeData" :props="defaultProps" highlight-current node-key="id" :default-expand-all="true">
      </el-tree>
      <el-button @click="getBackground" v-show="treeData.length > 0">下一步
      </el-button>
      <div style="margin-top: 50vh; display: flex; flex-wrap: wrap">
        <div v-for="item in backGroundList">
          {{ item.name }}
          <img style="width: 100px; height: auto" :src="item.thumbnail" alt="" />
          <el-button @click="selectBackground(item.key)">选择</el-button>
        </div>
      </div>
    </div> -->
  <div class="ai-chat-container">
    <div class="ai-chat-view">
      <ul class="ai-chat-list" ref="aiChatListRef">
        <li class="ai-chat-item">
          <!-- 头像 -->
          <div class="ai-chat-avatar">
            <el-avatar :size="40">Aix</el-avatar>
          </div>
          <!-- 聊天内容 -->
          <div class="ai-chat-content-box init-box">
            <div class="ai-chat-title">AIX平台</div>
            <div class="ai-chat-text">
              <!-- 能够学习和理解人类的语言，进行多轮对话 -->
              <typewriter :text="outputText"></typewriter>
            </div>
            <div class="ai-chat-text">
              回答问题，高效便捷地帮助人们获取信息、知识和灵感
            </div>
          </div>
        </li>
        <li
          class="ai-chat-item"
          :class="item.role + '-item'"
          v-for="(item, index) of conversation"
        >
          <!-- 头像 -->
          <div class="ai-chat-avatar">
            <el-avatar
              v-if="item.role === 'user'"
              :icon="UserFilled"
              :size="40"
            />
            <el-avatar v-if="item.role === 'assistant'" :size="40"
              >Aix</el-avatar
            >
          </div>
          <!-- 聊天内容 -->
          <div
            class="ai-chat-content-box"
            :class="item.role + '-box'"
            v-if="item.role === 'user'"
          >
            {{ item.content }}
          </div>
          <div
            class="ai-chat-content-box"
            :class="item.role + '-box'"
            v-if="item.role === 'assistant'"
          >
        
          </div>
        </li>
      </ul>
      <!-- 文本发送区域 -->
      <div class="ai-chat-form-wrapper">
        <!-- <el-upload action="#" :on-change="onFileChange" :before-upload="beforeUpload" :show-file-list="false">
          <el-button color="#626aef" :dark="isDark" type="primary">点击上传</el-button>
        </el-upload> -->
        <el-button
          type="primary"
          color="#626aef"
          :dark="isDark"
          :disabled="sendBtnDisabled"
          @click="addMessage"
          >生成ppt</el-button
        >
        <div class="ai-chat-form-box">
          <textarea
            v-model="inputData"
            :rows="4"
            placeholder="在此输入您想要了解的内容..."
            @keydown.enter.exact.prevent="addMessage"
            @keydown.enter.shift.exact.prevent="inputData += '\n'"
          >
          </textarea>
          <div class="chat-form-footer">
            <div class="btns">
              <span>
                <el-button
                  type="primary"
                  :disabled="sendBtnDisabled"
                  @click="addMessage"
                  >发送</el-button
                >
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="ai-chat-sidebar">
      <div style="padding: 10px">ppt模板选择</div>
      <div class="sidebar-content">
        <div
          style="
            padding: 20px;
            padding-right: 30px;
            padding-left: 30px;
            margin: 10px;
            background-color: #f5f5f5;
            border-radius: 10px;
            border-block: 3px solid #e6e6e6;
          "
          v-for="item in backGroundList"
        >
          {{ item.name }}
          <br />
          <img
            style="width: 100px; height: auto"
            :src="item.thumbnail"
            alt=""
          />
          <br />
          <el-button type="primary" @click="selectBackground(item.key)"
            >选择</el-button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-chat-container {
  height: 80vh;
  max-width: 100vh;

  .ai-chat-view {
    // display: flex;
    background-color: #fff;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    width: 100vh;
    padding: 40px 15px;
    border-radius: 10px;
    border-block: 2px solid #e6e6e6;

    //对话列表
    .ai-chat-list {
      display: flex;
      flex: 1;
      flex-direction: column;
      overflow-y: auto;
      max-height: 55vh;
      height: 55vh;
      border-block: 1px solid #e6e6e6;
      padding: 10px;

      &::-webkit-scrollbar {
        width: 8px;
        background-color: #f1f1f1;
      }

      &::-webkit-scrollbar-thumb {
        background-color: #888;
        border-radius: 4px;
      }

      //会话项
      .ai-chat-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 40px;
      }

      //会话头像
      .ai-chat-avatar {
        margin-right: 25px;
      }

      //会话盒子
      .ai-chat-content-box {
        padding: 16px 30px;

        //会话列表初始化盒子
        &.init-box {
          width: 100%;
          background-color: #eff7ff;
          background-image: url("https://ydcqoss.ydcode.cn/static/officialhome/ai-chat-init-bg.png");
          background-repeat: no-repeat;
          background-size: cover;
          border-radius: 10px;

          .ai-chat-title {
            font-size: 1.125rem;
            color: #005fdb;
            margin-bottom: 1rem;
          }

          .ai-chat-text {
            font-size: 0.875rem;
            color: #666666;
            line-height: 1.8;
          }
        }

        //会话列表用户盒子
        &.user-box {
          background-color: #fff;
          line-height: 2;
          padding-left: 0;
          padding-top: 0;
        }

        //会话列表ai回复盒子
        &.assistant-box {
          border-radius: 10px;
          background: #eff7ff;
          width: 100%;
        }
      }
    }
  }

  //发送问题表达
  .ai-chat-form-wrapper {
    background-color: #fff;
    padding-left: calc(40px + 25px);
    bottom: 20px;

    .ai-chat-form-box {
      border: 2px solid #005fdb;
      border-radius: 10px;
      position: relative;
    }

    //文本域
    textarea {
      width: calc(100vh - 300px);
      margin-top: 2px;
      padding: 0.5rem 13rem 1rem 1.25rem;
      border: none;
      outline: none;
      resize: none;
      border-radius: 10px;
      background-color: #fbfbfb;
      color: #666;

      &::-webkit-scrollbar {
        width: 3px;
      }
    }

    //发送问题表单footer
    .chat-form-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: -5px;
      background-color: #fbfbfb;
      position: absolute;
      bottom: 1rem;
      right: 1rem;

      //内容数字提示
      .content-tips {
        margin-right: 1.25rem;
      }
    }
  }

  .ai-chat-sidebar {
    position: fixed;
    top: 20px;
    right: 0;
    width: 40vh;
    height: 100vh;
    background-color: #fff;
    z-index: 999;
    border-radius: 10px;
    border-block: 2px solid #e6e6e6;

    .sidebar-content {
      display: flex;
      flex: 1;
      flex-direction: column;
      overflow-y: auto;
      max-height: 85vh;
      height: 85vh;
      border-block: 1px solid #e6e6e6;
      padding: 10px;

      &::-webkit-scrollbar {
        width: 8px;
        background-color: #f1f1f1;
      }

      &::-webkit-scrollbar-thumb {
        background-color: #888;
        border-radius: 4px;
      }
    }
  }
}
</style>
