// mcp-text-to-image.js
import http from 'http';
import url from 'url';
import qs from 'querystring';
import axios from 'axios';

const DASHSCOPE_API_KEY = 'sk-4da297769ee546fe9b0a59c0b20d6187';

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);

  if (pathname === '/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const query = qs.parse(url.parse(req.url).query);
    let prompt = query.prompt || '一只猫';

    try {
      prompt = decodeURIComponent(prompt);
    } catch (e) {
      console.warn('Failed to decode prompt, using raw:', prompt);
    }

    console.log(`[SSE] 收到中文 Prompt: ${prompt}`);
    res.write(`data: ${JSON.stringify({ status: 'generating', prompt })}\n\n`);

    axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-image/generation',
      {
        model: 'wanx-v1',
        input: { prompt: prompt },
        parameters: { n: 1, size: '1024*1024' }
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    .then(response => {
      const imageUrl = response.data.output.results[0].url;
      console.log(`[API] 图像生成成功: ${imageUrl}`);
      res.write(`data: ${JSON.stringify({ image_url: imageUrl })}\n\n`);
      res.end();
    })
    .catch(error => {
      const errorMsg = error.response?.data || error.message;
      console.error('[API] 调用失败:', errorMsg);
      res.write(`data: ${JSON.stringify({ error: '图像生成失败', details: errorMsg })}\n\n`);
      res.end();
    });
  } else {
    res.writeHead(404).end('Not Found');
  }
});

const PORT = 30681;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MCP TextToImage 服务已启动：http://localhost:${PORT}/sse`);
  console.log(`📌 使用方式: /sse?prompt=你的中文描述`);
});