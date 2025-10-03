# Dockerfile
# 使用官方 Node.js 18 Alpine 镜像（轻量）
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果有)
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源码
COPY src/ src/
COPY .env.example .env  # 可选：复制示例，用户仍需挂载 .env

# 暴露默认端口
EXPOSE 30681

# 声明启动命令（可被 docker run 覆盖）
CMD ["node", "src/index.js"]