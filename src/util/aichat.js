import axios from 'axios'
import { getSignature } from "./index";


let appId = "a3c84da2";
let secret = "OTZkZDdhNDQ4MDk0NTZiYjcyY2RjZmYz";
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
