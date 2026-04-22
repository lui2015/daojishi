const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化 SQLite 数据库
const dbPath = path.join(__dirname, 'data', 'countdowns.db');
const fs = require('fs');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// 建表
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
  )
`);

// 创建索引
db.exec(`CREATE INDEX IF NOT EXISTS idx_countdowns_user ON countdowns(user_id)`);

// ========== API 路由 ==========

// 获取所有倒计时（按 user_id）
app.get('/api/countdowns', (req, res) => {
  const userId = req.query.user_id || 'default';
  const rows = db.prepare('SELECT * FROM countdowns WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC').all(userId);
  res.json({ success: true, data: rows });
});

// 批量同步（全量覆盖）
app.post('/api/countdowns/sync', (req, res) => {
  const { user_id, countdowns } = req.body;
  const uid = user_id || 'default';

  if (!Array.isArray(countdowns)) {
    return res.status(400).json({ success: false, message: '参数错误: countdowns 必须是数组' });
  }

  const transaction = db.transaction(() => {
    // 删除该用户的所有数据
    db.prepare('DELETE FROM countdowns WHERE user_id = ?').run(uid);

    // 插入新数据
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
  const { id, user_id, name, date, emoji, theme, dateType } = req.body;
  const uid = user_id || 'default';

  if (!id || !name || !date) {
    return res.status(400).json({ success: false, message: '缺少必填字段' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM countdowns WHERE user_id = ?').get(uid);
  const sortOrder = (maxOrder && maxOrder.max_order !== null) ? maxOrder.max_order + 1 : 0;

  db.prepare(`
    INSERT INTO countdowns (id, user_id, name, date, emoji, theme, date_type, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, uid, name, date, emoji || '🎉', theme || 'pink', dateType || 'natural', sortOrder);

  res.json({ success: true, message: '添加成功' });
});

// 更新单条倒计时
app.put('/api/countdowns/:id', (req, res) => {
  const { id } = req.params;
  const { name, date, emoji, theme, dateType } = req.body;

  const existing = db.prepare('SELECT * FROM countdowns WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: '未找到该倒计时' });
  }

  db.prepare(`
    UPDATE countdowns SET name = ?, date = ?, emoji = ?, theme = ?, date_type = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || existing.name,
    date || existing.date,
    emoji || existing.emoji,
    theme || existing.theme,
    dateType || existing.date_type,
    id
  );

  res.json({ success: true, message: '更新成功' });
});

// 删除单条倒计时
app.delete('/api/countdowns/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM countdowns WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: '未找到该倒计时' });
  }

  res.json({ success: true, message: '删除成功' });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`倒计时后端服务已启动: http://0.0.0.0:${PORT}`);
});
