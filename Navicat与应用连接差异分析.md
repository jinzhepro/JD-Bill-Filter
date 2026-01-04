# Navicat 与应用程序连接差异分析

## 问题现象

- ✅ Navicat 可以成功连接到 MySQL 数据库 (117.73.22.92:3306)
- ❌ Node.js 应用程序无法连接，报错：`Access denied for user 'root'@'39.77.26.135'`

## 差异分析

### 1. 认证插件差异

**Navicat**: 可能使用 `caching_sha2_password` 或自动协商认证插件
**Node.js mysql2**: 默认使用 `mysql_native_password`

**解决方案**:

```sql
-- 检查当前用户的认证插件
SELECT user, host, plugin FROM mysql.user WHERE user = 'root';

-- 如果需要，修改认证插件
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'Qyt0532$2023';
FLUSH PRIVILEGES;
```

### 2. 网络路径差异

**Navicat**: 可能通过本地网络或 VPN 连接
**Node.js 应用**: 通过公网 IP 39.77.26.135 连接

**验证方法**:

```sql
-- 查看当前连接的用户和主机
SELECT USER(), CURRENT_USER();

-- 查看所有root用户的权限
SELECT user, host FROM mysql.user WHERE user = 'root';
```

### 3. SSL/TLS 配置差异

**Navicat**: 可能自动处理 SSL 连接或忽略 SSL 验证
**Node.js 应用**: 需要明确配置 SSL 设置

**解决方案**:

```javascript
// 在mysql/route.js中添加SSL配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: process.env.DB_CHARSET || "utf8mb4",
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  ssl: {
    rejectUnauthorized: false, // 忽略SSL证书验证
  },
};
```

### 4. 字符集差异

**Navicat**: 可能使用系统默认字符集
**Node.js 应用**: 明确指定 utf8mb4

**解决方案**:

```javascript
// 尝试不指定字符集
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  // 移除 charset 配置
};
```

## 推荐的解决步骤

### 步骤 1: 检查 MySQL 用户权限

在 MySQL 服务器上执行：

```sql
-- 查看所有root用户的主机权限
SELECT user, host, plugin, authentication_string FROM mysql.user WHERE user = 'root';

-- 如果没有'%'或'39.77.26.135'的权限，添加权限
GRANT ALL PRIVILEGES ON *.* TO 'root'@'39.77.26.135' IDENTIFIED BY 'Qyt0532$2023';
FLUSH PRIVILEGES;

-- 或者允许从任何IP连接（不推荐生产环境使用）
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'Qyt0532$2023';
FLUSH PRIVILEGES;
```

### 步骤 2: 修改认证插件

```sql
-- 确保使用mysql_native_password认证插件
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'Qyt0532$2023';
ALTER USER 'root'@'39.77.26.135' IDENTIFIED WITH mysql_native_password BY 'Qyt0532$2023';
FLUSH PRIVILEGES;
```

### 步骤 3: 检查 MySQL 服务器配置

编辑 MySQL 配置文件 (`/etc/mysql/mysql.conf.d/mysqld.cnf`):

```ini
# 确保bind-address允许远程连接
bind-address = 0.0.0.0

# 或者注释掉bind-address
# bind-address = 127.0.0.1
```

重启 MySQL 服务：

```bash
sudo systemctl restart mysql
```

### 步骤 4: 更新应用程序配置

如果上述步骤都无效，尝试更新应用程序的数据库配置：

```javascript
// 在src/app/api/mysql/route.js中
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: process.env.DB_CHARSET || "utf8mb4",
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  ssl: {
    rejectUnauthorized: false,
  },
  authPlugins: {
    mysql_native_password: () =>
      require("mysql2/lib/auth_plugins/mysql_native_password"),
  },
};
```

## 验证连接

使用提供的诊断工具验证：

```bash
# 测试环境变量
curl http://localhost:3000/api/test-env

# 详细诊断
curl http://localhost:3000/api/db-diagnose

# 对比分析
curl http://localhost:3000/api/db-compare
```

## 常见原因总结

1. **用户权限配置**: MySQL 用户只允许从特定 IP 或 localhost 连接
2. **认证插件不匹配**: 服务器和客户端使用不同的认证插件
3. **SSL/TLS 配置**: Navicat 可能自动处理 SSL，而应用需要明确配置
4. **网络路径差异**: Navicat 可能通过内网连接，应用通过公网连接
5. **防火墙设置**: 服务器防火墙可能阻止了应用服务器的 IP

## 最佳实践建议

1. **创建专用数据库用户**，不使用 root 用户
2. **限制连接 IP 范围**，而不是使用'%'
3. **启用 SSL 连接**，确保数据传输安全
4. **定期更新密码**，使用强密码
5. **监控连接日志**，及时发现异常连接
