import axios from 'axios'
import { getSignature } from "./index";


let appId = "2ff2cc26";
let secret = "YTMyZWFiOGVlYTc5ZGM5NGIwOTU3NWMx";
let timestamp = Math.floor(Date.now() / 1000);
let signature = getSignature(appId, secret, timestamp);

export function text2Text(data) {
    return axios({
        url: "v1/chat/completions",
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer yjCwlZCeUtBYvjHAQZdk:FtWNmJSWcZMCmTBQZfoH',
            'Accept': '*/*'
        },
        data: {
            'model': '4.0Ultra',
            'messages': data,
            'stream': false
        }
    })
}
export function uploadDoc(data) {
    return axios({
        url: "openapi/v1/file/upload",
        method: 'post',
        headers: {
            "Content-Type": "multipart/form-data",
            appId: appId,
            timestamp: timestamp,
            signature: signature,
        },
        data: data
    })
}
export function queryDocStatus(data) {
    return axios({
        url: "openapi/v1/file/status",
        method: 'post',
        headers: {
            "Content-Type": "application/form-data",
            appId: appId,
            timestamp: timestamp,
            signature: signature,
        },
        data: data
    })
}
export function chatByDoc(fileId, question) {


    // 将请求头信息通过 URL 参数传递
    const wsUrl = `wss://chatdoc.xfyun.cn/openapi/chat?fileId=${fileId}&appId=${appId}&timestamp=${timestamp}&signature=${signature}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        // 构造发送的消息体
        const messageBody = {
            "fileIds": [fileId],  // 文件ID列表
            "messages": [
                {
                    "role": "user",
                    "content": '这段文章讲了什么'  // 用户输入的问题
                }
            ],  // 必填字段，包含用户问题
            "chatExtends": {
                "wikiPromptTpl": "请将以下内容作为已知信息：\n<wikicontent>\n请根据以上内容回答用户的问题。\n问题:<wikiquestion>\n回答:",  // 自定义Wiki Prompt模板
                "wikiFilterScore": 0.82,  // 可选字段，Wiki结果过滤分数阈值
                "temperature": 0.5,  // 可选字段，模型回答的随机性
                "sparkWhenWithoutEmbedding": false  // 是否使用大模型兜底
            }
        };

        // 发送消息
        ws.send(JSON.stringify(messageBody));
    };

    // 接收到服务器的响应时
    ws.onmessage = (event) => {
        const response = JSON.parse(event.data);  // 解析响应消息
        console.log("WebSocket 消息:", response);
        // ws.close();  // 完成后关闭连接
    };

    // 错误处理
    ws.onerror = (error) => {
        console.error("WebSocket 错误:", error);
    };
}



// export function chatByDoc(fileId, question) {
//     const ws = new WebSocket(
//         `wss://chatdoc.xfyun.cn/openapi/chat?fileId=${fileId}&appId=2ff2cc26&secret=YTMyZWFiOGVlYTc5ZGM5NGIwOTU3NWMx`
//       );
  
//       ws.onopen = () => {
//         ws.send(JSON.stringify({ question }));
//       };
  
//       ws.onmessage = (event) => {
//         console.log("WebSocket 消息:", event);
//         ws.close();
//       };
  
//       ws.onerror = (error) => {
//         console.error("WebSocket 错误:", error);
//       };
// }
