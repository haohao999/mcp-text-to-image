#!/usr/bin/env node

// src/index.js - MCP CLI Tool (不是 HTTP 服务！)

import axios from 'axios';
import { parse } from 'querystring';
import { URL } from 'url';

// 从环境变量读取密钥
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

if (!DASHSCOPE_API_KEY) {
  console.error('❌ 错误：请在 .env 或 MCP 配置中设置 DASHSCOPE_API_KEY');
  process.exit(1);
}

// 缓冲区，用于拼接可能分段的 stdin 数据
let inputBuffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  inputBuffer += chunk;

  // 按行解析（MCP 消息通常是逐行 JSON）
  const lines = inputBuffer.trim().split('\n');
  inputBuffer = ''; // 清空缓冲

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const message = JSON.parse(line);
      handleRequest(message);
    } catch (err) {
      console.error('❌ 无法解析 stdin 消息:', err, '原始数据:', line);
    }
  }
});

// 处理 MCP 请求
async function handleRequest(message) {
  const { id, method, params } = message;

  // 只响应 generate_image 方法
  if (method !== 'generate_image') {
    returnResponse(id, null, {
      code: -32601,
      message: 'Method not found'
    });
    return;
  }

  let prompt = params?.prompt?.trim() || '一只猫';
  
  // 尝试解码（兼容编码过的中文）
  try {
    prompt = decodeURIComponent(prompt);
  } catch (e) {
    // 保持原样
  }

  console.error(`[MCP] 收到图像生成请求: ${prompt}`);

  try {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-image/generation',
      {
        model: 'wanx-v1',
        input: { prompt },
        parameters: { n: 1, size: '1024*1024' }
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const imageUrl = response.data.output.results[0].url;
    console.error(`[API] 图像生成成功: ${imageUrl}`);

    returnResponse(id, { image_url: imageUrl }, null);
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error('[API] 调用失败:', errorMsg);

    returnResponse(id, null, {
      code: -32000,
      message: '图像生成失败',
      data: errorMsg
    });
  }
}

// 统一返回响应（通过 stdout 输出 JSON）
function returnResponse(id, result, error) {
  const response = { jsonrpc: '2.0', id };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  console.log(JSON.stringify(response));
}

// 启动日志（输出到 stderr，不影响 stdout 的 JSON 通信）
console.error('✅ MCP TextToImage 服务已启动，等待 stdin 输入...');
