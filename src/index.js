#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/sse.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_API_KEY) {
  console.error("❌ 请在 .env 文件中配置 DASHSCOPE_API_KEY");
  process.exit(1);
}

// 定义工具
const textToImageTool = {
  name: "text-to-image",
  description: "输入中文 prompt，生成图像 URL",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "需要生成图像的中文描述"
      }
    },
    required: ["prompt"]
  }
};

// 启动 MCP Server
const server = new Server({
  name: "mcp-text-to-image",
  version: "1.0.0",
  tools: [textToImageTool]
});

// 实现工具逻辑
server.tool("text-to-image", async ({ prompt }) => {
  console.log(`[MCP] 收到 prompt: ${prompt}`);

  try {
    const response = await axios.post(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-image/generation",
      {
        model: "wanx-v1",
        input: { prompt },
        parameters: { n: 1, size: "1024*1024" }
      },
      {
        headers: {
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const imageUrl = response.data.output.results[0].url;
    console.log(`[MCP] 图像生成成功: ${imageUrl}`);

    return {
      content: [
        { type: "text", text: imageUrl }
      ]
    };
  } catch (error) {
    console.error("[MCP] 调用失败:", error.response?.data || error.message);
    return {
      content: [
        { type: "text", text: "图像生成失败: " + (error.response?.data || error.message) }
      ],
      isError: true
    };
  }
});

// 监听 stdin/stdout（SSE 模式）
server.listen();
