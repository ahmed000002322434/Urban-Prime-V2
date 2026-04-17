'use client'

import clsx from 'clsx'
import { LaptopMinimal, MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from 'next-themes'

const options = [
  {
    value: 'light',
    label: 'Light',
    icon: SunMedium,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: MoonStar,
  },
  {
    value: 'system',
    label: 'System',
    icon: LaptopMinimal,
  },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const activeTheme = theme ?? 'system'

  return (
    <div className="theme-toggle" role="group" aria-label="Theme selection">
      {options.map((option) => {
        const Icon = option.icon
        const active = activeTheme === option.value

        return (
          <button
            key={option.value}
            type="button"
            className={clsx('theme-option', active && 'is-active')}
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
          >
            <Icon size={14} />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
