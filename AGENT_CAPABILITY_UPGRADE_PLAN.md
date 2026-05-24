# Agent 能力升级 Plan

> 文档生成日期：2026-05-22  
> 项目：enterprise-quiz / 企业智能题库  
> 分析范围：Agent 能力层（apps/agent/app/quiz/）、调用链路、前端交互

---

## 1. Agent 当前整体判断

| 维度 | 结论 |
|---|---|
| Agent 类型 | AI 驱动的内容生成流水线，非真正意义上的 Agent |
| 当前完成度 | ~40%，核心 AI 调用逻辑存在，但有明显 Bug 和缺陷 |
| 最核心问题 | 前后端字段不匹配导致答题功能实际不可用；Prompt 全部用 user 消息，无 system prompt；无兜底能力 |
| 是否有客户展示价值 | 有潜力，但当前有 Bug，无法稳定演示 |
| 更像哪类系统 | 批量出题流水线 + 简单语义评分，不是 Agent |

**一句话定位：** 当前是一个"上传文档 → AI 出题 → 在线答题 → 即时评分"的功能 Demo，核心 AI 能力已有雏形，但存在前后端字段错位 Bug，且 AI 层缺乏 system prompt、输出校验和兜底能力，还不适合稳定演示。

---

## 2. Agent 当前定位

### Agent 是什么

企业合规培训考核 Agent：将员工培训材料（PDF/Word）上传后，由 AI 自动解析内容、出题、在线答题、即时评分，将原本需要合规专员数天手工整理的题库工作压缩到 30 秒内完成。

### 解决的问题

- 手工出题耗时：合规专员需从几十页制度文件手动整理题目，既费时又难以全面覆盖
- 合规培训流于形式：员工只需"点已阅读"，无真正考核和反馈
- 达标情况不透明：无法实时掌握各部门合规达标情况
- 制度更新后题库滞后：考核无法覆盖新合规要求

### 面向演示场景

上传企业合规手册 → 配置题型和难度 → AI 30 秒自动出题 → 员工在线答题 → AI 实时评分

已有一份真实演示文档：`apps/agent/demo_data/compliance_handbook.pdf`（株洲中车时代电气《员工诚信合规手册》，19 页，文本型 PDF）

### Agent 类型判断

| 类型 | 符合程度 |
|---|---|
| 内容生成 Agent | ✅ 主要类型，自动生成结构化题目 |
| RAG 知识库 Agent | ❌ 无检索，直接全文喂入 |
| 工具调用 Agent | ❌ 无 function calling |
| 业务问答 Agent | ⚠️ 仅评分阶段有语义理解 |
| 多工具调用 Agent | ❌ 无 |

### 核心亮点

- 支持 5 种题型（单选/多选/判断/填空/问答）
- 支持 3 种难度级别（简单/中等/困难）
- 问答题有 AI 语义评分，不是简单字符串匹配
- 已有真实演示文档

### 最容易露怯的地方

1. **前后端字段不匹配**：题目页面 `content` vs API 返回 `title`；选项 `string[]` vs API 返回 `{A:..., B:...}` 对象；答题结果 `correct` vs API 返回 `is_correct`；分数字段缺失
2. **无错误兜底**：LLM 返回非 JSON 时直接 500 崩溃
3. **Polling 等待体验差**：最长等 120 秒，无任何进度提示
4. **无示例问题**：演示前要先上传文件，增加摩擦

---

## 3. Agent 技术栈

| Agent 模块 | 当前实现 | 作用 | 是否适合 MVP Demo | 问题 |
|---|---|---|---|---|
| LLM SDK | OpenAI Python SDK v1.x，AsyncOpenAI | 调用 GPT-4o 出题和评分 | ✅ | 无 |
| LLM 模型 | GPT-4o（硬编码默认值） | 生成题目和语义评分 | ✅ | 无系统消息 |
| System Prompt | ❌ 无 | — | ❌ | 所有 prompt 都用 user 消息 |
| Prompt 模板 | ✅ 有（prompts.py，5 种题型各一个模板） | 规定输出格式和角色 | ⚠️ | 角色描述简单，缺乏上下文控制 |
| Function Calling / Tools | ❌ 无 | — | ❌ | 无法展示 Agent 工具调用能力 |
| RAG | ❌ 无 | — | ⚠️ | 直接将全文送入，超长文档有 token 上限风险 |
| Embedding / 向量库 | ❌ 无 | — | N/A | — |
| Memory | ❌ 无 | — | ❌ | 无会话级上下文 |
| 文本分块 | ✅ 有（extractor.py，max_chars=60000） | 长文档分块处理 | ✅ | 按段落分割，无语义感知 |
| 文件提取 | ✅ 有（extractor.py：PDF/DOCX/TXT） | 将文件转成纯文本 | ✅ | 无 |
| 结构化输出 | ⚠️ 依赖 prompt 要求返回 JSON | 规定题目格式 | ⚠️ | 无 schema 校验，parse 失败会 500 |
| 输出校验 | ❌ 无 | — | ❌ | JSON parse 失败直接抛异常 |
| 流式输出 | ❌ 无 | — | ❌ | 整体等待，体验差 |
| 后台任务 | ✅ FastAPI BackgroundTasks | 异步出题 | ⚠️ | 失败只记 "failed"，无重试 |
| 演示数据 | ✅ 有（compliance_handbook.pdf） | 合规手册演示文档 | ✅ | 无预置题目 |
| Anthropic SDK | ❌ 无（config 中有 anthropic_api_key 占位符，注释为 reserved） | — | N/A | — |
| LangChain / LangGraph / LlamaIndex | ❌ 无 | — | N/A | — |

---

## 4. Agent 调用链路

### 当前实际调用链路

```
用户拖拽/点击上传文件
→ UploadPanel.tsx（前端组件）
→ POST /api/upload（Next.js API Route 代理）
→ POST http://localhost:8004/api/v1/upload（FastAPI）
→ upload.py：保存文件，创建 QuizSession（status=pending），返回 session_id

用户配置题型数量和难度，点击"生成题目"
→ QuizConfig.tsx（前端组件）
→ POST /api/quiz/generate（Next.js API Route 代理，携带 JWT cookie）
→ POST http://localhost:8004/api/v1/quiz/generate（FastAPI）
→ quiz.py：启动 BackgroundTask(_run_generation)
→ _run_generation：
  → extract_text(file_path)  [extractor.py：PDF/DOCX → 纯文本]
  → chunk_text(text)         [按段落分块，60k 字符上限]
  → 对每种题型 asyncio.gather 并发调用 generate_questions()
    → _generate_for_chunk()：
      → 将 prompt 模板 + chunk 文本拼接为 user 消息（无 system 消息）
      → client.chat.completions.create(model="gpt-4o", messages=[{user}])
      → json.loads(raw)  [无校验，失败抛异常]
  → bulk_create 写入数据库
  → update_status("done")  [失败时 update_status("failed")，无重试，无日志]

前端轮询（每 2 秒，最多 60 次 = 120 秒）
→ GET /api/quiz/{sessionId}（Next.js 代理）
→ GET http://localhost:8004/api/v1/quiz/{session_id}
→ 返回 status + questions 列表

status=done，前端进入答题阶段
→ QuizPlayer.tsx（前端组件）
→ 用户选择/输入答案，点击"提交答案"
→ POST /api/quiz/answer（Next.js 代理）
→ POST http://localhost:8004/api/v1/quiz/question/{id}/answer
→ quiz.py：
  → free_response 题：evaluate_free_response(user_answer, standard_answer)
    → evaluator.py：prompt + GPT-4o 语义评分 → 返回 {similarity, is_correct, feedback}
  → 选择题：精确匹配
→ 返回 {is_correct, feedback/explanation, correct_answer}
```

### 当前链路存在的关键问题

1. **前端期望 `title`=`content`，`options` 为 `string[]`**，但 API 返回 `title` 字段和 `options` 为字典对象——**QuizPlayer 当前渲染题目内容和选项的逻辑会出错**
2. **前端期望答题结果 `correct`**，但 API 返回 `is_correct`——**答对/答错判断失效**
3. **前端期望 `score` 字段**，但 API 不返回——**得分统计永远为 0**
4. 无意图识别、无 Planner、无 Tool 调用、无 RAG
5. 无流式输出，纯轮询等待

---

## 5. Agent 核心能力分析

### 5.1 输入理解能力

| 维度 | 当前状态 | 问题 |
|---|---|---|
| 输入校验 | ⚠️ 仅文件类型校验（pdf/docx/doc/txt） | 无文件大小限制，无内容安全校验 |
| 意图识别 | ❌ 无 | 系统只有固定流程，无法识别用户意图 |
| 任务类型区分 | ⚠️ 用户手动选题型和难度 | 不能根据文档内容自动推荐题型 |
| 业务领域限定 | ⚠️ Prompt 中写了"企业合规培训专家" | 但用户可以上传任意文件，AI 会对任意内容出题 |
| 乱问时会不会崩 | ✅ 配置阶段不会崩（用户只选数量） | 但文档内容为空或乱码时出题可能失败 |
| Clarify 追问能力 | ❌ 无 | |
| 无关问题兜底 | ❌ 无 | |
| Prompt injection 风险 | ⚠️ 存在 | 用户上传的文档内容直接注入 prompt，可能被恶意构造 |
| 结论 | 输入理解能力弱，更像参数表单而非智能理解 | |

### 5.2 任务规划能力

| 维度 | 当前状态 | 问题 |
|---|---|---|
| Planner | ❌ 无 | 流程完全由前端三步走（upload→config→quiz）硬编码 |
| 任务拆解 | ⚠️ 有（按题型拆成多个并发 LLM 调用） | 但拆解逻辑固定，无智能规划 |
| 不同意图走不同路径 | ❌ 无 | 只有一条固定流水线 |
| Workflow / Graph / Chain | ❌ 无 | 线性流水线 |
| Agent 感 | ❌ 无 | 更像批处理任务 |
| 容易失控 | ❌ 不会失控，但会静默失败 | BackgroundTask 失败无法通知用户 |

**结论：** 当前系统是一个固定流水线，没有任何 Agent 规划能力。适合演示"AI 自动化"但不适合演示"AI 智能规划"。

### 5.3 工具调用能力

**当前没有任何 Function Calling / Tool Use 实现。**

当前 Agent 更接近普通 LLM 内容生成，不是工具型 Agent。所有 LLM 调用均通过 prompt 直接要求返回 JSON，无结构化 function calling。

**潜在可以实现的 Tool：**

| Tool 名称（待实现） | 作用 | 价值 |
|---|---|---|
| extract_document_structure | 分析文档结构，识别章节和要点 | 提升题目质量和覆盖率 |
| validate_question_quality | 校验生成题目的质量（无歧义、答案唯一） | 减少低质量题目 |
| suggest_quiz_config | 根据文档类型推荐题型和数量 | 降低用户配置负担 |
| evaluate_answer_semantically | 语义评分（已有雏形，可以包装成 tool） | 现有能力的显式化 |

### 5.4 RAG / 知识能力

**当前项目没有 RAG。** 做法是将整篇文档全文直接注入 prompt。

| 维度 | 当前状态 | 问题 |
|---|---|---|
| 文档导入 | ✅ 支持 PDF/DOCX/TXT | 无法处理图片型 PDF |
| Chunk 策略 | ⚠️ 固定 60k 字符，按段落分割 | 无语义感知，可能截断句子 |
| 向量检索 | ❌ 无 | 直接全文注入 |
| Rerank | ❌ 无 | |
| 引用来源 | ❌ 无 | 用户看不到题目出自哪一章节 |
| 空结果兜底 | ❌ 无 | 文档无效时 LLM 会胡说 |
| 检索不到还胡说 | ⚠️ 有风险 | 文档内容少时 LLM 可能编造题目 |

**是否需要加 RAG：** MVP 阶段**不必加向量 RAG**。当前演示文档只有 19 页，全文注入完全可行。可以用**章节索引 + 段落引用**的轻量方案替代，既能展示"知识来源"，又不引入复杂向量库。

### 5.5 记忆与上下文能力

| 维度 | 当前状态 | 问题 |
|---|---|---|
| 多轮对话 | ❌ 无 | 每次 LLM 调用都是独立请求 |
| Conversation history | ❌ 无 | |
| Session 级上下文 | ⚠️ 有 QuizSession（数据库记录），但仅用于状态管理 | LLM 调用无上下文 |
| 用户任务状态 | ⚠️ 有（pending/generating/done/failed） | 但状态不透明，前端只能轮询 |
| Token 控制 | ⚠️ max_tokens=4096（出题），512（评分） | 无上下文裁剪，不需要（无多轮对话） |
| 长对话容易崩 | N/A | 无多轮对话 |
| 上下文污染 | ❌ 无（每次独立调用） | |

**结论：** 当前系统是无状态的 LLM 调用，每次出题和评分都是独立请求。MVP 阶段无需多轮对话，但需要清晰展示出题进度状态。

### 5.6 输出质量能力

| 维度 | 当前状态 | 问题 |
|---|---|---|
| 输出稳定性 | ⚠️ 中等 | LLM 偶尔会在 JSON 外包 markdown code block，已有处理（剥离 ` ``` ` 前后缀），但无深层校验 |
| 结构化 | ✅ 有明确 JSON schema | 但无 Pydantic 或 JSON Schema 校验，parse 失败直接 500 |
| 幻觉风险 | ⚠️ 存在 | 文档内容不足时 LLM 可能编造题目内容 |
| 来源依据 | ❌ 无 | 题目不标注出自文档哪一章节 |
| 空结果兜底 | ⚠️ 有基础兜底（generate 失败记 failed），但前端 UI 体验差 | |
| 错误提示 | ⚠️ 后端返回 failed 状态，但前端只显示"生成超时，请重试" | 用户看不到真正的错误原因 |
| 下一步建议 | ❌ 无 | 答题完成后无总结、无学习建议 |
| 适合客户直接看 | ⚠️ 有潜力，但存在前后端 Bug 导致功能不可用 | |
| 统一回答格式 | ⚠️ 题目有统一格式，但评分反馈不统一 | free_response 返回 feedback，选择题返回 explanation |
| 答题后的报告 | ❌ 无 | 只有总分，无分析报告 |

---

## 6. Agent 能力成熟度分级

| 能力项 | 当前等级 | 理由 | 目标等级（MVP） | 升级建议 |
|---|---|---|---|---|
| Agent 角色定义 | L1 | Prompt 中有"企业合规培训专家"但无 system prompt | L2 | 抽离专用 system prompt，明确角色、能力边界、输出规范 |
| System Prompt | L0 | 无 system prompt，所有提示都在 user 消息中 | L2 | 为生成和评分分别写 system prompt |
| 意图识别 | L0 | 无任何意图识别，用户只能走固定配置流程 | L2 | 增加文档类型识别、自动推荐题型配置 |
| 任务规划 | L0 | 纯固定流水线 | L2 | 增加出题策略选择（全面覆盖 vs 重点章节）|
| Tool Calling | L0 | 无任何 function calling | L2 | 包装文档分析、质量校验为显式 tool |
| RAG / 知识检索 | L0 | 全文注入，无检索 | L2 | 增加章节引用标注，展示题目来源 |
| 多轮上下文 | L0 | 每次独立调用 | L1 | MVP 阶段保持单轮，增加会话内题目去重 |
| 输出结构化 | L1 | 有 JSON schema，但无校验，有前后端 Bug | L3 | 修复 Bug，加 schema 校验，统一字段命名 |
| 失败兜底 | L1 | 仅记录 failed 状态 | L2 | 加 JSON parse 兜底、LLM 重试、友好错误提示 |
| 演示场景适配 | L1 | 有演示文档，但有 Bug 导致演示链路不完整 | L3 | 修复 Bug，加预置示例题，完善演示流程 |

---

## 7. Agent 当前主要问题

| 问题 | 当前表现 | 对 Agent 演示的影响 | 风险等级 | 建议 |
|---|---|---|---|---|
| 前后端字段不匹配（title vs content） | QuizPlayer 用 `q.content` 但 API 返回 `title`，题目文字无法显示 | 🔴 演示直接失败，题目空白 | P0 | 统一字段命名 |
| 选项格式不匹配（dict vs array） | QuizPlayer 用 `q.options[i]` 但 API 返回 `{A:"...",B:"..."}` | 🔴 选项无法渲染 | P0 | 前端适配或后端转换 |
| 答题结果字段不匹配（correct vs is_correct） | QuizPlayer 用 `r.correct` 但 API 返回 `is_correct`，对错判断失效 | 🔴 答题反馈失效 | P0 | 统一字段命名 |
| 分数字段缺失 | QuizPlayer 用 `q.score` 但 API 不返回 score，总分永远为 0 | 🔴 演示时得分显示异常 | P0 | 在题目数据中加 score 字段 |
| 无 System Prompt | 所有 prompt 都是 user 消息 | 🟡 可能影响输出一致性 | P1 | 抽离 system prompt |
| LLM 输出无 schema 校验 | `json.loads` 失败时直接 500 | 🔴 偶发 500 崩溃 | P0 | 加 try/except + 重试 |
| 出题进度不透明 | 用户只看到"AI 生成中，请稍候" | 🟡 等待体验差 | P1 | 展示进度（"正在处理第 2/5 种题型"）|
| 无章节引用 | 题目没有标注来自文档哪个部分 | 🟡 说服力不足 | P1 | 增加 source_chapter 字段 |
| 答题后无总结报告 | 只显示总分，无分析 | 🟡 演示收尾不完整 | P1 | 增加按题型统计、按难度统计 |
| 无预置示例题 | 演示时必须先上传文件并等待 30 秒 | 🟡 演示摩擦大 | P1 | 加"加载演示题目"快捷入口 |
| 生成失败无法重试单题型 | 某类题型生成失败，整批放弃 | 🟡 影响演示完整性 | P1 | 加单题型重新生成按钮 |
| BackgroundTask 失败无通知 | status=failed，但前端只提示超时 | 🟡 用户不知道失败原因 | P1 | 区分 timeout 和 failed 状态 |
| 无示例问题引导 | 用户看到空白配置页，不知道怎么用 | 🟠 演示引导性差 | P2 | 增加默认配置和使用说明 |
| 问答题评分只有 correct/incorrect | 语义相似度有中间值，但强制二值化 | 🟠 评分体验生硬 | P2 | 展示相似度分数和详细 AI 点评 |

---

## 8. Agent MVP Demo 差距分析

### P0：不补会导致 Agent 演示直接崩溃的

| 优先级 | Agent 差距 | 当前表现 | 对演示的影响 | 建议方案 | 涉及文件/模块 |
|---|---|---|---|---|---|
| P0 | 题目内容字段不匹配 | `q.content` 为 undefined，题目空白 | 演示直接失败 | 统一使用 `title`，或在 API 响应中同时返回 `content` 别名 | `apps/web/src/components/QuizPlayer.tsx`，`apps/agent/app/api/quiz.py` |
| P0 | 选项字段格式不匹配 | 选项无法渲染，选择题空白 | 演示直接失败 | 后端将 options dict 转为 `[{key, value}]` 数组，或前端适配 dict 格式 | `apps/web/src/components/QuizPlayer.tsx`，`apps/agent/app/api/quiz.py` |
| P0 | 答题结果字段不匹配 | 对错判断永远失效 | 演示直接失败 | 统一字段名：`is_correct` 或 `correct` | `apps/web/src/components/QuizPlayer.tsx`，`apps/agent/app/api/quiz.py` |
| P0 | 总分字段缺失 | 总分永远为 0 | 演示数据错误 | API 返回题目时加入 `score` 字段（按题型设定默认分值）| `apps/agent/app/api/quiz.py`，`apps/web/src/components/QuizPlayer.tsx` |
| P0 | LLM 输出无兜底校验 | JSON parse 失败直接 500 | 演示时偶发崩溃 | 加 try/except，返回标准错误，加基础重试（最多 2 次）| `apps/agent/app/quiz/generator.py`，`apps/agent/app/quiz/evaluator.py` |

### P1：会明显影响 Agent 演示体验的

| 优先级 | Agent 差距 | 当前表现 | 对演示的影响 | 建议方案 | 涉及文件/模块 |
|---|---|---|---|---|---|
| P1 | 无 System Prompt | 所有 prompt 用 user 消息，无角色一致性 | LLM 输出不稳定 | 为 generator 和 evaluator 各写独立 system prompt | `apps/agent/app/quiz/prompts.py` |
| P1 | 出题进度不透明 | 用户等待 30s+ 无任何进度反馈 | 用户以为卡死 | 增加按题型的进度状态；或改用 SSE 推送进度 | `apps/agent/app/api/quiz.py`，`apps/web/src/app/(app)/page.tsx` |
| P1 | 无预置演示入口 | 每次演示都要等 30 秒出题 | 演示摩擦大 | 加"加载演示题目"按钮，使用预生成的合规手册题目 | `apps/web/src/components/UploadPanel.tsx`，新增 `demo_questions.json` |
| P1 | 答题后无总结报告 | 只显示总分和正确率，无分析 | 演示收尾体验差 | 增加按题型/难度统计、薄弱点提示 | `apps/web/src/components/QuizPlayer.tsx` |
| P1 | 失败状态展示不友好 | 超时或失败都显示同一条 alert | 用户不知道发生了什么 | 区分超时、生成失败、网络错误 | `apps/web/src/app/(app)/page.tsx` |

### P2：能提升 Agent 说服力的

| 优先级 | Agent 差距 | 当前表现 | 对演示的影响 | 建议方案 | 涉及文件/模块 |
|---|---|---|---|---|---|
| P2 | 题目无章节来源标注 | 题目不知道来自文档哪里 | 说服力不足 | Prompt 要求 LLM 返回 source_hint 字段，展示题目出处 | `apps/agent/app/quiz/prompts.py`，`apps/web/src/components/QuizPlayer.tsx` |
| P2 | 问答题评分仅二值化 | is_correct 只有 true/false | 评分粗糙，客户质疑 | 展示相似度分数（如"85分"）和详细 AI 点评 | `apps/web/src/components/QuizPlayer.tsx`，`apps/agent/app/api/quiz.py` |
| P2 | 无 Agent 处理过程展示 | 用户看不到 AI 在做什么 | 缺乏 AI 存在感 | 展示出题阶段日志（"正在分析第 3 章…正在生成判断题…"）| `apps/agent/app/api/quiz.py` |
| P2 | 默认题型配置不友好 | 默认只有 5 道单选，其余全 0 | 用户不知道推荐配置 | 提供"推荐配置"按钮（如：单选 5 + 判断 3 + 问答 2）| `apps/web/src/components/QuizConfig.tsx` |

---

## 9. Agent 产品展示建议

### 推荐 Agent 定位

> 上传企业合规/培训文档，AI 在 30 秒内自动出题，员工在线测评，即时 AI 评分——将数天的人工出题工作压缩为一键完成。

### 推荐演示场景

1. **合规手册测评**：上传附带的《员工诚信合规手册》，生成 10 道混合题型，演示完整的出题→答题→评分闭环
2. **多难度分层测评**：同一文档，先生成简单题（入职新员工），再生成困难题（合规专员），展示分级测评能力
3. **AI 语义评分演示**：聚焦问答题，输入不同质量的答案，展示 AI 如何给出差异化的评分和反馈
4. **快速 Demo 模式**：无需上传文件，直接加载预置的合规题目，10 秒进入答题状态，适合会议室快速演示
5. **制度更新场景**：上传新版制度文件，强调"文件一更新，题库立刻同步"的核心价值

### 推荐示例问题（演示时可用的标准问题）

（基于合规手册内容，供演示时预置）

1. 根据公司合规手册，员工在发现合规风险时应首先采取什么行动？
2. 以下哪些行为属于利益冲突需要申报的情形？（多选）
3. 公司对于员工收受商业伙伴礼品的规定是？（判断：价值低于 200 元的礼品可以接受）
4. 公司内部举报渠道包括哪些？
5. 员工违反诚信合规准则的最严重后果是什么？
6. 在处理客户信息时，员工应当遵守的核心原则是什么？（问答题）
7. 以下场景中，___（填空）是员工必须向合规部门报告的情形。
8. 关于反腐败合规，公司明确禁止的行为有哪些？（多选）
9. 员工离职后，对于公司商业秘密的保护义务持续多长时间？
10. 如果员工怀疑上级存在违规行为，正确的处理方式是什么？（问答题）

### 推荐回答格式

生成题目时，AI 应输出以下格式（升级后）：

```
题目：[题目内容]
题型：[单选/多选/判断/填空/问答]
难度：[简单/中等/困难]
来源章节：[来自文档第X章：章节名]    ← 升级后新增
正确答案：[答案]
解析：[解析内容]
```

评分反馈格式（问答题升级后）：

```
评分：[85/100]
相似度：[高/中/低]
AI 点评：[详细评语]
参考答案：[标准答案要点]
```

### 不建议演示的内容

- **超长文档**（> 50 页）：分块处理可能导致题目质量不均，且等待时间更长
- **图片型 PDF**：当前无 OCR 能力，文字提取为空
- **非合规/培训类文档**：如技术文档、代码，出题质量难以预期
- **大量问答题（> 5 道）**：AI 评分效果参差，且每道题都需单独提交，演示节奏慢
- **追问"为什么出这道题"**：当前无来源标注，无法解释题目依据

---

## 10. Agent 能力升级目标

1. **修复演示链路 Bug**：消除前后端字段不匹配问题，让完整演示流程（上传→出题→答题→评分）可以稳定跑通
2. **让 Agent 不再只是一个等待框**：出题过程可视化，有明确的进度反馈和状态展示
3. **提升输出稳定性**：为 LLM 调用添加 system prompt、schema 校验和重试兜底，减少偶发错误
4. **完善演示体验**：增加预置演示数据和一键加载入口，降低演示摩擦，让客户 5 分钟内看到完整 Demo
5. **提升 AI 感知度**：增加题目来源展示、AI 评分详情、完成后的分析报告，让客户感受到 AI 价值

---

## 11. Agent 能力升级路线图

### 阶段一：修复 Bug + 基础稳定化（1～3 天）

**目标：** 让演示链路完整跑通，无崩溃

- 修复前后端字段不匹配（title/content、options 格式、correct/is_correct、score）
- 为 generator 和 evaluator 添加 try/except + 重试（最多 2 次）
- 加统一 JSON parse 兜底，失败时返回友好错误
- 区分 timeout、failed、generating 状态，给用户清晰提示
- 添加题目默认分值（按题型：单选 2 分、多选 3 分、判断 1 分、填空 2 分、问答 5 分）

### 阶段二：提升 AI 质量 + 演示体验（3～7 天）

**目标：** 让 Agent 输出更稳定，演示体验流畅

- 抽离 system prompt，分别优化生成和评分的角色描述
- 出题进度可视化（"正在生成单选题 2/3..."）
- 增加预置演示数据（从合规手册预生成 20 道题，存为 JSON）
- 前端加"加载演示题目"快捷入口，跳过上传和等待
- 问答题评分增加相似度分数和详细 AI 点评展示
- 增加推荐配置按钮（单选 5 + 多选 3 + 判断 3 + 问答 2）

### 阶段三：增强 AI 能力 + 完善演示闭环（7～14 天）

**目标：** 让 Agent 有说服力，完整展示 AI 价值

- Prompt 中增加章节来源要求，题目展示"来自第 X 章"
- 答题完成后增加总结报告（按题型正确率、按难度正确率、薄弱章节提示）
- 增加 AI 出题过程日志展示（"正在分析文档结构…已识别 5 个章节…正在生成题目…"）
- 增加题目质量校验（重复题目检测、空题兜底）
- 支持导出题目为 Word/PDF（可选，演示亮点）

| 阶段 | 时间 | 升级目标 | 具体任务 | 交付物 | 验收标准 |
|---|---|---|---|---|---|
| 阶段一 | 1～3 天 | 演示链路稳定跑通 | 修复 4 处字段不匹配；加 LLM 兜底重试；加分值字段 | 可完整演示的 Demo | 上传文档→出题→答题→显示正确总分，全程无崩溃 |
| 阶段二 | 3～7 天 | AI 质量提升 + 演示体验 | System Prompt；进度展示；预置 Demo 数据；评分详情 | 演示流畅的 MVP | 5 分钟内完成一次完整演示，无需等待 30 秒 |
| 阶段三 | 7～14 天 | 完整 MVP Demo 闭环 | 章节来源；总结报告；AI 过程展示；质量校验 | 客户可展示 MVP | 演示后客户能清晰说出"这个 AI 做了什么、有什么价值" |

---

## 12. Agent 能力升级任务清单

| 编号 | 任务 | 类型 | 优先级 | 涉及文件/模块 | 复杂度 | 为什么要做 | 验收标准 |
|---|---|---|---|---|---|---|---|
| T01 | 修复 QuizPlayer 题目字段（title→content 或统一为 title） | 输出结构化 | P0 | `apps/web/src/components/QuizPlayer.tsx`，`apps/agent/app/api/quiz.py` | 低 | 当前题目内容无法显示，演示直接失败 | 题目文字正常显示 |
| T02 | 修复 QuizPlayer 选项格式（dict 转 array）| 输出结构化 | P0 | `apps/web/src/components/QuizPlayer.tsx` 或 `apps/agent/app/api/quiz.py` | 低 | 选项无法渲染，选择题空白 | 选项正常显示 |
| T03 | 修复答题结果字段（is_correct vs correct） | 输出结构化 | P0 | `apps/web/src/components/QuizPlayer.tsx` | 低 | 对错判断完全失效 | 答题后正确/错误标识正常显示 |
| T04 | 增加题目分值字段 | 输出结构化 | P0 | `apps/agent/app/api/quiz.py`，`apps/agent/app/db/models.py`（可选加字段）| 低 | 总分永远为 0 | 答题完成后总分正确计算 |
| T05 | LLM 输出 JSON parse 兜底 + 重试（最多 2 次） | 输出兜底 | P0 | `apps/agent/app/quiz/generator.py`，`apps/agent/app/quiz/evaluator.py` | 低 | 偶发 500 崩溃 | LLM 返回无效 JSON 时自动重试，最终返回友好错误而非 500 |
| T06 | 区分 timeout / failed 状态，友好错误提示 | 输出兜底 | P0 | `apps/web/src/app/(app)/page.tsx` | 低 | 用户不知道失败原因 | 超时显示"超时"，失败显示"生成失败" |
| T07 | 抽离 Generator System Prompt | Prompt 优化 | P1 | `apps/agent/app/quiz/prompts.py`，`apps/agent/app/quiz/generator.py` | 低 | 无 system prompt，输出不稳定 | system 消息与 user 消息分离，LLM 输出一致性提升 |
| T08 | 抽离 Evaluator System Prompt | Prompt 优化 | P1 | `apps/agent/app/quiz/evaluator.py` | 低 | 无 system prompt | system 消息与 user 消息分离 |
| T09 | 出题进度可视化 | 前端 Agent 状态展示 | P1 | `apps/agent/app/api/quiz.py`，`apps/web/src/app/(app)/page.tsx` | 中 | 用户等待 30s+ 无任何反馈 | 出题过程中显示分阶段进度 |
| T10 | 预置演示数据（合规手册预生成题目 JSON） | Demo 场景 | P1 | 新增 `apps/agent/demo_data/demo_questions.json` | 中 | 演示摩擦大，需等 30 秒 | 有预置题目文件 |
| T11 | 前端"加载演示题目"快捷入口 | Demo 场景 | P1 | `apps/web/src/components/UploadPanel.tsx` | 低 | 演示时跳过上传等待 | 点击按钮直接进入答题，无需上传和等待 |
| T12 | 问答题评分展示相似度分数和详细 AI 点评 | 输出结构化 | P1 | `apps/web/src/components/QuizPlayer.tsx`，`apps/agent/app/api/quiz.py` | 低 | 评分粗糙，二值化体验差 | 问答题显示相似度百分比和详细评语 |
| T13 | QuizConfig 增加推荐配置按钮 | 示例问题 | P1 | `apps/web/src/components/QuizConfig.tsx` | 低 | 用户不知道推荐配置 | 有"推荐配置"一键填充 |
| T14 | Prompt 中增加章节来源要求（source_hint 字段） | Prompt 优化 | P2 | `apps/agent/app/quiz/prompts.py` | 低 | 题目无法溯源 | 生成题目带 source_hint 字段 |
| T15 | 前端展示题目章节来源 | 前端 Agent 状态展示 | P2 | `apps/web/src/components/QuizPlayer.tsx` | 低 | 增加 AI 说服力 | 每道题显示来源章节标签 |
| T16 | 答题完成后增加总结报告（按题型/难度统计） | Demo 场景 | P2 | `apps/web/src/components/QuizPlayer.tsx` | 中 | 演示收尾体验差 | 全部答完后展示分析报告 |
| T17 | AI 出题过程日志展示 | 前端 Agent 状态展示 | P2 | `apps/agent/app/api/quiz.py`，前端 | 高 | 增加 AI 存在感 | 出题时显示 AI 处理步骤 |
| T18 | 题目去重检测（同一 session 内） | 输出兜底 | P2 | `apps/agent/app/quiz/generator.py` | 中 | 分块处理可能生成重复题 | 同 session 无重复题目 |

---

## 13. 第一轮最应该做的 Agent 升级

| 顺序 | 任务 | 为什么先做 | 完成后的 Agent 变化 | 验收标准 |
|---|---|---|---|---|
| 1 | T01+T02+T03+T04 修复前后端字段不匹配 | 当前有 4 处 Bug 导致演示链路完全不可用，其他一切升级都以能跑通为前提 | 从"无法演示"变为"可以完整演示一遍" | 能完整演示：上传→配置→等待→答题→正确显示对错和总分 |
| 2 | T05 LLM 输出兜底 + 重试 | Bug 修完后最容易导致演示崩溃的是偶发 JSON parse 失败，必须兜底 | 从"偶发 500 崩溃"变为"失败自动重试，给出友好提示" | LLM 返回异常格式时不崩溃 |
| 3 | T07+T08 抽离 System Prompt | 成本极低（改几行代码），但能显著提升输出稳定性和角色一致性 | 题目质量更稳定，LLM 更准确遵循格式要求 | system/user 消息分离，输出格式错误减少 |
| 4 | T11 前端加"加载演示题目"快捷入口 | 演示时无需等待，直接展示 AI 出的高质量题目，大幅降低演示摩擦 | 从"需要等 30 秒"变为"5 秒进入答题" | 点击按钮 5 秒内加载演示题目 |
| 5 | T13 QuizConfig 推荐配置按钮 | 极低成本（前端加一个按钮），让演示配置更直观，引导客户看到更好的演示效果 | 演示配置更自然，不再需要解释每个选项 | 点击推荐配置，自动填入合理默认值 |
| 6 | T12 问答题评分展示详情 | 问答题 AI 评分是最有演示价值的功能，当前展示太简陋，增加相似度和点评后说服力翻倍 | AI 评分从"对/错"变为"85%相似 + AI 点评" | 问答题提交后显示相似度和详细评语 |

---

## 14. 推荐 Agent 架构升级方案

当前 `apps/agent/app/` 的目录结构已相对合理，不需要大重构。建议在现有基础上做轻量分层整理：

```
apps/agent/app/
├── api/
│   ├── auth.py              ✅ 保留，基本完整
│   ├── quiz.py              ⚠️ 修复字段 + 增加分值 + 进度状态
│   └── upload.py            ✅ 保留
├── db/
│   ├── database.py          ✅ 保留
│   ├── models.py            ⚠️ 可选：增加 score 字段到 QuizQuestion
│   └── repository.py        ✅ 保留
├── infrastructure/
│   └── config.py            ✅ 保留
├── quiz/
│   ├── prompts.py           🔧 拆分为 system_prompts.py + user_prompts.py
│   ├── generator.py         🔧 增加 try/except 兜底 + system prompt 支持
│   ├── evaluator.py         🔧 增加 try/except 兜底 + system prompt 支持
│   └── extractor.py         ✅ 保留
└── demo/                    ✨ 新增目录
    ├── demo_questions.json  ✨ 预生成的合规手册题目（约 20 题）
    └── loader.py            ✨ 加载预置题目的逻辑
```

### 各目录/文件职责说明

| 文件/目录 | 职责 | 建议操作 |
|---|---|---|
| `quiz/prompts.py` | 出题 prompt 模板（当前只有 user 消息）| 拆为 `SYSTEM_PROMPT`（角色定义）+ `USER_PROMPT`（任务+格式）|
| `quiz/generator.py` | 调用 LLM 生成题目 | 加 system 消息支持、try/except 重试、source_hint 字段 |
| `quiz/evaluator.py` | 问答题语义评分 | 加 system 消息支持、try/except 重试、返回相似度值 |
| `quiz/extractor.py` | 文件文本提取和分块 | 基本完整，可选加章节识别 |
| `api/quiz.py` | 出题 API + 答题 API | 修复字段名、增加分值、区分失败类型 |
| `demo/demo_questions.json` | 预置演示题目数据 | 新增，从合规手册预生成 |
| `demo/loader.py` | 加载预置题目 | 新增，复用 QuizQuestionRepo.bulk_create |

### 前端组件职责

| 组件 | 当前问题 | 建议 |
|---|---|---|
| `UploadPanel.tsx` | 缺少快捷演示入口 | 增加"使用演示文档"按钮 |
| `QuizConfig.tsx` | 无推荐配置 | 增加推荐配置按钮 |
| `QuizPlayer.tsx` | 4 处字段 Bug，无评分详情，无总结 | 修复字段、增加问答评分详情、增加答题总结 |
| `page.tsx`（主页） | 无进度反馈，失败信息不清晰 | 增加进度状态展示，区分错误类型 |

---

## 15. 推荐 Agent 调用链路升级

**升级后的目标链路（基于当前项目，不引入新框架）：**

```
用户选择"使用演示文档"或上传文件
↓
UploadPanel（前端）
↓
[演示模式] → 直接加载 demo_questions.json → 跳转答题
[上传模式] → POST /api/upload → FastAPI 保存文件，返回 session_id
↓
QuizConfig（前端）
→ 推荐配置一键填充（或用户自定义）
→ 点击"生成题目"
↓
POST /api/quiz/generate（Next.js 代理）
→ POST http://8004/api/v1/quiz/generate
→ FastAPI：启动 BackgroundTask
↓
BackgroundTask（后台）：
1. extract_text(file_path)           [提取文档文本]
2. chunk_text(text)                  [分块处理]
3. 对每种题型并发调用 generate_questions()
   → system prompt（角色 + 规则）+ user prompt（任务 + 文本）→ GPT-4o
   → JSON parse + 兜底重试（失败重试最多 2 次）
   → schema 基础校验（required 字段检查）
   → 写入数据库，更新进度（generating_single_choice / generating_multiple_choice / ...）
4. status = "done"
↓
前端轮询（每 2 秒）GET /api/quiz/{sessionId}
→ 返回 status + 当前已生成题型（进度）
→ 显示进度："已完成 2/5 种题型..."
↓
status = "done"
→ QuizPlayer（前端）加载题目列表（字段统一：title / options as array / score）
↓
用户逐题作答，点击"提交"
→ POST /api/quiz/answer
→ FastAPI：
  [选择题/判断/填空] → 精确匹配
  [问答题] → evaluate_free_response()
    → system prompt + user prompt → GPT-4o
    → 返回 {is_correct, similarity_score, feedback}
→ 前端展示：对错标识 + 解析 + [问答题展示相似度和 AI 点评]
↓
全部答完
→ 展示总结报告（总分 / 正确率 / 各题型正确率 / 建议）
→ 提供"重新生成"或"换一套题"按钮
```

---

## 16. 3 天 Agent 升级计划

**目标：** 让演示链路完整跑通，无崩溃，可以当场演示给客户看

| 时间 | 目标 | 任务 | 交付物 | 验收标准 |
|---|---|---|---|---|
| Day 1 | 修复所有演示 Bug | T01+T02+T03+T04（字段不匹配）；T05（LLM 兜底）；T06（错误提示）| 可跑通的 Demo | 完整演示流程无崩溃，总分正确显示 |
| Day 2 | 提升 AI 输出质量 | T07+T08（System Prompt）；T13（推荐配置）；T12（评分详情）| 更稳定的 AI 输出 | 题目格式稳定，评分有详细反馈 |
| Day 3 | 降低演示摩擦 | T10（预置演示数据）；T11（快捷演示入口）| 5 秒内可演示的 Demo | 点击"演示模式"5 秒进入答题 |

---

## 17. 7 天 Agent 升级计划

**目标：** 演示流畅，AI 输出稳定，有题目来源和总结报告

| 时间 | 目标 | 任务 | 交付物 | 验收标准 |
|---|---|---|---|---|
| Day 1-3 | 同 3 天计划 | T01-T13 | 可稳定演示的 Demo | 见 3 天计划验收标准 |
| Day 4-5 | 出题过程可视化 | T09（进度展示）；T14（章节来源 Prompt）| 有进度展示的 Demo | 出题时显示"正在生成单选题…"，题目显示来源章节 |
| Day 6-7 | 答题总结报告 | T15（章节来源展示）；T16（总结报告）| 完整 Demo 闭环 | 答完后展示按题型/难度的正确率报告 |

---

## 18. 14 天 Agent 升级计划

**目标：** 完整客户演示闭环，有 AI 过程感知，有数据支撑，说服力强

| 时间 | 目标 | 任务 | 交付物 | 验收标准 |
|---|---|---|---|---|
| Day 1-7 | 同 7 天计划 | T01-T16 | 有报告的稳定 Demo | 见 7 天计划验收标准 |
| Day 8-10 | 题目质量保障 | T18（去重检测）；增加空题兜底；Prompt 优化（减少幻觉）| 高质量题目 | 同 session 无重复题，文档内容不足时有友好提示 |
| Day 11-12 | AI 过程展示 | T17（出题过程日志）；简单展示 AI 分析步骤 | 有"AI 在想什么"的 Demo | 出题时展示"AI 正在分析第 3 章合规行为规范…" |
| Day 13-14 | Demo 打磨 | 多场景演示测试（上传不同文档）；预置 3 套不同场景题目；准备演示话术 | 可交付给客户演示的 MVP | 3 种不同文档各跑一遍演示，全程无 Bug |

---

## 19. 最终建议

### 1. 当前 Agent 最核心的问题是什么？

**前后端字段不匹配导致演示链路不可用**——题目内容不显示（`content` vs `title`），选项不渲染（dict vs array），对错判断失效（`correct` vs `is_correct`），总分永远为 0（缺少 `score` 字段）。这是必须最先修复的 Bug，其他一切升级都建立在演示能跑通的基础上。

### 2. 当前 Agent 是普通 LLM demo，还是已经有 Agent 能力？

**介于两者之间，更偏向 AI 自动化流水线而非 Agent。** 有明确业务场景和专用 Prompt，但无 system prompt、无工具调用、无意图识别、无 Planner，更接近"prompt → LLM → JSON 解析"的批处理流水线。核心价值在于"将培训材料自动转化为结构化题库"这个实用功能，而非 Agent 智能。

### 3. 最小升级路径是什么？

修复 4 处前后端字段 Bug（1 天）+ 增加 LLM 兜底重试（0.5 天）+ 加 System Prompt（0.5 天）+ 预置演示数据（1 天）= **3 天内完成，达到可稳定演示的状态**

### 4. 第一轮最应该改哪 5 个点？

1. **修复 QuizPlayer 字段 Bug**（title/options/is_correct/score）— 演示可用的基础
2. **LLM 输出 try/except 兜底 + 重试** — 防止演示时偶发崩溃
3. **抽离 System Prompt** — 低成本但显著提升输出稳定性
4. **预置演示数据 + 快捷入口** — 演示摩擦从 30 秒降为 5 秒
5. **问答题评分展示相似度** — 最有说服力的 AI 能力可视化

### 5. 哪些能力暂时不要做？

- 向量数据库 / 复杂 RAG（演示文档只有 19 页，全文注入完全够用）
- 多 Agent 编排（当前业务流程简单，不需要多 Agent）
- Function Calling / Tool Use（不在 MVP 演示核心路径上）
- SSE/WebSocket 实时推送（Polling 方案在修复进度显示后已够用）
- 登录、权限、后台管理、成本统计

### 6. 当前 Agent 升级到 MVP demo 预计需要几天？

**3 天可以达到稳定演示，7 天可以达到完整 MVP 演示闭环。**

### 7. 如果只能做一个方向，最应该优先提升什么能力？

**修复演示链路 Bug + 加预置演示数据。** 当前问题不是 AI 能力不足，而是有 Bug 导致无法演示。在 Bug 修复的基础上加快捷演示入口，就能立刻让客户看到产品价值。AI 能力优化（System Prompt、题目来源、评分详情）是锦上添花，Bug 修复是基础。

### 8. 下一步如果要开始改代码，建议从哪个任务开始？

**从 `apps/web/src/components/QuizPlayer.tsx` 开始**，这是影响最大且修改最直接的文件：

1. 将 `q.content` → `q.title`
2. 将 `options: string[]` 适配为 dict 格式（如 `Object.entries(q.options).map(([k,v]) => ...)` 展示 `A. 选项内容`）
3. 将 `r.correct` → `r.is_correct`
4. 将 `q.score` 改为按题型设定默认分值（`type === 'free_response' ? 5 : type === 'multiple_choice' ? 3 : 2`）

这 4 处修改集中在一个文件，完成后演示链路立即可用，是收益最高的起点。

---

*文档由 AI 架构分析生成，基于 2026-05-22 代码快照。代码变更后建议及时更新本文档。*
