'use client'

import Link from 'next/link'
import { MainLayout } from '@/components/layout'

const features = [
  {
    title: '버전 비교',
    description: 'C++11 ~ C++23 표준 간 차이점을 분석합니다.',
    href: '/diff',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    title: '문서 생성',
    description: '마이그레이션 가이드, 릴리즈 노트를 자동 생성합니다.',
    href: '/generate',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: '코드 변환',
    description: '레거시 C++ 코드를 최신 표준으로 변환합니다.',
    href: '/modernize',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
]

const stats = [
  { label: '지원 버전', value: '7개', sub: 'C++98 ~ C++23' },
  { label: '분석 항목', value: '30+', sub: '버전별 변경사항' },
  { label: '문서 유형', value: '3종', sub: '가이드, 노트, 테스트' },
]

export default function Home() {
  return (
    <MainLayout title="홈" description="C++ 버전 분석 및 마이그레이션 도구">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="card p-5 hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
              {feature.icon}
            </div>
            <h3 className="text-base font-medium text-gray-900 mt-3">{feature.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-base font-medium text-gray-900 mb-3">빠른 비교</h3>
          <div className="flex gap-2">
            <Link href="/diff?from=cpp11&to=cpp14" className="btn-secondary text-xs">
              C++11 → C++14
            </Link>
            <Link href="/diff?from=cpp14&to=cpp17" className="btn-secondary text-xs">
              C++14 → C++17
            </Link>
            <Link href="/diff?from=cpp11&to=cpp17" className="btn-secondary text-xs">
              C++11 → C++17
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-medium text-gray-900 mb-3">최근 활동</h3>
          <p className="text-sm text-gray-500">아직 활동 내역이 없습니다.</p>
        </div>
      </div>
    </MainLayout>
  )
}
