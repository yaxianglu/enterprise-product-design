# enterprise-product-design · 企业电商主图设计 AI

> 输入商品信息，AI 自动生成营销策略、图片设计方案和出图 Prompt——将电商视觉策划从设计师数天的工作压缩到 AI 30 秒完成。

---

## 解决什么痛点

**视觉策划耗时耗力：** 电商运营需要针对不同平台（淘宝、小红书、Amazon）制定不同尺寸和风格的主图方案，人工策划周期长、成本高。

**平台规则复杂：** 各平台对尺寸比例、内容合规要求不同，运营人员难以全面掌握，容易踩坑。

**出图 Prompt 难写：** 想用 Midjourney / Flux / DALL-E 生成商品图，但不知道如何写专业的中英文提示词。

**合规风险难识别：** 保健品、美妆、食品等类目存在违禁词风险，人工审查容易遗漏。

---

## 演示流程

```
Step 1  上传商品参考图（可选）
        支持上传主商品图、包装图、细节图、使用场景图、品牌参考图、材质参考图
        多图多角色，帮助 AI 更准确理解商品

Step 2  填写商品信息
        商品名称、品类、目标平台（Amazon / Shopify / 小红书 / 抖音 / 淘宝 / 拼多多）
        视觉风格（高级浅金 / 科技蓝 / 极简白 / 夏日清新 / 黑金质感 / 自然原木）
        目标人群、核心卖点、价格带
        设计约束（是否保留原包装文字、是否允许换背景/增加道具/增加模特）

Step 3  AI 生成设计方案
        约 30 秒内完成，生成营销策略 + 多张图片设计方案

Step 4  查看结果
        营销定位、目标用户画像、核心卖点、构图建议
        每张图的中文设计说明、文案标题、中英文出图 Prompt、负向 Prompt
        合规风险检测及替代表达建议
```

---

## 技术架构

| 层次 | 技术 |
|------|------|
| AI 设计策划 | OpenAI GPT-4o (JSON mode) |
| 后端 API | Python FastAPI |
| 数据存储 | MySQL 8 |
| 前端 | Next.js 14 + Tailwind CSS |
| 认证 | JWT (HttpOnly Cookie) |

---

## 目录结构

```
enterprise-product-design/
├── apps/
│   ├── agent/                    # Python FastAPI 后端（端口 8010）
│   │   ├── main.py               # FastAPI 入口
│   │   ├── app/
│   │   │   ├── api/design.py     # 设计方案生成 API
│   │   │   ├── api/auth.py       # 认证 API
│   │   │   ├── design/
│   │   │   │   └── generator.py  # AI 出图策划逻辑（Prompt 构建 + GPT-4o 调用）
│   │   │   ├── db/               # SQLAlchemy 数据库层
│   │   │   └── infrastructure/   # 配置、依赖注入
│   │   └── pyproject.toml
│   └── web/                      # Next.js 前端（端口 3014）
│       └── src/
│           ├── app/
│           │   ├── (app)/        # 受保护页面（主页：上传 → 填表 → 生成 → 结果）
│           │   ├── (auth)/       # 登录页
│           │   └── api/          # Next.js API 代理路由
│           └── components/
│               └── NavBar.tsx
├── infra/
│   └── nginx/                    # Nginx 生产配置
└── scripts/
    └── dev/                      # 本地启动脚本
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 用户登录，返回 JWT |
| POST | `/api/v1/design/generate` | 触发 AI 生成设计方案，返回 session_id |
| GET  | `/api/v1/design/{session_id}` | 查询生成状态和设计结果 |

---

## 支持的平台与风格

**平台：**

| 平台 | 推荐尺寸 |
|------|----------|
| Amazon | 1:1 · 2000×2000px |
| Shopify | 4:5 · 1600×2000px |
| 小红书 | 3:4 · 1242×1660px |
| 抖音 | 9:16 · 1080×1920px |
| 淘宝 | 1:1 · 800×800px |
| 拼多多 | 1:1 · 800×800px |

**视觉风格：** 高级浅金、科技蓝、极简白、夏日清新、黑金质感、自然原木

**商品品类：** 保健品、美妆护肤、电子产品、家居用品、食品饮料、服装配饰

---

## 快速启动

### 1. 创建数据库

```sql
CREATE DATABASE enterprise_product_design CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 启动后端

```bash
cd apps/agent
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY 和 MySQL 连接信息
uv venv && source .venv/bin/activate
uv pip install -e .
uvicorn main:app --host 0.0.0.0 --port 8010 --reload
```

### 3. 启动前端

```bash
cd apps/web
cp .env.local.example .env.local
# 编辑 .env.local，确认 AGENT_URL 和 DB 连接信息
pnpm install
pnpm dev
```

打开 http://localhost:3014，默认账号：`demo / demo1234`

---

## 技术栈

| 组件 | 版本 |
|------|------|
| Next.js | 14 |
| React | 18 |
| Tailwind CSS | 3 |
| FastAPI | 0.115+ |
| OpenAI Python SDK | 1.x |
| MySQL2 (Node) | 3.x |
| jose (JWT) | 6.x |
| pnpm | 10+ |
