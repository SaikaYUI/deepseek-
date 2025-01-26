const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// 替换为你的企业微信配置
const CORP_ID = 'your_corp_id'; // 企业 ID
const AGENT_ID = 'your_agent_id'; // 应用 AgentId
const SECRET = 'your_secret'; // 应用 Secret
const TOKEN = 'your_token'; // 接收消息的 Token
const ENCODING_AES_KEY = 'your_encoding_aes_key'; // 接收消息的 EncodingAESKey

// 替换为你的 DeepSeek API Key
const DEEPSEEK_API_KEY = 'sk-b0aff12f0efb4528a84e9000c889e0e5';

// 获取企业微信的 Access Token
async function getAccessToken() {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID}&corpsecret=${SECRET}`;
  const response = await axios.get(url);
  return response.data.access_token;
}

// 调用 DeepSeek API
async function callDeepSeek(text) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      messages: [{ role: 'user', content: text }],
      model: 'deepseek-chat',
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
}

// 验证消息签名
function verifySignature(signature, timestamp, nonce, echostr) {
  const str = [TOKEN, timestamp, nonce].sort().join('');
  const hash = crypto.createHash('sha1').update(str).digest('hex');
  return hash === signature;
}

// 处理企业微信回调
app.get('/wechat', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  if (verifySignature(signature, timestamp, nonce, echostr)) {
    res.send(echostr);
  } else {
    res.status(403).send('Invalid signature');
  }
});

// 处理企业微信消息
app.post('/wechat', async (req, res) => {
  const { FromUserName, Content, MsgType, ChatId } = req.body;

  // 只处理文本消息
  if (MsgType === 'text') {
    const response = await callDeepSeek(Content);

    // 回复消息
    const accessToken = await getAccessToken();
    const replyUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`;
    const replyData = {
      chatid: ChatId, // 群聊 ID
      msgtype: 'text',
      text: { content: response },
    };
    await axios.post(replyUrl, replyData);
  }

  res.send('success');
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务已启动，监听端口 ${PORT}`);
});
