"""
Three-step CoT generation pipeline:
  Step 1: Vision Analysis  — GPT-4o multimodal, understands product from images
  Step 2: Platform Strategy — derives platform-specific creative direction
  Step 3: Design Generation — produces detailed design cards + AI image prompts
"""
import json
from openai import OpenAI
from app.infrastructure.config import settings

client = OpenAI(api_key=settings.openai_api_key)

# ─── Platform Strategy Knowledge Base ────────────────────────────────────────

PLATFORM_STRATEGIES = {
    "Amazon": {
        "visual_logic": "conversion_focused",
        "core_principle": "信息密度优先，产品清晰可见，纯白底展示，建立信任感和专业感",
        "background": "纯白 #FFFFFF 或浅灰 #F9F9F9，无任何装饰性元素",
        "product_coverage": "产品主体占图面积 ≥85%，无遮挡，多角度清晰展示",
        "forbidden": ["文字叠加主图", "边框装饰", "水印", "促销价格标", "人物模特（主图）"],
        "key_image_types": ["纯白背景主图", "产品信息图（功能/规格）", "使用场景图", "功能对比图", "包装展示图"],
        "copy_style": "功能型，量化数据，Trust Signal（认证/奖项）",
        "conversion_hooks": ["清晰的规格参数", "产品变体清晰对比", "认证徽章展示"],
        "platform_tone": "专业、可信、信息密度高",
    },
    "Shopify": {
        "visual_logic": "brand_building",
        "core_principle": "品牌一致性优先，编辑质感，高端留白，建立品牌溢价",
        "background": "品牌色系或素雅背景，强调品质感和美学",
        "product_coverage": "产品主体占60-75%，留有设计呼吸感",
        "forbidden": ["低质感背景", "过度促销元素", "杂乱道具"],
        "key_image_types": ["品牌 Hero 图", "产品精致特写", "生活方式场景图", "品牌故事图"],
        "copy_style": "品牌叙事，情感认同，简洁有力，突出价值观",
        "conversion_hooks": ["品牌一致性视觉", "高质感材质展示", "生活方式认同"],
        "platform_tone": "精致、品牌化、有温度",
    },
    "小红书": {
        "visual_logic": "lifestyle_seeding",
        "core_principle": "种草逻辑，情感温度，真实生活场景，博主视角，引发共鸣",
        "background": "自然光场景、生活化道具、ins风软装，莫兰迪色系",
        "product_coverage": "产品融入生活场景，占40-60%，有环境感",
        "forbidden": ["过度精修的广告感", "白底纯商品图（用于封面）", "生硬的促销感"],
        "key_image_types": ["封面情感钩子图", "使用中的真实场景", "细节展示", "效果前后对比", "搭配场景图"],
        "copy_style": "第一人称，真实分享感，情感共鸣，#话题标签",
        "conversion_hooks": ["真实体验感", "生活方式认同", "精致日常场景", "使用前后对比"],
        "platform_tone": "真实、温暖、有质感、情感共鸣",
        "aesthetic": "日系/韩系，莫兰迪色系，自然材质，绿植/咖啡道具",
    },
    "抖音": {
        "visual_logic": "attention_capture",
        "core_principle": "黄金3秒视觉钩子，强冲击，大字报，即时满足感，冲动消费",
        "background": "高饱和度背景，强对比色，动态感",
        "product_coverage": "产品清晰可见，配合大字强调价值，视觉张力强",
        "forbidden": ["低对比度设计", "信息量不足", "安静的视觉表达"],
        "key_image_types": ["价格冲击封面图（竖版9:16）", "使用效果强对比图", "痛点解决图", "促销信息图"],
        "copy_style": "悬念式/冲击式，强行动指令",
        "conversion_hooks": ["价格锚点冲击", "限时紧迫感", "数量稀缺感", "真实使用效果"],
        "platform_tone": "强烈、冲击、即时、兴奋",
        "special_note": "即使是静图也必须有强烈视觉张力，模拟视频封面的冲击感",
    },
    "淘宝": {
        "visual_logic": "trust_and_value",
        "core_principle": "信任背书+价值感，促销氛围，清晰的产品展示，销量口碑",
        "background": "产品清晰展示，可有简单场景辅助",
        "product_coverage": "产品主体清晰，占70-85%",
        "forbidden": ["过于简约（缺乏促销感）", "纯艺术风格（不接地气）"],
        "key_image_types": ["主图（含关键卖点文字）", "促销活动图", "卖点说明图", "评价好评截图"],
        "copy_style": "信任背书，销量数据，活动促销感",
        "conversion_hooks": ["销量数据", "正品认证", "限时折扣", "买赠活动"],
        "platform_tone": "实惠、可信、接地气",
    },
    "拼多多": {
        "visual_logic": "price_perception",
        "core_principle": "极致价格感知，拼团社交感，节日氛围，紧迫感制造",
        "background": "高饱和红黄配色，节日氛围，热闹感",
        "product_coverage": "产品清晰，大面积促销信息",
        "forbidden": ["高冷设计感", "过于简约", "无价格信息"],
        "key_image_types": ["价格冲击主图（含大字价格）", "拼团信息图", "省钱计算器图", "工厂直发图"],
        "copy_style": "极致性价比，拼团社交，紧迫感制造",
        "conversion_hooks": ["极低价格感知", "拼团社交压力", "倒计时紧迫感"],
        "platform_tone": "热闹、实惠、社交感强、紧迫",
    },
}

PLATFORM_DIMS = {
    "Amazon": {"ratio": "1:1", "size": "2000x2000"},
    "Shopify": {"ratio": "4:5", "size": "1600x2000"},
    "小红书": {"ratio": "3:4", "size": "1242x1660"},
    "抖音": {"ratio": "9:16", "size": "1080x1920"},
    "淘宝": {"ratio": "1:1", "size": "800x800"},
    "拼多多": {"ratio": "1:1", "size": "800x800"},
}

STYLE_DESCRIPTIONS = {
    "高级浅金": "浅金色/米金色背景，柔光效果，玻璃反射感，轻奢氛围。光源：右上方45度射入的暖白色柔光",
    "科技蓝": "深蓝/深靛蓝背景，冷色光效，金属质感，玻璃折射光线。光源：蓝白色冷光，边缘高光",
    "极简白": "纯白或浅灰背景，极简排版，大量留白，产品为绝对主体。光源：均匀散射光",
    "夏日清新": "浅绿/浅蓝/自然光，清爽道具（植物/水果/水珠），户外自然感。光源：模拟阳光的暖白自然光",
    "黑金质感": "深黑/深灰背景，金色边缘高光，高端贵价感。光源：聚焦点光源，制造戏剧感",
    "自然原木": "木质台面/木纹背景，自然光，生活方式场景，有机感。光源：温暖的北欧窗边光",
}

COMPLIANCE_RULES = {
    "保健品": {
        "high_risk": [
            ("治疗|治愈|根治", "疾病声称（广告法违禁）"),
            ("医疗级|药效|临床证明疗效", "医疗声称"),
        ],
        "medium_risk": [
            ("逆转衰老|永久年轻", "夸大抗衰声称"),
            ("100%有效|绝对有效", "绝对化用语"),
        ],
        "safe_rewrites": {
            "治疗": "适合日常健康管理",
            "逆转衰老": "有助于维持健康状态",
            "100%有效": "坚持使用，感受变化",
        },
    },
    "美妆护肤": {
        "high_risk": [
            ("永久祛斑|彻底去斑", "永久效果声称"),
            ("医美级治疗", "医疗声称"),
        ],
        "medium_risk": [
            ("彻底修复|完全修复", "夸大修复"),
        ],
        "safe_rewrites": {
            "永久祛斑": "帮助改善肤色暗沉",
            "彻底修复": "帮助维持肌肤稳定状态",
        },
    },
    "食品饮料": {
        "high_risk": [
            ("治病|治疗疾病", "疾病声称"),
            ("减肥特效|必瘦", "疗效保证"),
        ],
        "medium_risk": [
            ("改善疾病|辅助治疗", "隐含医疗"),
        ],
        "safe_rewrites": {
            "降血糖": "适合低糖饮食人群",
            "减肥特效": "配合健康生活方式",
        },
    },
}


# ─── Step 1: Vision Analysis ──────────────────────────────────────────────────

def _step1_vision_analysis(image_data_list: list[dict]) -> dict:
    if not image_data_list:
        return {"has_images": False, "summary": "无参考图，仅基于文字描述生成"}

    content: list[dict] = [
        {
            "type": "text",
            "text": (
                "你是专业的电商商品视觉分析师。请分析这些商品图，提取关键视觉属性。\n\n"
                "以 JSON 格式返回：\n"
                "{\n"
                '  "has_images": true,\n'
                '  "main_colors": ["色彩1", "色彩2", "色彩3"],\n'
                '  "texture": "材质描述",\n'
                '  "shape": "形态描述",\n'
                '  "packaging_type": "包装类型",\n'
                '  "existing_brand_elements": "品牌元素描述",\n'
                '  "visual_style_current": "现有视觉风格",\n'
                '  "background_current": "当前背景",\n'
                '  "product_composition": "主体构图",\n'
                '  "design_suggestions": "设计建议（1-2句话）",\n'
                '  "summary": "整体视觉描述（2句话，供后续 prompt 使用）"\n'
                "}"
            ),
        }
    ]

    for idx, img in enumerate(image_data_list[:4]):
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{img['mime']};base64,{img['b64']}",
                "detail": "high",
            },
        })
        content.append({
            "type": "text",
            "text": f"[图片{idx + 1} - 角色: {img.get('purpose', '商品图')}]",
        })

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[{"role": "user", "content": content}],
        temperature=0.3,
        max_tokens=800,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content or "{}"
    try:
        return json.loads(raw)
    except Exception:
        return {"has_images": True, "summary": raw[:200]}


# ─── Step 2: Platform Strategy ───────────────────────────────────────────────

def _step2_platform_strategy(req: dict, vision: dict) -> dict:
    platform = req.get("platform", "淘宝")
    strategy_kb = PLATFORM_STRATEGIES.get(platform, PLATFORM_STRATEGIES["淘宝"])
    dims = PLATFORM_DIMS.get(platform, {"ratio": "1:1", "size": "800x800"})
    style = req.get("style", "极简白")
    style_desc = STYLE_DESCRIPTIONS.get(style, "")

    vision_summary = vision.get("summary", "无参考图")
    vision_colors = ", ".join(vision.get("main_colors", []))
    vision_texture = vision.get("texture", "")

    prompt = (
        f"你是 {platform} 平台顶级视觉营销专家，精通该平台的流量逻辑和转化机制。\n\n"
        f"## 商品信息\n"
        f"- 名称：{req.get('product_name')}\n"
        f"- 品类：{req.get('category')}\n"
        f"- 核心卖点：{req.get('selling_points')}\n"
        f"- 目标人群：{req.get('target_audience')}\n"
        f"- 价格带：{req.get('price_range')}\n\n"
        f"## 商品视觉分析\n"
        f"{vision_summary}\n"
        f"主色调：{vision_colors}\n"
        f"材质：{vision_texture}\n\n"
        f"## {platform} 平台规则\n"
        f"- 视觉逻辑：{strategy_kb['visual_logic']}\n"
        f"- 核心原则：{strategy_kb['core_principle']}\n"
        f"- 背景要求：{strategy_kb['background']}\n"
        f"- 平台调性：{strategy_kb['platform_tone']}\n"
        f"- 推荐图片类型：{', '.join(strategy_kb['key_image_types'])}\n"
        f"- 文案风格：{strategy_kb['copy_style']}\n"
        f"- 转化钩子：{', '.join(strategy_kb['conversion_hooks'])}\n"
        f"- 禁止事项：{', '.join(strategy_kb.get('forbidden', []))}\n\n"
        f"## 视觉风格\n"
        f"{style}：{style_desc}\n\n"
        f"## 输出尺寸\n"
        f"{dims['ratio']}，{dims['size']}px\n\n"
        f"请制定针对 {platform} 的视觉营销策略，JSON 格式返回：\n"
        "{\n"
        f'  "platform_positioning": "商品在{platform}的核心定位（2句话）",\n'
        '  "target_user_persona": "目标用户画像（2句话，具体到生活场景）",\n'
        '  "visual_direction": "视觉创作方向（3句话，具体描述色彩/构图/氛围）",\n'
        f'  "key_selling_angles": ["最打动{platform}用户的卖点角度1", "角度2", "角度3"],\n'
        '  "composition_strategy": "主图构图策略（具体：产品位置/背景/道具/光线）",\n'
        '  "color_palette": "推荐色彩方案（结合商品色彩和风格要求）",\n'
        f'  "copy_hooks": ["主标题钩子1（10字内）", "主标题钩子2", "副标题方向"],\n'
        '  "design_priority": "这批图片最重要的设计目标（1句话）"\n'
        "}"
    )

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": f"你是{platform}平台的顶级视觉营销专家。输出严格的JSON格式。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
        max_tokens=1000,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content or "{}"
    try:
        return json.loads(raw)
    except Exception:
        return {"platform_positioning": raw[:200]}


# ─── Step 3: Design Generation ───────────────────────────────────────────────

def _compliance_context(category: str) -> str:
    rules = COMPLIANCE_RULES.get(category, {})
    if not rules:
        return "注意避免绝对化用语。"
    high = [r[1] for r in rules.get("high_risk", [])]
    medium = [r[1] for r in rules.get("medium_risk", [])]
    rewrites = rules.get("safe_rewrites", {})
    lines = [f"【{category}合规要求】"]
    if high:
        lines.append(f"高风险禁用：{', '.join(high)}")
    if medium:
        lines.append(f"中风险慎用：{', '.join(medium)}")
    if rewrites:
        examples = "; ".join([f"'{k}'→'{v}'" for k, v in list(rewrites.items())[:3]])
        lines.append(f"安全替代示例：{examples}")
    return "\n".join(lines)


def _step3_design_generation(req: dict, vision: dict, strategy: dict, image_data_list: list[dict]) -> dict:
    platform = req.get("platform", "淘宝")
    style = req.get("style", "极简白")
    category = req.get("category", "通用")
    count = req.get("count", 4)
    constraints = req.get("constraints") or {}
    dims = PLATFORM_DIMS.get(platform, {"ratio": "1:1", "size": "800x800"})
    platform_kb = PLATFORM_STRATEGIES.get(platform, {})
    available_types = platform_kb.get("key_image_types", ["商品主图", "场景展示图", "卖点图"])
    has_images = vision.get("has_images", False)

    type_prefs = []
    if constraints.get("main_image"):
        type_prefs.append("平台主图（优先级最高）")
    if constraints.get("social_image"):
        type_prefs.append("社媒种草图")
    if constraints.get("detail_image"):
        type_prefs.append("详情页卖点图")
    type_pref_str = "、".join(type_prefs) if type_prefs else "按平台策略自动选择最优组合"

    allow_bg = "允许" if constraints.get("allow_bg") else "不允许"
    allow_props = "允许" if constraints.get("allow_props") else "不允许"
    allow_models = "允许" if constraints.get("allow_models") else "不允许"
    preserve_text = "必须" if constraints.get("preserve_text") else "可以适当调整"

    image_note = ""
    if has_images:
        image_note = (
            f"\n## 商品图视觉分析结果\n"
            f"{vision.get('summary', '')}\n"
            f"主色调：{', '.join(vision.get('main_colors', []))}\n"
            f"材质：{vision.get('texture', '')}\n"
            f"包装：{vision.get('packaging_type', '')}\n"
            f"品牌元素：{vision.get('existing_brand_elements', '')}\n"
            f"\n重要：promptZh 和 promptEn 必须以'参考提供的商品图'开头，明确要求保持产品外观一致。"
        )
    else:
        image_note = "\n无参考图，基于文字描述想象产品外观，在 prompt 中详细描述产品外观特征。"

    ar_flag = dims["ratio"].replace(":", ":")

    prompt = (
        f"你是资深电商视觉设计 AI，精通 Midjourney/Flux/DALL-E，深谙{platform}平台转化规律。\n\n"
        f"## 商品信息\n"
        f"- 名称：{req.get('product_name')}\n"
        f"- 品类：{category}\n"
        f"- 卖点：{req.get('selling_points')}\n"
        f"- 目标人群：{req.get('target_audience')}\n"
        f"- 价格带：{req.get('price_range')}\n"
        f"{image_note}\n\n"
        f"## 平台营销策略\n"
        f"平台：{platform} | 尺寸：{dims['ratio']}，{dims['size']}px\n"
        f"定位：{strategy.get('platform_positioning', '')}\n"
        f"用户画像：{strategy.get('target_user_persona', '')}\n"
        f"视觉方向：{strategy.get('visual_direction', '')}\n"
        f"构图策略：{strategy.get('composition_strategy', '')}\n"
        f"色彩方案：{strategy.get('color_palette', '')}\n"
        f"文案钩子：{', '.join(strategy.get('copy_hooks', []))}\n\n"
        f"## 视觉风格\n"
        f"{style}：{STYLE_DESCRIPTIONS.get(style, '')}\n\n"
        f"## 设计约束\n"
        f"- 背景更换：{allow_bg}\n"
        f"- 增加道具：{allow_props}\n"
        f"- 增加人物模特：{allow_models}\n"
        f"- 原包装文字：{preserve_text}保留\n"
        f"- 图片类型偏好：{type_pref_str}\n\n"
        f"## 合规要求\n"
        f"{_compliance_context(category)}\n\n"
        f"请生成 {count} 张设计图方案，从以下类型中选最适合{platform}的组合：\n"
        f"可选类型：{', '.join(available_types)}\n\n"
        "严格按以下 JSON 格式返回：\n"
        "{\n"
        '  "strategy": {\n'
        '    "positioning": "商品定位（2句话）",\n'
        '    "targetUser": "目标用户画像（2句话）",\n'
        '    "sellingPoints": ["核心卖点1", "核心卖点2", "核心卖点3"],\n'
        '    "composition": "主图构图建议（1句话）",\n'
        '    "detailModules": ["详情页模块1", "模块2", "模块3"],\n'
        '    "socialAngle": "社媒种草角度（1句话）",\n'
        '    "background": "背景/灯光/材质建议",\n'
        f'    "dimensions": "{dims["ratio"]}，{dims["size"]}px",\n'
        '    "complianceNotes": "合规风险提示"\n'
        '  },\n'
        '  "designs": [\n'
        '    {\n'
        '      "type": "图片类型（从可选类型中选）",\n'
        '      "title": "设计标题（8字内）",\n'
        '      "description": "设计说明（3句话：构图+背景+传达效果）",\n'
        '      "tagline": "主标题文案（10字内）",\n'
        '      "subtagline": "副标题/卖点文案（15字内）",\n'
        f'      "promptZh": "详细中文出图提示词（150字以上，{"以\'参考提供的商品图\'开头，" if has_images else ""}包含产品描述+构图+背景+光影+风格+氛围+细节）",\n'
        f'      "promptEn": "Professional English prompt for Midjourney/Flux (200+ words. {"Start with: based on the provided product reference image. " if has_images else ""}Include composition, background, lighting, style, atmosphere. End with --ar {ar_flag} --v 6 --q 2)",\n'
        '      "negativePrompt": "blurry, low quality, watermark, text errors, deformed product, inconsistent packaging, duplicate items, messy background, overexposed"\n'
        '    }\n'
        '  ],\n'
        '  "compliance": {\n'
        '    "riskLevel": "low",\n'
        '    "risks": [\n'
        '      {\n'
        '        "term": "风险词/声称",\n'
        '        "riskType": "风险类型",\n'
        '        "severity": "high/medium/low",\n'
        '        "suggestion": "安全替代表达"\n'
        '      }\n'
        '    ]\n'
        '  }\n'
        '}\n\n'
        "注意：\n"
        "1. sellingPoints 必须是3个元素的数组\n"
        "2. detailModules 必须是3个元素的数组\n"
        "3. risks 如无风险则返回 []\n"
        "4. riskLevel 只能是 low/medium/high\n"
        f"5. promptEn 必须包含 --ar {ar_flag}\n"
        f"6. {'所有 prompt 必须明确要求保持商品外观与参考图一致' if has_images else 'promptZh/promptEn 必须详细描述产品外观'}"
    )

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": "你是专业的电商视觉设计 AI 顾问。严格按要求输出 JSON 格式，不添加任何额外说明。",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.75,
        max_tokens=5000,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content or "{}"
    result = json.loads(raw)

    result["platform"] = platform
    result["style"] = style
    result["platformDims"] = PLATFORM_DIMS.get(platform, {"ratio": "1:1", "size": "800x800"})
    result["hasVisionAnalysis"] = has_images

    return result


# ─── Main Entry Point ─────────────────────────────────────────────────────────

def generate_design(session_id: int, req: dict, db_factory, image_data_list: list[dict]) -> None:
    db = db_factory()
    try:
        from app.db.repository import DesignSessionRepo
        repo = DesignSessionRepo(db)

        repo.update_status(session_id, "analyzing")
        vision = _step1_vision_analysis(image_data_list)

        repo.update_status(session_id, "strategizing")
        strategy = _step2_platform_strategy(req, vision)
        repo.update_vision_and_strategy(session_id, vision, strategy)

        repo.update_status(session_id, "generating")
        result = _step3_design_generation(req, vision, strategy, image_data_list)

        # validate and fix output schema
        from app.design.validator import validate_and_fix
        try:
            result = validate_and_fix(result)
        except Exception as ve:
            # retry once on validation failure
            result = _step3_design_generation(req, vision, strategy, image_data_list)
            result = validate_and_fix(result)

        repo.update_result(session_id, result)

    except Exception as e:
        from app.db.repository import DesignSessionRepo
        repo2 = DesignSessionRepo(db)
        repo2.update_error(session_id, str(e))
    finally:
        db.close()
