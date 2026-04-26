const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3100;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化 SQLite 数据库
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'countdowns.db'));
db.pragma('journal_mode = WAL');

// ========== 建表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS countdowns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🎉',
    theme TEXT NOT NULL DEFAULT 'pink',
    date_type TEXT NOT NULL DEFAULT 'natural',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_countdowns_user ON countdowns(user_id);

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    prefs TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ========== 工具函数 ==========
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const SESSION_TTL_DAYS = 30;

function hashPassword(password, salt) {
  return crypto
    .createHash('sha256')
    .update(salt + ':' + password)
    .digest('hex');
}

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isoInDays(days) {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

// 从 Authorization 解析 Bearer Token；返回用户行或 null
function resolveUserByToken(req) {
  const auth = req.headers['authorization'] || '';
  const m = /^Bearer\s+([A-Za-z0-9]+)$/.exec(auth);
  if (!m) return null;
  const token = m[1];
  const session = db
    .prepare('SELECT * FROM sessions WHERE token = ?')
    .get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  return user || null;
}

// 中间件：可选鉴权，填充 req.authUser
function attachAuth(req, _res, next) {
  req.authUser = resolveUserByToken(req);
  next();
}

// 中间件：强制鉴权
function requireAuth(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ success: false, message: '未登录或会话已过期' });
  }
  next();
}

app.use(attachAuth);

// ========== Auth API ==========

// 注册
app.post('/api/auth/register', (req, res) => {
  const { username, password, display_name } = req.body || {};
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return res.status(400).json({
      success: false,
      message: '用户名需 3-20 位，仅限字母、数字、下划线'
    });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 64) {
    return res.status(400).json({
      success: false,
      message: '密码长度需 6-64 位'
    });
  }
  const displayName =
    typeof display_name === 'string' && display_name.trim()
      ? display_name.trim().slice(0, 30)
      : username;

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(409).json({ success: false, message: '用户名已被占用' });
  }

  const userId = generateId('u');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);

  db.prepare(
    `INSERT INTO users (id, username, display_name, password_salt, password_hash)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, username, displayName, salt, hash);

  // 初始化偏好
  db.prepare(
    `INSERT OR IGNORE INTO user_preferences (user_id, prefs) VALUES (?, '{}')`
  ).run(userId);

  // 自动签发 session
  const token = generateToken();
  db.prepare(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(token, userId, isoInDays(SESSION_TTL_DAYS));

  res.json({
    success: true,
    data: {
      token,
      user: { id: userId, username, display_name: displayName }
    }
  });
});

// 登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: '参数错误' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
  const hash = hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
  const token = generateToken();
  db.prepare(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(token, user.id, isoInDays(SESSION_TTL_DAYS));

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, username: user.username, display_name: user.display_name }
    }
  });
});

// 登出
app.post('/api/auth/logout', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const m = /^Bearer\s+([A-Za-z0-9]+)$/.exec(auth);
  if (m) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(m[1]);
  }
  res.json({ success: true, message: '已登出' });
});

// 当前用户
app.get('/api/auth/me', requireAuth, (req, res) => {
  const u = req.authUser;
  res.json({
    success: true,
    data: { id: u.id, username: u.username, display_name: u.display_name }
  });
});

// ========== Preferences API ==========

app.get('/api/preferences', requireAuth, (req, res) => {
  const row = db
    .prepare('SELECT prefs FROM user_preferences WHERE user_id = ?')
    .get(req.authUser.id);
  let prefs = {};
  if (row && row.prefs) {
    try {
      prefs = JSON.parse(row.prefs);
    } catch (_) {
      prefs = {};
    }
  }
  res.json({ success: true, data: prefs });
});

app.put('/api/preferences', requireAuth, (req, res) => {
  const prefs = req.body && typeof req.body === 'object' ? req.body : {};
  // 防止 prefs 体积过大
  const serialized = JSON.stringify(prefs);
  if (serialized.length > 16 * 1024) {
    return res.status(413).json({ success: false, message: '偏好数据过大' });
  }
  db.prepare(
    `INSERT INTO user_preferences (user_id, prefs, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET prefs = excluded.prefs, updated_at = excluded.updated_at`
  ).run(req.authUser.id, serialized);
  res.json({ success: true });
});

// ========== Countdowns API ==========

// 统一解析目标 user_id：登录态下以 token 身份为准，忽略请求体/query 里的 user_id
function resolveTargetUserId(req) {
  if (req.authUser) return req.authUser.id;
  const fromBody = req.body && req.body.user_id;
  const fromQuery = req.query && req.query.user_id;
  return (fromBody || fromQuery || 'default').toString();
}

// 获取所有倒计时
app.get('/api/countdowns', (req, res) => {
  const userId = resolveTargetUserId(req);
  const rows = db
    .prepare(
      'SELECT * FROM countdowns WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC'
    )
    .all(userId);
  res.json({ success: true, data: rows });
});

// 批量同步（全量覆盖）
app.post('/api/countdowns/sync', (req, res) => {
  const uid = resolveTargetUserId(req);
  const { countdowns } = req.body || {};

  if (!Array.isArray(countdowns)) {
    return res.status(400).json({ success: false, message: '参数错误: countdowns 必须是数组' });
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM countdowns WHERE user_id = ?').run(uid);
    const insert = db.prepare(`
      INSERT INTO countdowns (id, user_id, name, date, emoji, theme, date_type, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    countdowns.forEach((item, index) => {
      insert.run(
        item.id,
        uid,
        item.name,
        item.date,
        item.emoji || '🎉',
        item.theme || 'pink',
        item.dateType || 'natural',
        index
      );
    });
  });

  transaction();
  res.json({ success: true, message: '同步成功' });
});

// 添加单条倒计时
app.post('/api/countdowns', (req, res) => {
  const uid = resolveTargetUserId(req);
  const { id, name, date, emoji, theme, dateType } = req.body || {};
  if (!id || !name || !date) {
    return res.status(400).json({ success: false, message: '缺少必填字段' });
  }
  const maxOrder = db
    .prepare('SELECT MAX(sort_order) as max_order FROM countdowns WHERE user_id = ?')
    .get(uid);
  const sortOrder =
    maxOrder && maxOrder.max_order !== null ? maxOrder.max_order + 1 : 0;

  db.prepare(
    `INSERT INTO countdowns (id, user_id, name, date, emoji, theme, date_type, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, uid, name, date, emoji || '🎉', theme || 'pink', dateType || 'natural', sortOrder);

  res.json({ success: true, message: '添加成功' });
});

// 更新单条倒计时（限制为当前用户的数据）
app.put('/api/countdowns/:id', (req, res) => {
  const uid = resolveTargetUserId(req);
  const { id } = req.params;
  const { name, date, emoji, theme, dateType } = req.body || {};

  const existing = db
    .prepare('SELECT * FROM countdowns WHERE id = ? AND user_id = ?')
    .get(id, uid);
  if (!existing) {
    return res.status(404).json({ success: false, message: '未找到该倒计时' });
  }

  db.prepare(
    `UPDATE countdowns
     SET name = ?, date = ?, emoji = ?, theme = ?, date_type = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(
    name || existing.name,
    date || existing.date,
    emoji || existing.emoji,
    theme || existing.theme,
    dateType || existing.date_type,
    id,
    uid
  );

  res.json({ success: true, message: '更新成功' });
});

// 删除单条倒计时（限制为当前用户的数据）
app.delete('/api/countdowns/:id', (req, res) => {
  const uid = resolveTargetUserId(req);
  const { id } = req.params;
  const result = db
    .prepare('DELETE FROM countdowns WHERE id = ? AND user_id = ?')
    .run(id, uid);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: '未找到该倒计时' });
  }
  res.json({ success: true, message: '删除成功' });
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

// 静态文件托管（部署时前端与后端同端口同源）
// 优先使用环境变量 STATIC_DIR 指定的目录，否则默认查找 ../public 和 ..
const staticCandidates = [
  process.env.STATIC_DIR,
  path.join(__dirname, 'public'),
  path.join(__dirname, '..'),
].filter(Boolean);
for (const dir of staticCandidates) {
  try {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      app.use(express.static(dir));
      console.log('静态资源目录:', dir);
      break;
    }
  } catch (_) { /* ignore */ }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`倒计时后端服务已启动: http://0.0.0.0:${PORT}`);
});
