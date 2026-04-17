import type { Metadata } from 'next'
import { Manrope, Sora } from 'next/font/google'

import { SiteFrame } from '@/components/site-frame'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const manrope = Manrope({
  variable: '--font-body',
  subsets: ['latin'],
})

const sora = Sora({
  variable: '--font-display',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Glaze | Installable Desktop AI Companion',
  description:
    'Download the Glaze desktop app, explore workflow articles, and browse the public site built around the installable glass-first AI companion.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${sora.variable}`}>
        <ThemeProvider>
          <SiteFrame>{children}</SiteFrame>
        </ThemeProvider>
      </body>
    </html>
  )
}
