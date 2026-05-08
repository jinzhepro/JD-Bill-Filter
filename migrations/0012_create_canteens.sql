-- 食堂管理表
CREATE TABLE IF NOT EXISTS canteens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建唯一索引，确保食堂名称不重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_canteens_name ON canteens(name);

-- 插入初始数据：10个食堂
INSERT OR IGNORE INTO canteens (name, location) VALUES
  ('开投大厦', '开投大厦'),
  ('顺泽大厦', '顺泽大厦'),
  ('经控5楼', '经控5楼'),
  ('经控4楼', '经控4楼'),
  ('经控13楼', '经控13楼'),
  ('铁山水库', '铁山水库'),
  ('珠山水库', '珠山水库'),
  ('数字产业园', '数字产业园'),
  ('高新捷能', '高新捷能'),
  ('即墨捷能', '即墨捷能');