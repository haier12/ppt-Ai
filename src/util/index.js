import CryptoJS from 'crypto-js';

// 生成签名的主方法
export function getSignature(appId, secret, ts) {
    try {
        const auth = md5(appId + ts);
        return hmacSHA1Encrypt(auth, secret);
    } catch (error) {
        console.error('Error generating signature:', error);
        return null;
    }
}

// MD5 加密
function md5(cipherText) {
    try {
        return CryptoJS.MD5(cipherText).toString(); // 使用 CryptoJS 进行 MD5 加密
    } catch (error) {
        console.error('Error in MD5 hashing:', error);
        return null;
    }
}

// HMAC-SHA1 加密
function hmacSHA1Encrypt(encryptText, encryptKey) {
    try {
        // 使用 CryptoJS 进行 HMAC-SHA1 加密，并转换为 Base64 格式
        return CryptoJS.HmacSHA1(encryptText, encryptKey).toString(CryptoJS.enc.Base64);
    } catch (error) {
        console.error('Error in HMAC-SHA1 encryption:', error);
        return null;
    }
}
