import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar username={session.username} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
