import http from 'http';
import url from 'url';
import qs from 'querystring';
import axios from 'axios';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_API_KEY) {
  console.error("❌ 没有检测到 DASHSCOPE_API_KEY，请在 mcp-gateway 配置里设置 env");
  process.exit(1);
}

const PORT = process.env.PORT || 30681;

const server = http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url);
  if (pathname === '/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const params = qs.parse(query);
    let prompt = params.prompt || '一只猫';

    try {
      prompt = decodeURIComponent(prompt);
    } catch (e) {
      console.warn('⚠️ Prompt decode 失败, 使用原始值:', prompt);
    }

    console.log(`[SSE] 收到 Prompt: ${prompt}`);
    res.write(`data: ${JSON.stringify({ status: 'generating', prompt })}\n\n`);

    // 心跳保持 SSE
    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 15000);

    axios.post(
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
        },
        timeout: 60000
      }
    )
    .then(response => {
      const imageUrl = response.data.output.results[0].url;
      console.log(`[API] 成功生成图像: ${imageUrl}`);
      res.write(`data: ${JSON.stringify({ image_url: imageUrl })}\n\n`);
      res.end();
    })
    .catch(error => {
      const errorMsg = error.response?.data || error.message;
      console.error('[API] 调用失败:', errorMsg);
      res.write(`data: ${JSON.stringify({ error: '图像生成失败', details: errorMsg })}\n\n`);
      res.end();
    })
    .finally(() => clearInterval(heartbeat));

  } else {
    res.writeHead(404).end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 文生图 MCP 服务已启动: http://localhost:${PORT}/sse`);
  console.log(`📌 使用方式: /sse?prompt=你的描述`);
});
