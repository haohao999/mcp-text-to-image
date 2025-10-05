#!/usr/bin/env node
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const API_KEY = process.env.DASHSCOPE_API_KEY;
const PORT = process.env.PORT || 3000;
const TARGET_URL = "https://dashscope.aliyuncs.com/api/v1/mcps/TextToImage/sse";

if (!API_KEY) {
  console.error("❌ Error: Environment variable DASHSCOPE_API_KEY is required.");
  process.exit(1);
}

app.post("/generate", async (req, res) => {
  const { prompt, model = "wanxiang-v1" } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  console.log(`🖼️  Received prompt: ${prompt}`);

  try {
    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: { prompt }
      })
    });

    // 转发 SSE 响应
    res.setHeader("Content-Type", "text/event-stream");
    response.body.pipe(res);
  } catch (err) {
    console.error("🚨 Error calling DashScope API:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ MCP TextToImage server running on port ${PORT}`);
});
