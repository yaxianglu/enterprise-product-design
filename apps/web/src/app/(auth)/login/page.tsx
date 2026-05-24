'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (res.ok) {
        window.location.href = redirectTo
      } else {
        const data = await res.json()
        setError(data.error ?? '登录失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-slate-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-xl mb-4">
            <span className="text-2xl">🎨</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">AI 商品图设计生成器</h1>
          <p className="text-sm text-slate-500 mt-1">请登录以开始使用</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              placeholder="demo"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-6">demo / demo1234</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
