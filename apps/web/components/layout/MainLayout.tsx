'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSidebar } from '@/lib/sidebar-context'

interface MainLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export function MainLayout({ children, title, description }: MainLayoutProps) {
  const { isOpen } = useSidebar()

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'pl-56' : 'pl-0'
        }`}
      >
        <Header title={title} description={description} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
