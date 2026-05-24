'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface NavBarProps { username: string }

export function NavBar({ username }: NavBarProps) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <nav className="border-b bg-white/90 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between shrink-0 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-xl">🎨</span>
          <span className="font-bold text-slate-900">AI 商品图设计生成器</span>
        </Link>
        <span className="hidden sm:inline-block text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">Beta</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <a href="https://demo.luyaxiang.com" className="text-xs text-gray-400 hover:text-blue-600 whitespace-nowrap hidden sm:inline">← 演示平台</a>
        <span className="text-slate-500 hidden sm:inline">{username}</span>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-red-500 transition-colors text-xs px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          退出
        </button>
      </div>
    </nav>
  )
}
