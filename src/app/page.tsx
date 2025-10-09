'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/app/components/botaoteste'


export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Salva token e dados do usuário
        localStorage.setItem('metro_token', data.token)
        localStorage.setItem('metro_user', JSON.stringify(data.user))
        
        // Redireciona para a página de teste
        router.push('/teste')
      } else {
        setError(data.error || 'Erro no login')
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-[#001489] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl">🚇</span>
          </div>
          <h1 className="text-3xl font-bold text-[#001489] mb-2">
            Metrô São Paulo
          </h1>
          <p className="text-gray-600 font-medium">
            Bem vindo!
          </p>
        </div>
        
        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#001489] mb-1">
              Email Institucional
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors"
              placeholder="admin@metro.sp.gov.br"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#001489] mb-1">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-[#001489]">
                Manter conectado
              </label>
            </div>

            <a href="#" className="text-sm text-red-600 hover:text-red-500 font-medium">
              Esqueceu a senha?
            </a>
          </div>

          <div>
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full flex justify-center py-3 px-4 text-lg font-semibold"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Entrando...
                </div>
              ) : (
                'Acessar Sistema'
              )}
            </Button>
          </div>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-[#001489]">
            Problemas com o acesso?{' '}
            <a href="#" className="font-medium text-red-600 hover:text-red-500">
              Contate o suporte
            </a>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            © {new Date().getFullYear()} Metrô São Paulo
          </p>
        </div>
      </div>
    </div>
  )
}