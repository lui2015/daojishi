# 日期倒计时 - 产品需求文档（PRD）

## 1. 项目概述

| 项目 | 说明 |
|------|------|
| **产品名称** | 日期倒计时 |
| **版本** | V3.0 |
| **产品类型** | Web 应用（前后端同端口，支持匿名本地模式 + 登录云同步） |
| **目标平台** | PC 浏览器、移动端浏览器 |
| **前端技术栈** | 纯 HTML + CSS + JavaScript（单文件 SPA，零构建） |
| **后端技术栈** | Node.js 20 + Express 5 + SQLite（better-sqlite3 WAL 模式） |
| **部署形态** | Docker 单容器；支持 IP 直连与 Nginx 子路径反代 |
| **仓库地址** | https://github.com/lui2015/daojishi |
| **线上地址** | https://www.luliming.xyz/dajishi |

## 2. 产品背景与目标

### 2.1 背景
用户在日常生活和工作中经常需要关注重要日期的剩余时间（节假日、生日、纪念日、项目截止日、考试等），既希望**零门槛即开即用**，又希望在多设备间保留进度。现有工具要么过重，要么无云同步。

### 2.2 目标
打造一款**简洁美观、双模驱动**的日期倒计时工具：

- 未登录即用：数据保存在 `localStorage`，开箱即用
- 登录可同步：账号登录后数据写入云端 SQLite，多设备一致
- 支持**自然日 / 工作日**两种倒计时口径
- 支持卡片**拖拽排序**、个性化图标与主题
- 响应式适配桌面与移动端

## 3. 用户画像

| 用户类型 | 使用场景 |
|----------|----------|
| 普通个人用户 | 记录生日、纪念日、节假日倒计时 |
| 学生 | 考试倒计时、假期倒计时 |
| 职场人士 | 项目截止日（按工作日计算）、会议倒计时 |
| 活动策划者 | 活动开始/结束倒计时 |

## 4. 功能需求

### 4.1 首页展示

| 编号 | 功能项 | 优先级 | 说明 |
|------|--------|--------|------|
| F-001 | 页面标题 | P0 | 显示"日期倒计时"标题及副标题"记录每一个重要时刻" |
| F-002 | 添加按钮 | P0 | 页面中部显示"+ 添加倒计时"按钮，点击弹出新增表单 |
| F-003 | 卡片列表 | P0 | 以卡片网格形式展示所有倒计时，响应式自适应排列 |
| F-004 | 空状态提示 | P1 | 无倒计时数据时显示引导提示 |
| F-005 | 登录入口 | P0 | 页面右上角显示当前账号状态（未登录 / 用户名），点击可打开登录/注册面板或退出登录 |

### 4.2 账号系统（V3 新增）

| 编号 | 功能项 | 优先级 | 说明 |
|------|--------|--------|------|
| F-050 | 注册 | P0 | 用户名 3-20 位（字母/数字/下划线），密码 6-64 位；可选显示名；注册成功自动登录 |
| F-051 | 登录 | P0 | 用户名 + 密码；登录成功下发 Bearer Token（有效期 30 天）并在浏览器持久化 |
| F-052 | 退出登录 | P0 | 销毁服务端会话并清空本地 Token |
| F-053 | 会话自动续期 | P1 | 每次启动刷新 `/api/auth/me`，过期 Token 自动清理 |
| F-054 | 匿名 → 登录数据合并 | P1 | 登录时若本地存在匿名数据，允许一键上传合并到云端 |

### 4.3 倒计时卡片

| 编号 | 功能项 | 优先级 | 说明 |
|------|--------|--------|------|
| F-010 | 事件信息展示 | P0 | 显示事件 emoji 图标、名称、目标日期 |
| F-011 | 实时倒计时 | P0 | 显示距离目标日期的 天:时:分:秒，每秒实时更新 |
| F-012 | 秒针动画 | P0 | 秒数变化时触发翻转动画效果，视觉流畅 |
| F-013 | 到期标识 | P1 | 目标日期已过时显示"已到期"标签，卡片整体降低透明度 |
| F-014 | 编辑按钮 | P0 | 卡片底部"编辑"按钮，点击弹出编辑表单 |
| F-015 | 删除按钮 | P0 | 卡片底部"删除"按钮，点击弹出二次确认 |
| F-016 | 拖拽排序 | P1 | 桌面端鼠标按住卡片拖拽、移动端长按拖拽，松开后顺序持久化（登录态写入云端，未登录写入本地） |
| F-017 | 工作日模式标签 | P1 | 工作日模式卡片上显示"工作日"角标，数值仅统计周一至周五 |

### 4.4 新增/编辑倒计时

| 编号 | 功能项 | 优先级 | 说明 |
|------|--------|--------|------|
| F-020 | 事件名称 | P0 | 文本输入框，最大 20 字符，必填 |
| F-021 | 目标日期 | P0 | 日期时间选择器（datetime-local），必填 |
| F-022 | 图标选择 | P1 | 提供 12 个预设 emoji 图标供选择 |
| F-023 | 主题选择 | P1 | 提供 6 种卡片配色主题供选择 |
| F-024 | 表单验证 | P0 | 必填项未填时输入框抖动 + 红色边框提示 |
| F-025 | 保存 | P0 | 点击"确定"保存数据，关闭弹窗，刷新列表 |
| F-026 | 取消 | P0 | 点击"取消"或点击遮罩层关闭弹窗，不保存 |
| F-027 | 日期口径选择 | P1 | 选择「自然日」或「工作日」，决定倒计时天数计算口径 |

### 4.5 删除倒计时

| 编号 | 功能项 | 优先级 | 说明 |
|------|--------|--------|------|
| F-030 | 二次确认 | P0 | 弹出确认弹窗："确定要删除这个倒计时吗？" |
| F-031 | 确认删除 | P0 | 点击"删除"移除数据并刷新列表 |
| F-032 | 取消删除 | P0 | 点击"取消"或遮罩层关闭弹窗 |

### 4.6 数据持久化

| 编号 | 功能项 | 优先级 | 说明 |
|------|--------|--------|------|
| F-040 | 本地存储（匿名态） | P0 | 使用 `localStorage` 存储倒计时数据及排序，刷新/离线不丢失 |
| F-041 | 默认数据 | P2 | 首次访问时预置示例倒计时（元旦、春节、国庆节） |
| F-042 | 数据校验 | P1 | 启动时校验本地数据完整性，损坏数据自动清除 |
| F-043 | 云端同步（登录态） | P0 | 所有增删改查与排序通过 HTTP API 写入服务端 SQLite，多设备一致 |
| F-044 | 用户偏好 | P2 | 主题/默认日期口径等偏好存入 `user_preferences` 表，按设备或按账号区分 |

## 5. 非功能需求

### 5.1 视觉设计

| 编号 | 需求项 | 说明 |
|------|--------|------|
| NF-001 | 整体风格 | 深色渐变背景（深紫色调），现代感设计 |
| NF-002 | 卡片主题 | 6 种渐变配色：粉色、橙色、蓝色、紫色、绿色、红色 |
| NF-003 | 动画效果 | 包含：卡片入场动画、秒针翻转动画、冒号闪烁动画、背景粒子浮动、脉冲指示灯、卡片光晕旋转、拖拽跟随与落点占位 |
| NF-004 | 弹窗设计 | 毛玻璃遮罩 + 深色弹窗，带入场缩放动画 |

### 5.2 图标列表

提供以下 12 个预设 emoji 图标：

🎉 🎂 ❤️ 🏖️ 🎓 💼 ✈️ 🎄 🌙 ⭐ 🏆 🎵

### 5.3 性能要求

| 编号 | 需求项 | 说明 |
|------|--------|------|
| NF-010 | 实时刷新 | 使用 `requestAnimationFrame` 实现流畅的秒级更新 |
| NF-011 | 首屏加载 | 单文件 HTML 内联 CSS/JS，无外部依赖，首屏 < 1s |
| NF-012 | 内存占用 | 背景粒子数量控制在 30 个以内 |
| NF-013 | API 时延 | 本地 SQLite + WAL，单请求 < 20ms（P50） |

### 5.4 兼容性

| 编号 | 需求项 | 说明 |
|------|--------|------|
| NF-020 | 浏览器兼容 | Chrome、Safari、Firefox、Edge 最新版本 |
| NF-021 | 响应式布局 | 适配桌面端（多列网格）和移动端（单列布局） |
| NF-022 | 断点 | 768px 以下切换为移动端样式 |
| NF-023 | 部署灵活性 | 前端自动识别当前子路径作为 `API_BASE` 前缀，可同时支持根路径与 Nginx 子路径部署 |

### 5.5 安全

| 编号 | 需求项 | 说明 |
|------|--------|------|
| NF-030 | 密码存储 | salt + SHA-256（每用户独立 16 字节 salt） |
| NF-031 | 会话机制 | 32 字节随机 Token，30 天 TTL，过期自动清理 |
| NF-032 | 传输加密 | 线上走 HTTPS（Let's Encrypt），反代由 Nginx 终结 |
| NF-033 | 数据隔离 | 所有倒计时读写都带 `user_id` 条件，避免越权 |

## 6. 交互流程

### 6.1 新增倒计时
```
点击"+ 添加倒计时"
  → 填写名称、日期、图标、主题、日期口径（自然日/工作日）
  → 点击"确定"
    → 匿名态：写入 localStorage
    → 登录态：POST /api/countdowns
    → 刷新卡片列表
```

### 6.2 编辑倒计时
```
点击卡片"编辑"
  → 回填当前字段
  → 点击"确定"
    → 匿名态：更新 localStorage
    → 登录态：PUT /api/countdowns/:id
```

### 6.3 删除倒计时
```
点击"删除" → 二次确认 → 移除数据 → 刷新列表
```

### 6.4 拖拽排序
```
按住卡片 → 拖到目标位置 → 松开
  → 匿名态：写入 localStorage 排序数组
  → 登录态：POST /api/countdowns/sync（上送新顺序）
```

### 6.5 登录/注册
```
右上角头像 → 打开面板
  → 注册：填写用户名/密码/显示名 → 自动登录并下发 Token
  → 登录：填写用户名/密码 → 下发 Token
  → 登录成功后可选择"把本地数据上传到云端"
```

## 7. 数据结构

### 7.1 倒计时
```json
{
  "id": "cd_1713340800000_a1b2c3",
  "user_id": "u_1713340800000_ab12cd34",
  "name": "元旦",
  "date": "2026-12-31T00:00:00",
  "emoji": "🎉",
  "theme": "pink",
  "date_type": "natural",
  "sort_order": 0,
  "created_at": "2026-04-17 10:00:00",
  "updated_at": "2026-04-17 10:00:00"
}
```

### 7.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 唯一标识，格式 `cd_时间戳_随机串` |
| user_id | string | 是 | 所属用户；匿名态统一为 `anonymous` |
| name | string | 是 | 事件名称，最大 20 字符 |
| date | string | 是 | 目标日期，ISO 格式 `YYYY-MM-DDTHH:mm:ss` |
| emoji | string | 是 | emoji 图标 |
| theme | string | 是 | 主题色：`pink` `orange` `blue` `purple` `green` `red` |
| date_type | string | 是 | 日期口径：`natural`（自然日）或 `workday`（工作日） |
| sort_order | number | 是 | 用户内排序权重，越小越靠前 |

### 7.3 存储

- **匿名态**：`localStorage.countdowns`（JSON 数组）
- **登录态**：服务端 SQLite，库路径 `server/data/countdowns.db`，表见 9.1

## 8. 服务端 API

> 所有写操作要求 `Authorization: Bearer <token>`；读接口匿名态返回 `user_id='anonymous'` 的公开数据，登录态返回自己的数据。

### 8.1 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册并签发 Token |
| POST | `/api/auth/login` | 登录并签发 Token |
| POST | `/api/auth/logout` | 注销当前 Token |
| GET  | `/api/auth/me` | 获取当前登录用户信息 |

### 8.2 偏好
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/preferences` | 读取当前用户偏好 |
| PUT | `/api/preferences` | 更新当前用户偏好（整体覆盖） |

### 8.3 倒计时
| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/api/countdowns` | 列出当前用户（或匿名）的所有倒计时，按 `sort_order` 升序 |
| POST   | `/api/countdowns` | 新增一条 |
| PUT    | `/api/countdowns/:id` | 更新一条（限本人） |
| DELETE | `/api/countdowns/:id` | 删除一条（限本人） |
| POST   | `/api/countdowns/sync` | 批量同步排序与数据，登录态用于拖拽结果和匿名合并 |

### 8.4 健康检查
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 返回 `{ status: 'ok' }` |

## 9. 数据库

### 9.1 表结构

```sql
-- 倒计时
CREATE TABLE countdowns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎉',
  theme TEXT NOT NULL DEFAULT 'pink',
  date_type TEXT NOT NULL DEFAULT 'natural',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_countdowns_user ON countdowns(user_id);

-- 用户
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 会话
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- 用户偏好
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  prefs TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 9.2 持久化
- SQLite WAL 模式
- 数据目录：`server/data/`（Docker Volume 挂载点为 `/app/server/data`）

## 10. 部署

### 10.1 本地开发
```bash
# 后端
cd server
npm install
npm start            # 监听 PORT=3100

# 前端
# 直接用浏览器打开 index.html，或用任意静态服务器跑 8080 端口
# 前端自动识别 location.port === '8080' → API_BASE = http://localhost:3100/api
```

### 10.2 Docker 单容器
```bash
docker build -t daojishi .
docker run -d --name daojishi \
  -p 3001:3001 \
  -v /srv/daojishi/data:/app/server/data \
  daojishi
# 访问 http://<HOST>:3001/
```

### 10.3 Nginx 子路径反代（线上）
Nginx 配置片段（`/etc/nginx/conf.d/<your-site>.conf` 内）：
```nginx
location = /dajishi { return 301 /dajishi/; }
location /dajishi/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}
```
前端 `API_BASE` 自适应：
- 访问 `https://www.luliming.xyz/dajishi/` → `API_BASE = https://www.luliming.xyz/dajishi/api`
- 访问 `http://<IP>:3001/` → `API_BASE = http://<IP>:3001/api`

### 10.4 端口约定
| 端口 | 用途 |
|------|------|
| 3100 | 本地开发后端 |
| 3001 | Docker 容器对外端口（生产） |
| 8080 | 本地开发前端静态服务（可选） |

## 11. 目录结构

```
daojishi/
├── index.html              # 前端单文件 SPA
├── Dockerfile              # 容器构建
├── .dockerignore
├── README.md               # 本文档
├── DEPLOYMENT.md           # 部署操作手册
└── server/
    ├── index.js            # Express 后端 + SQLite
    ├── package.json
    └── data/               # SQLite 数据库目录（运行时生成；已 gitignore）
```

## 12. 迭代规划（V4+）

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P1 | 自定义假期 | 工作日模式下支持用户自定义节假日/调休 |
| P1 | 通知提醒 | 到期浏览器 Web Push 通知 |
| P2 | 数据导入/导出 | 支持 JSON / iCal 导入导出 |
| P2 | 分享图片 | 生成倒计时分享海报 |
| P3 | 多端原生壳 | 基于 WebView 打包 iOS/Android 客户端 |
| P3 | 第三方登录 | 支持微信 / GitHub OAuth |
| P3 | 自定义背景 | 用户上传卡片背景图 |

---

## 变更日志

| 版本 | 日期 | 变更 |
|------|------|------|
| V1.0 | 2026-04-17 | 首版：纯前端倒计时，localStorage 存储 |
| V2.0 | 2026-04-20 | 新增后端 SQLite、工作日/自然日模式 |
| V2.1 | 2026-04-24 | 卡片拖拽排序、云端数据存储落地 |
| V3.0 | 2026-04-26 | 账号系统（注册/登录/会话）、Docker 部署、Nginx 子路径反代、线上地址 https://www.luliming.xyz/dajishi 上线 |

*文档版本：V3.0 | 更新日期：2026-04-26*
