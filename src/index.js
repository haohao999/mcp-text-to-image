#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// 导入 MCP SDK 中的 Server 类，用于创建 MCP 服务器

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// 导入 StdioServerTransport，用于通过标准输入输出与 MCP 客户端通信
import axios from "axios";

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_API_KEY) {
  console.error("❌ 错误: 没有检测到 DASHSCOPE_API_KEY");
  process.exit(1);
}

// 创建 MCP 服务器
const server = new StdioServer({
  name: "textToImage",
  version: "1.0.0",
  capabilities: {
    tools: true,
  },
});

// 注册文生图工具
server.addTool(
  {
    name: "generateImage",
    description: "根据中文描述生成一张图片",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "图片的中文描述",
        },
      },
      required: ["prompt"],
    },
  },
  async (params, context) => {
    const prompt = params.prompt;
    console.error(`[MCP] 收到生成请求: ${prompt}`);

    try {
      const response = await axios.post(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-image/generation",
        {
          model: "wanx-v1",
          input: { prompt },
          parameters: { n: 1, size: "1024*1024" },
        },
        {
          headers: {
            Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const imageUrl = response.data.output.results[0].url;
      console.error(`[API] 图像生成成功: ${imageUrl}`);

      return {
        image_url: imageUrl,
        alt: prompt,
      };
    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      console.error("[API] 调用失败:", errorMsg);
      throw new Error(`图像生成失败: ${JSON.stringify(errorMsg)}`);
    }
  }
);

// 启动服务器（阻塞，通过 stdio 通信）
console.error("✅ MCP TextToImage 服务已启动 (stdio 模式)");
console.error("📌 等待 MCP 客户端调用 generateImage 工具...");

await server.start();
