# 部署手册

> 本文档仅记录线上环境 **日期倒计时** 的部署细节，详细的产品与接口规范见 [README.md](./README.md)。

## 1. 线上拓扑

```
用户浏览器
    │  HTTPS (443)
    ▼
Nginx（Let's Encrypt 证书 + 反向代理）
    │  location /dajishi/  →  http://127.0.0.1:3001/
    ▼
Docker 容器 daojishi
    │  Node.js + Express + better-sqlite3
    ▼
/app/server/data/countdowns.db   ←  宿主卷：/srv/daojishi/data/
```

- **线上地址**：https://www.luliming.xyz/dajishi
- **服务器**：腾讯云轻量应用服务器（广州区，`lhins-gd7emk5l`）
- **容器名**：`daojishi`，对外端口 `3001`
- **Nginx 配置**：`/etc/nginx/conf.d/luliming.conf`（片段见 README §10.3）

## 2. 首次部署

```bash
# 1. 将项目上传到服务器
scp -r ./ root@<host>:/root/daojishi/

# 2. 构建并运行
ssh root@<host>
cd /root/daojishi
docker build -t daojishi .
mkdir -p /srv/daojishi/data
docker run -d --name daojishi \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /srv/daojishi/data:/app/server/data \
  daojishi

# 3. 配置 Nginx 子路径反代（见 README §10.3），然后：
nginx -t && systemctl reload nginx

# 4. 开放防火墙（若直接用 IP:3001 调试）
# 腾讯云轻量：控制台或 lighthouse create_firewall_rules 放行 3001/TCP
```

## 3. 日常更新

### 3.1 仅前端改动（index.html）
```bash
# 最快路径：直接把新 index.html 拷到容器
docker cp index.html daojishi:/app/server/public/index.html
# 无需重启
```

### 3.2 后端或依赖变更
```bash
# 重建镜像并替换容器
docker build -t daojishi .
docker rm -f daojishi
docker run -d --name daojishi \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /srv/daojishi/data:/app/server/data \
  daojishi
```

> 数据库位于宿主卷 `/srv/daojishi/data`，容器重建不会丢失用户数据。

## 4. 回滚

```bash
# Nginx 配置回滚
cp /etc/nginx/conf.d/luliming.conf.bak.<TS> /etc/nginx/conf.d/luliming.conf
nginx -t && systemctl reload nginx

# 容器回滚到旧镜像（假设之前打过 tag）
docker rm -f daojishi
docker run -d --name daojishi ... daojishi:<old-tag>
```

## 5. 健康检查

```bash
# 容器直连
curl -s http://127.0.0.1:3001/api/health

# 域名 HTTPS
curl -s https://www.luliming.xyz/dajishi/api/health
# 期望：{"status":"ok"}
```

## 6. 常见问题

| 现象 | 排查 |
|------|------|
| 访问 `/dajishi/` 返回 502 | `docker ps` 确认容器在跑；`docker logs daojishi` 看错误 |
| 登录成功但刷新又变匿名 | 浏览器 `localStorage.token` 是否被清理；`/api/auth/me` 是否 401（Token 过期） |
| 拖拽排序不生效 | 登录态检查 `/api/countdowns/sync` 返回；匿名态清一下 `localStorage.countdowns` 看是否被坏数据卡住 |
| 数据库损坏 | 停容器 → 备份 `/srv/daojishi/data/countdowns.db` → `sqlite3 countdowns.db "PRAGMA integrity_check;"` |
