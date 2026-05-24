'use client'
import { useState, useRef, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'upload' | 'form' | 'generating' | 'results'
type ImagePurpose = '主商品图' | '包装图' | '细节图' | '使用场景图' | '品牌参考图' | '材质参考图'
type RiskLevel = 'low' | 'medium' | 'high'

interface UploadedImage {
  id: string
  file: File
  dataUrl: string
  purpose: ImagePurpose
  isMain: boolean
}

interface FormData {
  productName: string
  category: string
  platform: string
  style: string
  targetAudience: string
  sellingPoints: string
  priceRange: string
  count: number
  constraints: {
    preserve_text: boolean
    allow_bg: boolean
    allow_props: boolean
    allow_models: boolean
    main_image: boolean
    social_image: boolean
    detail_image: boolean
  }
}

interface DesignResult {
  strategy: {
    positioning: string
    targetUser: string
    sellingPoints: string[]
    composition: string
    detailModules: string[]
    socialAngle: string
    background: string
    dimensions: string
    complianceNotes: string
  }
  designs: {
    type: string
    title: string
    description: string
    tagline: string
    subtagline: string
    promptZh: string
    promptEn: string
    negativePrompt: string
  }[]
  compliance: {
    riskLevel: RiskLevel
    risks: { term: string; riskType?: string; severity?: string; suggestion: string }[]
  }
  platform: string
  style: string
  platformDims: { ratio: string; size: string }
  hasVisionAnalysis?: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ['保健品', '美妆护肤', '电子产品', '家居用品', '食品饮料', '服装配饰']
const PLATFORMS = [
  { id: 'Amazon', label: 'Amazon', dims: '1:1 · 2000px', flag: '🇺🇸' },
  { id: 'Shopify', label: 'Shopify', dims: '4:5 · 1600px', flag: '🛒' },
  { id: '小红书', label: '小红书', dims: '3:4 · 1242px', flag: '❤️' },
  { id: '抖音', label: '抖音', dims: '9:16 · 1080px', flag: '🎵' },
  { id: '淘宝', label: '淘宝', dims: '1:1 · 800px', flag: '🏪' },
  { id: '拼多多', label: '拼多多', dims: '1:1 · 800px', flag: '💰' },
]
const STYLES = [
  { id: '高级浅金', label: '高级浅金', desc: '轻奢·礼盒·美妆', color: 'from-amber-50 to-yellow-100', border: 'border-amber-300', dot: 'bg-amber-400' },
  { id: '科技蓝', label: '科技蓝', desc: '电子·智能硬件', color: 'from-blue-900 to-indigo-900', border: 'border-blue-500', dot: 'bg-blue-400', dark: true },
  { id: '极简白', label: '极简白', desc: 'Amazon·Shopify', color: 'from-white to-gray-50', border: 'border-gray-200', dot: 'bg-gray-300' },
  { id: '夏日清新', label: '夏日清新', desc: '食饮·护肤·清爽', color: 'from-emerald-50 to-teal-100', border: 'border-emerald-300', dot: 'bg-emerald-400' },
  { id: '黑金质感', label: '黑金质感', desc: '高端·礼盒·贵价', color: 'from-gray-900 to-black', border: 'border-yellow-500', dot: 'bg-yellow-400', dark: true },
  { id: '自然原木', label: '自然原木', desc: '家居·食品·手作', color: 'from-amber-100 to-orange-100', border: 'border-amber-400', dot: 'bg-amber-600' },
]
const PRICE_RANGES = ['¥0-50 低客单', '¥50-200 中客单', '¥200-500 高客单', '¥500+ 超高客单']
const PROGRESS_STEPS = [
  '上传商品图到 AI ...',
  '🔍 GPT-4o Vision 分析商品视觉特征',
  '🎯 生成平台专属营销策略',
  '✍️ 构建多平台设计方案',
  '🎨 生成中英文出图 Prompt',
  '⚡ 合规检测与风险评估',
  '✅ 生成完成！',
]
const IMAGE_PURPOSES: ImagePurpose[] = ['主商品图', '包装图', '细节图', '使用场景图', '品牌参考图', '材质参考图']

const STYLE_CARD_CONFIG: Record<string, { cardBg: string; cardText: string; cardBorder: string; badgeBg: string; badgeText: string }> = {
  '高级浅金': { cardBg: 'from-amber-50 via-yellow-50 to-amber-100', cardText: 'text-amber-900', cardBorder: 'border-amber-200', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  '科技蓝': { cardBg: 'from-blue-900 via-indigo-900 to-blue-950', cardText: 'text-blue-50', cardBorder: 'border-blue-700', badgeBg: 'bg-blue-800', badgeText: 'text-blue-200' },
  '极简白': { cardBg: 'from-white to-gray-50', cardText: 'text-gray-800', cardBorder: 'border-gray-200', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600' },
  '夏日清新': { cardBg: 'from-emerald-50 via-teal-50 to-green-100', cardText: 'text-emerald-900', cardBorder: 'border-emerald-200', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
  '黑金质感': { cardBg: 'from-gray-900 via-zinc-900 to-black', cardText: 'text-yellow-300', cardBorder: 'border-yellow-700', badgeBg: 'bg-yellow-900/30', badgeText: 'text-yellow-400' },
  '自然原木': { cardBg: 'from-amber-100 via-orange-50 to-amber-50', cardText: 'text-amber-950', cardBorder: 'border-amber-300', badgeBg: 'bg-amber-200', badgeText: 'text-amber-800' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ phase }: { phase: Phase }) {
  const steps = [
    { id: 'upload', label: '上传商品图', icon: '📤' },
    { id: 'form', label: '填写信息', icon: '📝' },
    { id: 'generating', label: 'AI 生成中', icon: '⚡' },
    { id: 'results', label: '查看结果', icon: '🎨' },
  ]
  const current = steps.findIndex(s => s.id === phase)

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            i === current ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
            i < current ? 'bg-indigo-100 text-indigo-600' :
            'bg-slate-100 text-slate-400'
          }`}>
            <span>{step.icon}</span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px mx-1 ${i < current ? 'bg-indigo-300' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function MockDesignCard({
  design,
  style,
  platform,
  mainImage,
  formData,
  result,
}: {
  design: DesignResult['designs'][0]
  style: string
  platform: string
  mainImage: UploadedImage | null
  formData: FormData
  result: DesignResult
}) {
  const [showPrompts, setShowPrompts] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const styleConfig = STYLE_CARD_CONFIG[style] || STYLE_CARD_CONFIG['极简白']

  const DESIGN_ICONS: Record<string, string> = {
    '商品主图': '📦', '场景展示图': '🏡', '种草图': '❤️', '详情页卖点图': '✨', '活动促销图': '🔥'
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const productImage = mainImage ? mainImage.dataUrl : null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Design Preview */}
      <div className={`relative h-72 bg-gradient-to-br ${styleConfig.cardBg} overflow-hidden`}>
        {/* Decorative background elements */}
        {style === '科技蓝' && (
          <div className="absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-blue-400/20" />
          </div>
        )}
        {style === '高级浅金' && (
          <div className="absolute inset-0">
            <div className="absolute top-6 right-6 w-24 h-24 rounded-full bg-yellow-300/30 blur-2xl" />
            <div className="absolute bottom-6 left-6 w-20 h-20 rounded-full bg-amber-300/20 blur-2xl" />
          </div>
        )}
        {style === '黑金质感' && (
          <div className="absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />
            <div className="absolute top-6 right-6 w-20 h-20 rounded-full bg-yellow-400/10 blur-2xl" />
          </div>
        )}

        {/* Layout by design type */}
        {design.type === '商品主图' && (
          <div className="relative h-full flex flex-col items-center justify-center p-5">
            <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/30 mb-4">
              {productImage ? (
                <img src={productImage} alt="product" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl bg-white/20">📦</div>
              )}
            </div>
            <div className={`text-center px-4 ${styleConfig.cardText}`}>
              <div className="font-bold text-base leading-tight mb-1">{design.tagline || formData.productName}</div>
              <div className="text-xs opacity-70">{design.subtagline || (result.strategy.sellingPoints?.[0] || '高品质首选')}</div>
            </div>
          </div>
        )}

        {design.type === '场景展示图' && (
          <div className="relative h-full p-5 flex flex-col justify-between">
            <div className={`text-xs font-medium opacity-60 ${styleConfig.cardText}`}>{platform} · 场景展示</div>
            <div className="flex items-end justify-between">
              <div className={styleConfig.cardText}>
                <div className="font-bold text-base leading-tight">{design.tagline || formData.productName}</div>
                <div className="text-xs mt-1 opacity-70">{design.subtagline || '精选生活方式'}</div>
              </div>
              <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-xl opacity-90 shrink-0">
                {productImage ? (
                  <img src={productImage} alt="product" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-white/20">🏡</div>
                )}
              </div>
            </div>
          </div>
        )}

        {design.type === '种草图' && (
          <div className={`relative h-full flex flex-col p-5 ${styleConfig.cardText}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-400 flex items-center justify-center text-white text-xs font-bold">❤</div>
                <span className="text-xs font-bold opacity-80">种草好物</span>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-xs">★</span>)}
              </div>
            </div>
            <div className="flex gap-4 flex-1">
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg shrink-0">
                {productImage ? (
                  <img src={productImage} alt="product" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-white/20">❤️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm leading-tight mb-2">{design.tagline || formData.productName}</div>
                <div className="text-xs opacity-70 line-clamp-3 leading-relaxed">
                  {design.subtagline || result.strategy.socialAngle || '真实亲测，效果超出预期！'}
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {['好物推荐', formData.category, platform].map(tag => (
                    <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full ${styleConfig.badgeBg} ${styleConfig.badgeText}`}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {design.type === '详情页卖点图' && (
          <div className={`relative h-full flex flex-col p-5 ${styleConfig.cardText}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg shrink-0">
                {productImage ? (
                  <img src={productImage} alt="product" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl bg-white/20">✨</div>
                )}
              </div>
              <div>
                <div className="font-bold text-sm">{design.tagline || formData.productName}</div>
                <div className="text-xs opacity-60 mt-0.5">核心卖点</div>
              </div>
            </div>
            <div className="space-y-2.5 flex-1">
              {(result.strategy.sellingPoints || []).slice(0, 3).map((point, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                    style === '科技蓝' ? 'bg-blue-400 text-blue-900' :
                    style === '黑金质感' ? 'bg-yellow-400 text-gray-900' :
                    'bg-indigo-500 text-white'
                  }`}>{i + 1}</div>
                  <span className="opacity-85 text-xs leading-relaxed line-clamp-2">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {design.type === '活动促销图' && (
          <div className={`relative h-full flex flex-col items-center justify-center p-5 text-center ${styleConfig.cardText}`}>
            <div className="mb-3">
              <span className="text-xs font-bold px-3 py-1 bg-red-500 text-white rounded-full shadow-lg">🔥 限时特惠</span>
            </div>
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl mb-4">
              {productImage ? (
                <img src={productImage} alt="product" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl bg-white/20">🔥</div>
              )}
            </div>
            <div className="font-bold text-base mb-1">{design.tagline || formData.productName}</div>
            <div className="text-xs opacity-70 mb-3">{formData.priceRange}</div>
            <div className="px-5 py-2 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg cursor-pointer hover:bg-red-600">
              立即抢购 →
            </div>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold ${styleConfig.badgeBg} ${styleConfig.badgeText}`}>
            {DESIGN_ICONS[design.type] || '🎨'} {design.type}
          </span>
        </div>
        <div className="absolute bottom-2 right-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-lg ${styleConfig.badgeBg} ${styleConfig.badgeText} opacity-80`}>
            {platform} · {result.platformDims?.ratio || '1:1'}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/20 text-white/80">AI Mock</span>
        </div>
      </div>

      {/* Card info + prompts */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-semibold text-slate-800 text-sm">{design.title || design.type}</div>
          <span className="shrink-0 text-lg">{DESIGN_ICONS[design.type] || '🎨'}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{design.description}</p>

        <button
          onClick={() => setShowPrompts(!showPrompts)}
          className="w-full text-xs text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1.5 mt-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors font-medium"
        >
          {showPrompts ? '▲ 收起 Prompt' : '▼ 查看图片生成 Prompt'}
        </button>

        {showPrompts && (
          <div className="mt-3 space-y-3">
            {[
              { label: '中文 Prompt', content: design.promptZh, key: 'zh', accent: false },
              { label: 'English Prompt', content: design.promptEn, key: 'en', accent: false },
              { label: 'Negative Prompt', content: design.negativePrompt, key: 'neg', accent: true },
            ].map(({ label, content, key, accent }) => (
              <div key={key} className={`rounded-xl border p-3 ${accent ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${accent ? 'text-red-400' : 'text-slate-400'}`}>{label}</span>
                  <button
                    onClick={() => copyText(content, key)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg transition-colors ${
                      copied === key ? 'bg-green-100 text-green-600 font-medium' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    {copied === key ? '✓ 已复制' : '复制'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-4">{content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_FORM: FormData = {
  productName: 'NMN 精华胶囊',
  category: '保健品',
  platform: '小红书',
  style: '高级浅金',
  targetAudience: '25-45岁注重健康抗衰的都市白领女性',
  sellingPoints: '科研级纯度99.9%，每粒含NMN 250mg，日本原料进口，无添加无防腐剂，30天感受年轻活力',
  priceRange: '¥200-500 高客单',
  count: 4,
  constraints: {
    preserve_text: true,
    allow_bg: true,
    allow_props: true,
    allow_models: false,
    main_image: true,
    social_image: true,
    detail_image: true,
  },
}

const INPUT_CLASS = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white placeholder-slate-400"

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function StrategyBlock({ label, content, icon }: { label: string; content: string; icon: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{content || '-'}</p>
    </div>
  )
}

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [progressStep, setProgressStep] = useState(0)
  const [result, setResult] = useState<DesignResult | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mainImage = images.find(i => i.isMain) || images[0] || null

  function handleFiles(files: FileList) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    Array.from(files).slice(0, 6 - images.length).forEach(file => {
      if (!allowed.includes(file.type)) return
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => {
          const isFirst = prev.length === 0
          return [...prev, {
            id: Math.random().toString(36).slice(2),
            file,
            dataUrl: e.target?.result as string,
            purpose: '主商品图',
            isMain: isFirst,
          }]
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  function setMain(id: string) {
    setImages(prev => prev.map(img => ({ ...img, isMain: img.id === id })))
  }

  function removeImage(id: string) {
    setImages(prev => {
      const next = prev.filter(i => i.id !== id)
      if (next.length > 0 && !next.some(i => i.isMain)) next[0].isMain = true
      return next
    })
  }

  function setPurpose(id: string, purpose: ImagePurpose) {
    setImages(prev => prev.map(img => img.id === id ? { ...img, purpose } : img))
  }

  async function handleGenerate() {
    setError('')
    setPhase('generating')
    setProgressStep(0)

    let step = 0
    const timer = setInterval(() => {
      step = Math.min(step + 1, PROGRESS_STEPS.length - 2)
      setProgressStep(step)
    }, 2000)

    try {
      // Step A: upload images to backend so GPT-4o Vision can analyse them
      const imageIds: string[] = []
      for (const img of images) {
        const fd = new FormData()
        fd.append('file', img.file)
        fd.append('purpose', img.purpose)
        const uploadRes = await fetch('/api/agent/design/upload-image', {
          method: 'POST',
          body: fd,
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          imageIds.push(uploadData.image_id)
        }
      }

      // Step B: trigger three-step CoT generation
      const res = await fetch('/api/agent/design/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: formData.productName,
          category: formData.category,
          platform: formData.platform,
          style: formData.style,
          target_audience: formData.targetAudience,
          selling_points: formData.sellingPoints,
          price_range: formData.priceRange,
          count: formData.count,
          image_ids: imageIds,
          constraints: formData.constraints,
        }),
      })
      if (!res.ok) throw new Error('生成请求失败，请重试')
      const data = await res.json()

      // Step C: poll for result (up to 3 minutes), show real backend status
      const STATUS_TO_STEP: Record<string, number> = {
        pending: 0, analyzing: 1, strategizing: 2, generating: 3,
      }
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const poll = await fetch(`/api/agent/design/${data.session_id}`)
        if (!poll.ok) continue
        const pd = await poll.json()
        // advance progress bar based on actual backend status
        if (pd.status in STATUS_TO_STEP) {
          const backendStep = STATUS_TO_STEP[pd.status]
          setProgressStep(s => Math.max(s, backendStep))
        }
        if (pd.status === 'done' && pd.result) {
          clearInterval(timer)
          setProgressStep(PROGRESS_STEPS.length - 1)
          await new Promise(r => setTimeout(r, 600))
          setResult(pd.result)
          setPhase('results')
          return
        }
        if (pd.status === 'failed') throw new Error(pd.error || 'AI 生成失败')
      }
      throw new Error('生成超时，请重试')
    } catch (e) {
      clearInterval(timer)
      setError(String(e))
      setPhase('form')
    }
  }

  function handleReset() {
    setPhase('upload')
    setImages([])
    setResult(null)
    setError('')
    setProgressStep(0)
    setFormData(DEFAULT_FORM)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-100 px-6 py-8 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            AI 驱动 · 电商商品图智能设计
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            上传商品图，AI 自动生成<br className="hidden sm:block" />
            <span className="text-indigo-600">多平台展示设计图方案</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            支持淘宝 · 拼多多 · 小红书 · 抖音 · Amazon · Shopify<br />
            一键生成主图 / 场景图 / 种草图 / 详情图 + 中英文 Prompt
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <StepIndicator phase={phase} />

        {/* ─── Step 1: Upload ─── */}
        {phase === 'upload' && (
          <div className="space-y-6">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => images.length < 6 && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                images.length < 6
                  ? 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 bg-white'
                  : 'border-slate-200 bg-slate-50 cursor-default'
              }`}
            >
              <div className="text-5xl mb-4">📤</div>
              <div className="text-slate-800 font-semibold text-lg mb-1">
                {images.length === 0 ? '拖拽商品图到这里，或点击上传' : `已上传 ${images.length}/6 张，点击添加更多`}
              </div>
              <div className="text-slate-400 text-sm mb-4">支持 JPG / PNG / WEBP · 最多 6 张</div>
              {images.length === 0 && (
                <div className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                  <span>💡</span>
                  上传真实商品图，AI 将以产品为主体生成设计展示图
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {images.map(img => (
                  <div key={img.id} className="space-y-2">
                    <div
                      className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all relative ${
                        img.isMain ? 'border-indigo-500 shadow-lg shadow-indigo-100' : 'border-slate-200 hover:border-indigo-300'
                      }`}
                      onClick={() => setMain(img.id)}
                    >
                      <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                      {img.isMain && (
                        <div className="absolute inset-0 bg-indigo-600/10 flex items-end justify-center pb-1">
                          <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-bold">主图</span>
                        </div>
                      )}
                    </div>
                    <select
                      value={img.purpose}
                      onChange={e => setPurpose(img.id, e.target.value as ImagePurpose)}
                      onClick={e => e.stopPropagation()}
                      className="w-full text-[10px] border border-slate-200 rounded-md px-1 py-0.5 bg-white text-slate-600"
                    >
                      {IMAGE_PURPOSES.map(p => <option key={p}>{p}</option>)}
                    </select>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="w-full text-[10px] bg-red-50 text-red-400 rounded-md py-0.5 hover:bg-red-100 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setPhase('form')}
                className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2"
              >
                跳过上传，仅用文字描述生成
              </button>
              <button
                onClick={() => setPhase('form')}
                className="px-7 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                下一步：填写商品信息 →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Form ─── */}
        {phase === 'form' && (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                <FormCard title="📦 基本信息">
                  <FormField label="产品名称" required>
                    <input
                      value={formData.productName}
                      onChange={e => setFormData(p => ({ ...p, productName: e.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="例：NMN 精华胶囊"
                    />
                  </FormField>
                  <FormField label="产品品类" required>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFormData(p => ({ ...p, category: cat }))}
                          className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${
                            formData.category === cat
                              ? 'bg-indigo-600 text-white border-indigo-600 font-medium shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="目标人群">
                    <input
                      value={formData.targetAudience}
                      onChange={e => setFormData(p => ({ ...p, targetAudience: e.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="例：25-45岁都市白领女性"
                    />
                  </FormField>
                  <FormField label="价格带">
                    <div className="grid grid-cols-2 gap-2">
                      {PRICE_RANGES.map(r => (
                        <button
                          key={r}
                          onClick={() => setFormData(p => ({ ...p, priceRange: r }))}
                          className={`px-2 py-1.5 text-xs rounded-lg border transition-all text-left ${
                            formData.priceRange === r
                              ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </FormField>
                </FormCard>

                <FormCard title="✍️ 核心卖点">
                  <textarea
                    value={formData.sellingPoints}
                    onChange={e => setFormData(p => ({ ...p, sellingPoints: e.target.value }))}
                    className={`${INPUT_CLASS} h-28 resize-none`}
                    placeholder="详细描述产品核心卖点，例：纯度99.9%，日本进口原料，无添加，每粒含NMN 250mg，临床验证..."
                  />
                  <p className="text-xs text-slate-400">详细的卖点描述帮助 AI 生成更精准的营销文案和图片提示词</p>
                </FormCard>
              </div>

              <div className="space-y-5">
                <FormCard title="🌐 目标平台">
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setFormData(prev => ({ ...prev, platform: p.id }))}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          formData.platform === p.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-lg">{p.flag}</span>
                        <div>
                          <div className="text-xs font-semibold">{p.label}</div>
                          <div className={`text-[10px] ${formData.platform === p.id ? 'text-indigo-200' : 'text-slate-400'}`}>{p.dims}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </FormCard>

                <FormCard title="🎨 视觉风格">
                  <div className="grid grid-cols-2 gap-2">
                    {STYLES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setFormData(prev => ({ ...prev, style: s.id }))}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all bg-gradient-to-r ${s.color} ${
                          formData.style === s.id ? `${s.border} shadow-md` : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full shrink-0 ${s.dot} shadow-sm`} />
                        <div className="text-left">
                          <div className={`text-xs font-bold ${(s as {dark?: boolean}).dark ? 'text-white' : 'text-slate-800'}`}>{s.label}</div>
                          <div className={`text-[10px] ${(s as {dark?: boolean}).dark ? 'text-white/60' : 'text-slate-500'}`}>{s.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </FormCard>

                <FormCard title="⚙️ 生成设置">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">输出图片数量</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setFormData(p => ({ ...p, count: Math.max(3, p.count - 1) }))}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                      >-</button>
                      <span className="w-4 text-center font-bold text-slate-800">{formData.count}</span>
                      <button
                        onClick={() => setFormData(p => ({ ...p, count: Math.min(5, p.count + 1) }))}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                      >+</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 mt-3">
                    {[
                      { key: 'preserve_text', label: '保留原包装文字和 Logo' },
                      { key: 'allow_bg', label: '允许更换/优化背景' },
                      { key: 'allow_props', label: '允许增加道具和场景元素' },
                      { key: 'allow_models', label: '允许增加人物/手部/模特' },
                      { key: 'main_image', label: '偏向生成平台主图' },
                      { key: 'social_image', label: '偏向生成社媒种草图' },
                      { key: 'detail_image', label: '偏向生成详情页卖点图' },
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.constraints[item.key as keyof typeof formData.constraints]}
                          onChange={e => setFormData(p => ({
                            ...p,
                            constraints: { ...p.constraints, [item.key]: e.target.checked }
                          }))}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        />
                        <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </FormCard>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setPhase('upload')}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                ← 返回上传图片
              </button>
              <button
                onClick={handleGenerate}
                disabled={!formData.productName.trim()}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
              >
                <span className="text-base">⚡</span>
                生成商品展示设计图
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Generating ─── */}
        {phase === 'generating' && (
          <div className="max-w-sm mx-auto py-20 text-center">
            <div className="relative w-24 h-24 mx-auto mb-10">
              <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-25" />
              <div className="absolute inset-3 rounded-full bg-indigo-200 animate-pulse" />
              <div className="absolute inset-5 rounded-full bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-300">
                <span className="text-white text-3xl">🎨</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">AI 正在生成设计方案</h2>
            <p className="text-slate-500 text-sm mb-10">通常需要 15-30 秒，请稍候...</p>
            <div className="text-left space-y-3 bg-white rounded-2xl border border-slate-200 p-5">
              {PROGRESS_STEPS.map((step, i) => (
                <div key={i} className={`flex items-center gap-3 transition-all duration-700 ${
                  i < progressStep ? 'opacity-40' :
                  i === progressStep ? 'opacity-100' : 'opacity-25'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                    i < progressStep ? 'bg-green-100 text-green-600' :
                    i === progressStep ? 'bg-indigo-600 text-white animate-pulse' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {i < progressStep ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${i === progressStep ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 4: Results ─── */}
        {phase === 'results' && result && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>🎉</span> 设计方案生成完成
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  共 {result.designs.length} 张设计图 · {formData.platform} · {formData.style} · {result.platformDims?.size || ''} px
                </p>
                {result.hasVisionAnalysis && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-full text-xs text-violet-700 font-medium">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
                    GPT-4o Vision 已分析商品图像
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPhase('form')}
                  className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  调整参数重新生成
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  重新开始
                </button>
              </div>
            </div>

            {/* Marketing Strategy */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100 flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white text-base">📊</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800">商品营销策略分析</div>
                  <div className="text-xs text-slate-400">AI 基于商品信息深度分析生成</div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StrategyBlock label="商品定位" content={result.strategy.positioning} icon="🎯" />
                <StrategyBlock label="目标用户洞察" content={result.strategy.targetUser} icon="👤" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span>⭐</span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">核心卖点</span>
                  </div>
                  <div className="space-y-2">
                    {(result.strategy.sellingPoints || []).map((pt, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">{i+1}</span>
                        <span className="leading-relaxed">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <StrategyBlock label="推荐主图构图" content={result.strategy.composition} icon="🖼️" />
                <StrategyBlock label="社媒种草角度" content={result.strategy.socialAngle} icon="📱" />
                <StrategyBlock label="背景 · 灯光 · 材质" content={result.strategy.background} icon="💡" />
              </div>
            </div>

            {/* Design cards */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span>🎨</span> 商品展示设计图
                  <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
                    点击卡片查看图片生成 Prompt
                  </span>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {result.designs.map((design, i) => (
                  <MockDesignCard
                    key={i}
                    design={design}
                    style={formData.style}
                    platform={formData.platform}
                    mainImage={mainImage}
                    formData={formData}
                    result={result}
                  />
                ))}
              </div>
            </div>

            {/* Compliance */}
            <div className={`rounded-2xl border overflow-hidden ${
              result.compliance.riskLevel === 'high' ? 'border-red-200 bg-red-50' :
              result.compliance.riskLevel === 'medium' ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }`}>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚖️</span>
                  <div>
                    <div className="font-bold text-slate-800">合规检查</div>
                    <div className="text-xs text-slate-500">电商广告法合规风险自动检测</div>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  result.compliance.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                  result.compliance.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {result.compliance.riskLevel === 'high' ? '⚠️ 高风险' : result.compliance.riskLevel === 'medium' ? '⚠️ 中风险' : '✓ 低风险'}
                </span>
              </div>
              <div className="px-6 pb-5">
                {result.compliance.risks.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <span>✓</span> 当前卖点文案未检测到明显合规风险
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {result.compliance.risks.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm bg-white rounded-xl p-3 border border-slate-100">
                        <span className="shrink-0 mt-0.5">{r.severity === 'high' ? '🔴' : r.severity === 'medium' ? '🟡' : '🟠'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-slate-800">&ldquo;{r.term}&rdquo;</span>
                            {r.riskType && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{r.riskType}</span>
                            )}
                          </div>
                          <div className="text-slate-400 text-xs">建议改为：<span className="text-green-700 font-medium">&ldquo;{r.suggestion}&rdquo;</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200/50">
                  保健品/美妆/食品品类需特别注意广告法及平台规则，请在正式发布前进行人工合规审核
                </p>
              </div>
            </div>

            {/* Business value */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-8 text-white">
              <div className="text-center mb-8">
                <div className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-widest">商业价值</div>
                <h3 className="text-2xl font-bold mb-3">为电商团队创造真实价值</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  解决美工沟通成本高、商品素材产出慢、不同平台适配难的核心痛点
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {[
                  { icon: '🏪', label: '淘宝/拼多多商家', desc: '降低美工沟通成本，快速生成主图' },
                  { icon: '📱', label: '小红书/抖音团队', desc: '批量生成种草图，统一品牌风格' },
                  { icon: '🌎', label: '跨境电商卖家', desc: 'Amazon/Shopify 合规主图适配' },
                  { icon: '🏢', label: '代运营公司', desc: '高效服务多品牌，降低人力成本' },
                  { icon: '🎨', label: '商品图设计工作室', desc: 'AI 辅助出图，提升交付产能' },
                  { icon: '🚀', label: '初创品牌团队', desc: '低成本生成高质量展示素材' },
                ].map(t => (
                  <div key={t.label} className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-4 border border-white/10">
                    <div className="text-2xl mb-2">{t.icon}</div>
                    <div className="text-sm font-semibold text-white mb-1">{t.label}</div>
                    <div className="text-xs text-slate-400">{t.desc}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { plan: '轻量版', price: '¥199/月', features: ['50张/月', '6大平台', 'Prompt导出'], highlight: false },
                  { plan: '专业版', price: '¥599/月', features: ['300张/月', '合规检查', '批量生成', '优先处理'], highlight: true },
                  { plan: '企业版', price: '定制', features: ['无限生成', 'API接入', '私有化部署'], highlight: false },
                ].map(p => (
                  <div key={p.plan} className={`rounded-xl p-4 border ${p.highlight ? 'bg-indigo-600 border-indigo-500 shadow-xl' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{p.plan}</span>
                      {p.highlight && <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">推荐</span>}
                    </div>
                    <div className="text-xl font-bold mb-3">{p.price}</div>
                    <ul className="space-y-1.5">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="text-green-400">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-8 justify-center text-center pt-4 border-t border-white/10">
                {[
                  { num: '80%', label: '降低美工沟通成本' },
                  { num: '10x', label: '素材产出效率提升' },
                  { num: '6+', label: '主流平台一键适配' },
                  { num: '<30s', label: '从上传到设计方案' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold text-indigo-300">{s.num}</div>
                    <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
