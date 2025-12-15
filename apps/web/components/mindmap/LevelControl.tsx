'use client'

interface LevelControlProps {
  level: number
  onChange: (level: number) => void
}

/**
 * 펼침 레벨 조절 컴포넌트
 */
export default function LevelControl({ level, onChange }: LevelControlProps) {
  const levels = [
    { value: 1, label: '카테고리만' },
    { value: 2, label: '아이템 포함' },
    { value: 3, label: '전체 펼침' },
  ]

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
      <span className="text-sm text-slate-600 px-2">펼침 레벨:</span>
      <div className="flex gap-1">
        {levels.map((l) => (
          <button
            key={l.value}
            onClick={() => onChange(l.value)}
            className={`
              px-3 py-1.5 text-sm rounded-md transition-colors
              ${
                level === l.value
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
