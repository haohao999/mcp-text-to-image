#!/usr/bin/env node
import axios from "axios";

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_API_KEY) {
  console.error("❌ 错误: 没有检测到 DASHSCOPE_API_KEY，请在 mcp-gateway 配置里设置 env");
  process.exit(1);
}

process.stdin.setEncoding("utf-8");

// 🚀 一启动就告诉 mcp-gateway：我准备好了
process.stdout.write(`data: ${JSON.stringify({ status: "ready" })}\n\n`);

console.error("✅ MCP TextToImage 服务已启动 (stdio-sse 模式)");
console.error("📌 等待 mcp-gateway 输入 prompt...");

process.stdin.on("data", async (chunk) => {
  let input;
  try {
    input = JSON.parse(chunk.trim());
  } catch (err) {
    console.error("❌ 无法解析输入:", chunk);
    return;
  }

  const prompt = input.prompt || "一只猫";
  console.error(`[SSE] 收到中文 Prompt: ${prompt}`);

  // 通知开始生成
  process.stdout.write(
    `data: ${JSON.stringify({ status: "generating", prompt })}\n\n`
  );

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

    // 输出 SSE 格式事件
    process.stdout.write(
      `data: ${JSON.stringify({ image_url: imageUrl })}\n\n`
    );
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error("[API] 调用失败:", errorMsg);

    process.stdout.write(
      `data: ${JSON.stringify({ error: "图像生成失败", details: errorMsg })}\n\n`
    );
  }
});
