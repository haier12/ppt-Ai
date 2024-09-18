<script setup>
import typewriter from "./typewriter.vue";
import { ref, onMounted } from "vue";
import {
  getBackGround,
  createPPT,
  getProgress,
} from "./util/request.js";
import { uploadDoc, queryDocStatus } from "./util/aichat.js";
import CryptoJS from "crypto-js"

import { getSignature } from "./util/index.js";

let appId = "01ec9aa3";
let secret = "M2QxMDAxMjYyYTEzODMwMGRkZTQ4NmUy";
let apikey = "39d05b269fa229f431a56c21794a8ea5"
let timestamp = Math.floor(Date.now() / 1000);
let signature = getSignature(appId, secret, timestamp);


const outputText = ref("");  // 用于展示的大纲数据
const stagingData = ref([]);  //储存的对话数据，用于多轮对话
const stagOutputText = ref("");  // 暂存大纲用于拆分
let extractedParts = ref([]) // 初步拆分

let firstArray = ref([]); //大纲的大纲等级数字部分
let secondArray = ref([]); //大纲的文字部分

const inputValue = ref("");

const backGroundList = ref([]);

const inputTheme = ref(""); // 输入的主题
const inputRequire = ref("") // 输入的需求
const activeStep = ref(0);  // 上方进度条
const fixRequire = ref("");  // 对话修改大纲
const combined = ref('')  // 修改完毕的大纲数据，准备传入ppt生成模型

const treeData = ref([]);
const outline = ref([]);
const status = ref("init");

const percentage = ref(0);
const selectedKey = ref(null);
const selectedObject = ref({});

const activeName = ref("first");
var timer = null;
let httpUrl = new URL("https://spark-api.xf-yun.com/v3.5/chat");
let modelDomain;

const getBackground = () => {
  treeData.value = [];
  getBackGround().then((res) => {
    console.log(res);
    backGroundList.value = res.data;
  });
};

const getBackgroundColor = (key) => {
  return outlineData.value.theme === key ? '#83e2b6' : '#f5f5f5';
};

const outlineData = ref({
  query: '',  // 用户要求（最多8000字）
  theme: 'auto',  // ppt生成主题
  author: 'AIX平台',
  is_card_note: false,  // 是否自动生成ppt演讲备注
  is_cover_img: false,   // 是否自动生成封面
  is_figure: false,   // 是否自动配图
}
)

// 将输入数据或返回数据存入记忆中
function updateStagingData(role, newData) {
  stagingData.value.push({ role: role, content: newData });
}
//大纲直接生成ppt
const outlineCreatePPT = () => {
  const newOutlineData = { ...outlineData.value, };
  newOutlineData.query = combined.value;

  createPPT(newOutlineData).then((res) => {
    console.log(res, "正在生成中");
    activeStep.value = 4

    const checkProgress = () => {
      getProgress(res.data.sid).then((response) => {
        percentage.value = response.data.process;
        if (response.data && response.data.pptUrl && response.data.pptUrl.length > 4) {
          window.location.href = response.data.pptUrl;
          Elmessage.success("生成成功");
        } else {
          const sleepTime = 2000;
          let remainingTime = sleepTime;
          const intervalId = setInterval(() => {
            remainingTime -= 100;
            if (remainingTime <= 0) {
              clearInterval(intervalId);
              checkProgress();
            }
          }, 100);
        }
      });
    };

    checkProgress();
  })
};

//初次对话
const addMessage = () => {
  const themeValue = inputTheme.value;
  const requireValue = inputRequire.value;
  firstArray.value = []
  secondArray.value = []
  extractedParts.value = []
  stagOutputText.value = ''
  const combinedString = `请帮我生成一个ppt大纲，主题为：${themeValue}。具体内容要求为：${requireValue}。注意，用三个等级大纲展示，如1. 1.1 1.1.2 2. 2.1这种类型，且按照这种顺序，不要有完全相同数字等级的大纲，不要有目录`
  updateStagingData("user", combinedString);
  connectWebSocket(stagingData.value);
  activeStep.value = 1
};

//修改大纲时和ai对话
const fixOutline = () => {
  outputText.value = '';
  firstArray.value = [];
  secondArray.value = [];
  extractedParts.value = []
  stagOutputText.value = ''

  const fixValue = fixRequire.value;
  updateStagingData('user', fixValue)
  activeStep.value = 1
  if (enableButton.value) {
    uploadAndAskMainContent(stagingData.value)
  } else { connectWebSocket(stagingData.value); }
  fixRequire.value = ''
};

// 大纲的拆分
function extractAndRemove() {
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < stagOutputText.value.length; i++) {
    const char = stagOutputText.value[i];
    if (!isNaN(parseInt(char))) {
      startIndex = i;
      break;
    }
  }

  if (startIndex !== -1) {
    for (let j = startIndex; j < stagOutputText.value.length; j++) {
      const char2 = stagOutputText.value[j];
      if (char2 === '\n') {
        endIndex = j;
        break;
      }
    }
  }

  let extractedPart = '';
  if (startIndex !== -1 && endIndex !== -1) {
    extractedPart = stagOutputText.value.slice(startIndex, endIndex).replace(/\n/g, '');
    extractedParts.value.push(extractedPart);
    stagOutputText.value = stagOutputText.value.replace(extractedPart, '');
    return true;
  } else {
    return false;
  }
}

// 开始大纲拆分
function startExtraction() {
  stagOutputText.value = outputText.value
  while (extractAndRemove()) { }

  //将拆分好的大纲的大纲等级和文字部分拆分到两个数组中
  extractedParts.value.forEach(item => {
    const parts = item.split(' ');
    if (parts.length === 2) {
      firstArray.value.push(parts[0]);
      secondArray.value.push({ value: parts[1] });
    }
  })
}

// 拼接修改完毕的大纲
function combineOutline() {
  let tempCombined = '';
  for (let i = 0; i < Math.max(firstArray.value.length, secondArray.value.length); i++) {
    tempCombined += firstArray.value[i] || '';
    tempCombined += secondArray.value[i] ? secondArray.value[i].value : '';
    tempCombined += i < Math.max(firstArray.value.length, secondArray.value.length) - 1 ? ',' : '';
  }

  combined.value = tempCombined;
  fixRequire.value = ''
  activeStep.value = 3
}


let ttsWS
function connectWebSocket(data) {
  outputText.value = "";    //清楚展示部分内容
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
    var apiKey = apikey;
    var apiSecret = secret;
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
      app_id: appId,
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
        text: data,
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
    startExtraction() // 返回完毕后开始拆分大纲
    console.log(firstArray.value, secondArray.value)
    activeStep.value = 2
    updateStagingData("assistant", outputText.value)  //返回数据存入记忆池
  }
  if (jsonData.header.code !== 0) {
    alert(`提问失败: ${jsonData.header.code}:${jsonData.header.message}`);
  }
}


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
const upfileId = ref('');
const docName = ref('')

const docTheme = ref('')  // 文档生成ppt的主题
const docRequire = ref('')  // 文档生成要求

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
  docName.value = file.raw.name
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
    const upfileData = new FormData();
    upfileId.value = response.data.data.fileId;
    upfileData.append("fileIds", upfileId.value);
    askdoc(upfileData);
  } catch (error) {
    console.error(error);
  }
};

//文档状态查询
const askdoc = async (data) => {
  const response = await queryDocStatus(data);
  if (response.data.data && response.data.data.length > 0) {
    let foundVectored = false;
    for (const item of response.data.data) {
      if (item.fileStatus === 'vectored') {
        foundVectored = true;
        break;
      }
    }
    if (foundVectored) {
      enableButton.value = true
    } else {
      const sleepTime = 2000;
      let remainingTime = sleepTime;
      const intervalId = setInterval(() => {
        remainingTime -= 100;
        if (remainingTime <= 0) {
          clearInterval(intervalId);
          askdoc(data);
        }
      }, 100);
    }
  }
};

//文档对话
function chatDoc() {
  const docthemeValue = docTheme.value;
  const docrequireValue = docRequire.value;
  firstArray.value = []
  secondArray.value = []
  extractedParts.value = []
  stagOutputText.value = ''
  const combinedString = `请帮我生成一个ppt大纲，主题为：${docthemeValue}。具体内容要求为：${docrequireValue}。注意，用三个等级大纲展示，如1. 1.1 1.1.2 2. 2.1这种类型，且按照这种顺序，不要有完全相同数字等级的大纲，不要有目录`
  updateStagingData("user", combinedString);
  activeStep.value = 1
  uploadAndAskMainContent(stagingData.value);
}

function chatByDoc(fileId, data) {
  const wsUrl = `wss://chatdoc.xfyun.cn/openapi/chat?fileId=${fileId}&appId=${appId}&timestamp=${timestamp}&signature=${signature}`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    const messageBody = {
      fileIds: [fileId],
      messages: data,
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
    result2(response)
    console.log("WebSocket 消息:", response);
  };

  ws.onerror = (error) => {
    console.error("WebSocket 错误:", error);
  };
}

function result2(resultData) {
  const div = document.querySelector('.paragraphs');
  if (div) {
    div.scrollTop = div.scrollHeight;
  }
  if (resultData.status == 1) {
    outputText.value += resultData.content
  }
  if (resultData.status == 2) {
    startExtraction() // 返回完毕后开始拆分大纲
    activeStep.value = 2
    updateStagingData("assistant", outputText.value)  //返回数据存入记忆池
  }
  if (resultData.code !== 0) {
    alert(`提问失败: ${jsonData.header.code}:${jsonData.header.message}`);
  }
}



//文档上传问题查询
const uploadAndAskMainContent = async (data) => {
  try {
    // const formData = new FormData();
    // formData.append(
    //   "url",
    //   "https://bjcdn.openstorage.cn/xinghuo/chatdocs/2024-09-13/dad35a4f-e7c1-4efc-b6df-cae763cb984b/39052b09-d154-419f-9832-20884adeb2f41726226211177.pdf"
    // );
    // formData.append("fileName", "test.pdf");
    // formData.append("appId", "2ff2cc26");
    // formData.append("secret", "YTMyZWFiOGVlYTc5ZGM5NGIwOTU3NWMx");
    // // formData.append("fileType", "wiki");
    // // formData.append("parseType", "AUTO");

    // const uploadResp = await uploadDoc(formData);
    // const fileId = uploadResp.data.data.fileId;
    const fileId = upfileId.value;
    chatByDoc(fileId, data);

  } catch (error) {
    console.error("上传或提问过程中发生错误:", error);
  }
};
const enableButton = ref(false);

const chooseBackground = (data) => {
  outlineData.value.theme = data
}

const changeCursor = (cursorStyle) => {
  document.documentElement.style.cursor = cursorStyle;
};

onMounted(() => {
  connectWebSocket("");
  getBackground();
});
</script>

<template>
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
        <el-tabs v-model="activeName" type="card" class="demo-tabs">
          <el-tab-pane label="输入主题与要求" name="first">
            <div style="padding: 20px;">输入主题</div>
            <textarea style="width:50vw" v-model="inputTheme" :rows="3" placeholder="在此输入您的PPT主题..."
              @keydown.enter.exact.prevent="addMessage" @keydown.enter.shift.exact.prevent="inputTheme += '\n'">
          </textarea>
            <div style="padding: 20px;">具体生成要求</div>
            <textarea style="width:50vw" v-model="inputRequire" :rows="3" placeholder="请输入对生成大纲的具体要求，比如要包含那些内容"
              @keydown.enter.exact.prevent="addMessage" @keydown.enter.shift.exact.prevent="inputRequire += '\n'">
          </textarea>
            <div>
              <el-button style="padding:15px" type="primary" @click="addMessage">生成大纲→</el-button>
            </div>
          </el-tab-pane>
          <el-tab-pane label="上传文件并解析" name="second">
            <el-upload action="#" :on-change="onFileChange" :before-upload="beforeUpload" :show-file-list="false">
              <el-button type="primary">点击上传并解析文件</el-button>
              <text>(支持 doc/docx、pdf、md、txt 格式文档,不超过 20M,不超过 100W 字符)</text>
            </el-upload>
            <br/>
            <div v-if="enableButton">{{docName}}文档已解析完毕</div>
            <br/>
            <div style="padding: 20px;">输入主题</div>
            <textarea style="width:50vw" v-model="inputTheme" :rows="3" placeholder="在此输入您的PPT主题..."
              @keydown.enter.shift.exact.prevent="inputTheme += '\n'">
          </textarea>
            <div style="padding: 20px;">具体生成要求</div>
            <textarea style="width:50vw; margin:20px" v-model="docRequire" :rows="3"
              placeholder="请输入对生成大纲的具体要求，比如要包含那些内容" @keydown.enter.shift.exact.prevent="inputRequire += '\n'">
          </textarea>
            <div>
              <el-button style="padding:15px" type="primary" :disabled="!enableButton"
                @click="chatDoc">生成大纲→</el-button>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
      <el-card class="card2" v-if="activeStep == 1">
        <div class="paragraphs">{{ outputText }}</div>
      </el-card>
      <el-card class="card3" v-if="activeStep == 2">
        <div class="outline">
          <el-row :gutter="20" class="outline-row">
            <el-col :span="8">
              <div v-for="item in firstArray" :key="item" class="item-with-dash">{{ item }}</div>
            </el-col>
            <el-col :span="16">
              <div v-for="(item, index) in secondArray" :key="index">
                <el-input v-model="item.value"></el-input>
              </div>
            </el-col>
          </el-row>
        </div>
        <textarea style="width:50vw" v-model="fixRequire" :rows="3" placeholder="与AI对话，告诉AI您想如何修改"
          @keydown.enter.exact.prevent="fixOutline" @keydown.enter.shift.exact.prevent="inputRequire += '\n'">
          </textarea>
        <br />
        <el-button v-if="fixRequire.length > 0" style="padding:15px" type="primary"
          @click="fixOutline()">发送修改</el-button>
        <el-button style="padding:15px" type="primary" @click="combineOutline()">下一步→</el-button>
      </el-card>
      <el-card v-if="activeStep == 3">
        <div style="padding: 10px">ppt模板选择</div>
        <div class="themes">
          <div v-for="item in backGroundList" :key="item.key" :style="{
            padding: '20px',
            paddingRight: '30px',
            paddingLeft: '30px',
            margin: '10px',
            backgroundColor: getBackgroundColor(item.key),
            borderRadius: '10px',
            borderBlock: '10px solid #e6e6e6'
          }" @click="chooseBackground(item.key)" @mouseenter="changeCursor('pointer')" @mouseleave="changeCursor('default')">
            {{ item.name }}
            <br />
            <img style="width: 150px; height: auto" :src="item.thumbnail" alt="" />
          </div>
        </div>
        <el-row class="el-row">
          <el-col :span="6" class="el-col">
            <div class="grid-content-1">
              <div>演讲备注</div>
              <el-switch v-model="outlineData.is_card_note" />
            </div>
          </el-col>
          <el-col :span="6" class="el-col">
            <div class="grid-content-2">
              <div>生成封面</div>
              <el-switch v-model="outlineData.is_cover_img" />
            </div>
          </el-col>
          <el-col :span="6" class="el-col">
            <div class="grid-content-1">
              <div>自动配图</div>
              <el-switch v-model="outlineData.is_figure" />
            </div>
          </el-col>
          <el-col :span="6" class="el-col">
            <div class="grid-content-2">
              <div>PPT作者名：</div>
              <el-input v-model="outlineData.author" style="width: 50%" />
            </div>
          </el-col>
        </el-row>
        <div>
          <el-button style="padding:15px" type="primary" @click="outlineCreatePPT()">生成PPT</el-button>
        </div>
      </el-card>
      <el-card v-if="activeStep == 4">
        <el-progress :percentage="30" type="circle" v-if="percentage == 30"></el-progress>
        <el-progress :percentage="70" type="circle" v-if="percentage == 70"></el-progress>
        <el-progress :percentage="100" type="circle" v-if="percentage == 100"></el-progress>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.ai-container {
  height: 85vh;
  width: 60vw;
  background-color: #f5f7f6;
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
  white-space: pre-wrap;
  text-align: left;
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid #000;
  padding: 10px;
  margin: 5px
}

.themes {
  display: flex;
  flex-wrap: wrap;
  max-height: 50vh;
  overflow-y: auto;
}

.outline {
  white-space: pre-wrap;
  text-align: left;
  max-height: 50vh;
  overflow-y: auto;
  border: 1px solid #000;
  padding: 10px;
  margin: 5px
}

.outline-row {
  display: flex;
}

.outline-row>.el-col {
  display: flex;
  flex-direction: column
}

.outline-row>.el-col>div,
.outline-row>.el-col>div>.el-input {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 3px;
}

.item-with-dash {
  margin-left: 100px
}

.item-with-dash::after {
  content: "";
  border-bottom: 1px dashed #000;
  flex-grow: 1;
  margin-left: 4px;
}

.grid-content-1 {
  border-radius: 4px;
  background-color: #c2dbf3;
}

.grid-content-2 {
  border-radius: 4px;
  background-color: #f5f5f5;
}

.el-row {
  padding: 20px
}
</style>
