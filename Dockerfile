FROM node:20-slim

WORKDIR /app/server

# 仅复制 package.json，利用 better-sqlite3 官方预编译二进制安装（无需宿主编译工具）
COPY server/package.json /app/server/package.json

RUN npm config set registry https://registry.npmmirror.com \
    && npm install --omit=dev \
    && npm cache clean --force

# 后端代码与前端静态文件
COPY server/index.js /app/server/index.js
COPY index.html /app/server/public/index.html

ENV NODE_ENV=production
ENV PORT=3001
ENV STATIC_DIR=/app/server/public

EXPOSE 3001
VOLUME ["/app/server/data"]

CMD ["node", "index.js"]
