<script setup>
import typewriter from "./typewriter.vue";
import { ref, onMounted } from "vue";
import {
  createOutline,
  getBackGround,
  createPPT,
  getProgress,
  createByOutline,
} from "./util/request.js";
import { text2Text, uploadDoc } from "./util/aichat.js";
import CryptoJS from "crypto-js"



const outputText = ref("");

const inputValue = ref("");

const backGroundList = ref([]);

const treeData = ref([]);
const outline = ref([]);
const status = ref("init");

var timer = null;
let httpUrl = new URL("https://spark-api.xf-yun.com/v3.5/chat");
let modelDomain;

const getOutline = () => {
  createOutline({
    query: '桃花源', //str
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
const outlineData = ref({
  query: '',
  outline: ''}
)

//大纲直接生成ppt
const outlineCreatePPT = () => {
  outlineData.value = {
    query: inputTheme.value,
    outline: outputText.value
  }
  const jsonData = JSON.stringify(outlineData)
  createByOutline(jsonData).then((res) => {
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
  })
};

const conversation = ref([]);
const result = ref([]);
const inputData = ref([]);
const inputTheme = ref(""); // 输入的主题
const inputRequire = ref("") // 输入的需求
const activeStep = ref(0);  // 上方进度条
const fixRequire = ref("");  // 对话修改大纲

const addMessage = () => {
  const themeValue = inputTheme.value;
  const requireValue = inputRequire.value;
  const combinedString = `请帮我生成一个ppt大纲，主题为：${themeValue}。具体内容要求为：${requireValue}。注意，每个部分用大中小三个层级展示，如1.  1.1.2这种类型`

  connectWebSocket(combinedString);
  activeStep.value = 1
};
const addMessage1 = () => {
  const fixValue = fixRequire.value;

  connectWebSocket(fixValue);
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
let ttsWS
function connectWebSocket(data) {
  status.value = "ttsing";
  return getWebsocketUrl().then((url) => {
    ttsWS = new WebSocket(url);
    ttsWS.onopen = () => {
      webSocketSend(ttsWS, data);
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
function webSocketSend(ws, data) {
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
        text: [{ role: "user", content: data }],
      },
    },
  };
  ws.send(JSON.stringify(params));
}

function result1(resultData) {
  let jsonData = JSON.parse(resultData);
  outputText.value += jsonData.payload.choices.text[0].content;
  const div = document.querySelector('.paragraphs');
  if (div) {
    div.scrollTop = div.scrollHeight;
  }
  if (jsonData.payload && jsonData.payload.usage) {
    activeStep.value = 2
  }
  if (jsonData.header.code !== 0) {
    alert(`提问失败: ${jsonData.header.code}:${jsonData.header.message}`);
  }
}

onMounted(() => {
  connectWebSocket("");
  getBackground();
});
</script>

<template>
  <!-- <div class="center-content">
      <el-input v-model="inputValue" placeholder="请输入内容" class="input"></el-input>
      <el-button type="primary" @click="send">发送</el-button>
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
  <!-- <div class="ai-chat-container">
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
  </div> -->
  <div class="ai-container">
    <el-steps style="max-width:100% " :active="activeStep" align-center>
      <el-step title="开始创作" />
      <el-step title="输入主题" />
      <el-step title="编辑大纲" />
      <el-step title="选择模板" />
      <el-step title="制作PPT" />
    </el-steps>
    <div class="card-box">
      <el-card class="card1" v-if="activeStep == 0">
        <el-tabs v-model="activeName" type="card" class="demo-tabs" @tab-click="handleClick">
          <el-tab-pane label="输入主题与要求" name="first">
            <div style="padding: 20px;">输入主题</div>
            <textarea style="width:100vh" v-model="inputTheme" :rows="3" placeholder="在此输入您的PPT主题..."
              @keydown.enter.exact.prevent="addMessage" @keydown.enter.shift.exact.prevent="inputTheme += '\n'">
          </textarea>
            <div style="padding: 20px;">具体生成要求</div>
            <textarea style="width:100vh" v-model="inputRequire" :rows="3" placeholder="请输入对生成大纲的具体要求，比如要包含那些内容"
              @keydown.enter.exact.prevent="addMessage" @keydown.enter.shift.exact.prevent="inputRequire += '\n'">
          </textarea>
            <div>
              <el-button style="padding:15px" type="primary" @click="addMessage">生成大纲→</el-button>
            </div>
          </el-tab-pane>
          <el-tab-pane label="上传文件并解析" name="second">Config</el-tab-pane>
        </el-tabs>
      </el-card>
      <el-card class="card2" v-if="activeStep == 1">
        <div class="paragraphs">{{ outputText }}</div>
      </el-card>
      <el-card class="card3" v-if="activeStep == 2">
        <div>主题：{{ inputTheme }}</div>
        <div class="paragraphs">{{ outputText }}</div>
        <textarea style="width:100vh" v-model="fixRequire" :rows="3" placeholder="与AI对话，告诉AI您想如何修改"
          @keydown.enter.exact.prevent="outlineCreatePPT" @keydown.enter.shift.exact.prevent="inputRequire += '\n'">
          </textarea>
        <el-button style="padding:15px" type="primary" @click="outlineCreatePPT">下一步→</el-button>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.ai-container {
  height: 85vh;
  width: 140vh;
  background-color: #f5f6f7;
  padding: 20px
}

.card-box {
  margin-top: 50px;
}

.card1 {
  padding: 0;
  width: 100%;
}

.paragraphs {
  white-space: pre-line;
  text-align: left;
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid #000;
  padding: 10px;
}
</style>
