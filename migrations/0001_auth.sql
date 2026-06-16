-- 用户
CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at   INTEGER NOT NULL
);

-- 登录验证码
CREATE TABLE login_codes (
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed   INTEGER NOT NULL DEFAULT 0,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_login_codes_email ON login_codes (email);

-- 通关进度
CREATE TABLE progress (
  user_id     TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  status      TEXT NOT NULL,
  passed_at   INTEGER,
  PRIMARY KEY (user_id, exercise_id)
);
