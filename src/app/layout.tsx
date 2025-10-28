import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WorksiteProvider } from '../context/WorksiteContext';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Projeto Integrador',
  description: 'METRO',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <WorksiteProvider>
          <main className="min-h-screen">
            {children}
          </main>
        </WorksiteProvider>
      </body>
    </html>
  )
}