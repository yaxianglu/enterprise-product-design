# AI 商品图展示设计生成器

## 项目简介

面向电商团队的 AI 智能设计生成工具。用户上传商品图片，填写产品名称、品类、目标平台和视觉风格等信息，后端通过 GPT-4o Vision 分析商品视觉特征，自动生成多种类型的展示设计方案（主图、场景图、种草图、详情页卖点图等），并同步输出中英文图片生成 Prompt 和广告法合规检查结果。支持淘宝、拼多多、小红书、抖音、Amazon、Shopify 六大平台。

## 技术栈

- 前端：Next.js 14 / React 18 / TypeScript / Tailwind CSS
- 后端：FastAPI / Python（uv 管理依赖）
- AI：OpenAI API（GPT-4o Vision，JSON mode）
- 数据库：MySQL 8
- 其他：Nginx（反向代理，productDesign.luyaxiang.com）

## 主要功能

- 商品图上传（最多 6 张，支持 JPG / PNG / WEBP，拖拽上传）
- 商品图片用途标注（主商品图 / 包装图 / 细节图 / 使用场景图 / 品牌参考图 / 材质参考图）
- GPT-4o Vision 视觉分析（商品特征自动识别）
- 平台专属营销策略生成（定位、目标用户洞察、核心卖点、构图建议）
- 多类型展示设计方案生成（商品主图 / 场景展示图 / 种草图 / 详情页卖点图 / 活动促销图）
- 中英文图片生成 Prompt 输出，支持一键复制（含 Negative Prompt）
- 广告法合规风险自动检测（低 / 中 / 高风险分级，提供替代表达建议）
- 6 种视觉风格（高级浅金 / 科技蓝 / 极简白 / 夏日清新 / 黑金质感 / 自然原木）
- 多平台尺寸自动适配（1:1、4:5、3:4、9:16 等）
- 设计约束配置（是否保留原包装文字、是否允许换背景 / 增加道具 / 增加模特）

## 目录结构

```bash
.
├── apps/
│   ├── web/                  # Next.js 前端（dev 端口 3010，生产端口 3014）
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (app)/page.tsx   # 主功能页面（上传→填表→生成→结果）
│   │   │   │   ├── (auth)/login/    # 登录页
│   │   │   │   └── api/             # Next.js API 代理路由
│   │   │   ├── components/          # NavBar 等组件
│   │   │   └── lib/                 # auth、db 工具
│   │   └── package.json
│   └── agent/                # FastAPI 后端（端口 8010）
│       ├── app/
│       │   ├── api/
│       │   │   ├── auth.py          # JWT 认证
│       │   │   └── design.py        # 设计生成路由（upload-image / generate / 轮询）
│       │   ├── db/                  # SQLAlchemy 模型（DesignSession / DesignImage）
│       │   ├── design/
│       │   │   ├── generator.py     # AI 生成逻辑（GPT-4o Vision 三步 CoT）
│       │   │   └── validator.py     # 合规检测
│       │   └── infrastructure/
│       │       └── config.py        # pydantic-settings 配置
│       └── main.py
├── infra/
│   └── nginx/               # Nginx 配置（productDesign.luyaxiang.com → 127.0.0.1:3010）
├── scripts/
│   └── dev/
│       ├── start-web.sh
│       └── start-agent.sh
└── README.md
```

## 环境变量

### 前端（apps/web/.env.local）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| AGENT_URL | 后端 API 地址 | http://localhost:8010 |
| JWT_SECRET | JWT 签名密钥（与后端一致） | enterprise-demo-shared-secret-2026 |
| DB_HOST | MySQL 主机 | localhost |
| DB_PORT | MySQL 端口 | 3306 |
| DB_USER | MySQL 用户名 | root |
| DB_PASSWORD | MySQL 密码 | your_password |
| DB_NAME | 数据库名 | enterprise_product_design |

### 后端（apps/agent/.env）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| OPENAI_API_KEY | OpenAI API Key | sk-... |
| OPENAI_MODEL | 使用的模型 | gpt-4o |
| DATABASE_URL | MySQL 连接字符串 | mysql+pymysql://root:password@localhost:3306/enterprise_product_design?charset=utf8mb4 |
| JWT_SECRET | JWT 签名密钥 | enterprise-demo-shared-secret-2026 |
| UPLOAD_DIR | 图片上传目录 | uploads |

## 本地开发

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE enterprise_product_design CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 安装后端依赖（需要 uv）
cd apps/agent
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY 和 MySQL 连接信息
uv sync
uv run uvicorn main:app --reload --port 8010

# 安装前端依赖（新开终端）
cd apps/web
cp .env.local.example .env.local
# 编辑 .env.local，确认 AGENT_URL 和 DB 连接信息
npm install
npm run dev
```

打开 http://localhost:3010

使用启动脚本（需先 `npm run build`）：

```bash
bash scripts/dev/start-agent.sh
bash scripts/dev/start-web.sh
```

## 部署

Nginx 配置位于 `infra/nginx/product-design-luyaxiang.nginx.conf`，监听 `127.0.0.1:5184`，将 `productDesign.luyaxiang.com` 反向代理到 `127.0.0.1:3010`。将配置文件复制到 `/Users/mac/.doc-cloud/config/` 后 reload nginx 生效。

## 默认账号

| 用户名 | 密码 |
|--------|------|
| demo | demo1234 |
