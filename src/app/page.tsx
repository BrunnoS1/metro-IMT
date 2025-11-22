'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import routes from '../routes';
import Button from './components/botaoteste';

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsNewPassword, setNeedsNewPassword] = useState(false)
  const [session, setSession] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotStage, setForgotStage] = useState<'request' | 'confirm'>('request')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [info, setInfo] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    // Validate new password if required
    if (needsNewPassword) {
      if (!newPassword || newPassword.length < 8) {
        setError('A nova senha deve ter no mínimo 8 caracteres')
        setLoading(false)
        return
      }
      if (newPassword !== confirmPassword) {
        setError('As senhas não coincidem')
        setLoading(false)
        return
      }
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          ...(needsNewPassword && { newPassword })
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Salva token e dados do usuário
        localStorage.setItem('metro_token', data.token)
        localStorage.setItem('metro_user', JSON.stringify(data.user))
        
        // Redireciona para a página de teste
        router.push(routes.homePage)
      } else if (data.challenge === 'NEW_PASSWORD_REQUIRED') {
        // User needs to set a new password
        setNeedsNewPassword(true)
        setSession(data.session)
        setError('Você precisa definir uma nova senha para continuar')
      } else {
        setError(data.error || 'Erro no login')
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    if (forgotStage === 'request') {
      if (!forgotEmail) {
        setError('Informe o email.')
        setLoading(false)
        return
      }
      try {
        const resp = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, action: 'init' })
        })
        const data = await resp.json()
        if (resp.ok && data.success) {
          setInfo('Código enviado. Verifique seu email (se existir).')
          setForgotStage('confirm')
        } else {
          setError(data.error || 'Falha ao enviar código.')
        }
      } catch (err) {
        setError('Erro de conexão. Tente novamente.')
      } finally {
        setLoading(false)
      }
    } else if (forgotStage === 'confirm') {
      if (!forgotCode || !forgotNewPassword) {
        setError('Código e nova senha são obrigatórios.')
        setLoading(false)
        return
      }
      if (forgotNewPassword.length < 8) {
        setError('Nova senha deve ter no mínimo 8 caracteres.')
        setLoading(false)
        return
      }
      if (forgotNewPassword !== forgotConfirmPassword) {
        setError('As senhas não coincidem.')
        setLoading(false)
        return
      }
      try {
        const resp = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: forgotEmail,
            action: 'confirm',
            code: forgotCode,
            newPassword: forgotNewPassword
          })
        })
        const data = await resp.json()
        if (resp.ok && data.success) {
          setInfo('Senha redefinida com sucesso. Faça login com a nova senha.')
          // Reset flows
          setForgotStage('request')
          setForgotCode('')
          setForgotNewPassword('')
          setForgotConfirmPassword('')
          setForgotMode(false)
          setEmail(forgotEmail) // prefill login email
        } else {
          setError(data.error || 'Falha ao redefinir senha.')
        }
      } catch (err) {
        setError('Erro de conexão. Tente novamente.')
      } finally {
        setLoading(false)
      }
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
        
        {/* Mensagens */}
        {(error || info) && (
          <div className={`px-4 py-3 rounded relative border ${error ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'}`}>
            <span className="block sm:inline">{error || info}</span>
          </div>
        )}
        
        {!forgotMode && (
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
              disabled={needsNewPassword}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors disabled:bg-gray-100"
              placeholder="admin@metro.sp.gov.br"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#001489] mb-1">
              {needsNewPassword ? 'Senha Temporária' : 'Senha'}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={needsNewPassword}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors disabled:bg-gray-100"
            />
          </div>

          {needsNewPassword && (
            <>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-[#001489] mb-1">
                  Nova Senha
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors"
                  placeholder="Mínimo 8 caracteres"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deve conter no mínimo 8 caracteres
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#001489] mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors"
                  placeholder="Digite a senha novamente"
                />
              </div>
            </>
          )}

          {!needsNewPassword && (
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
            </div>
          )}

          <div>
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full flex justify-center py-3 px-4 text-lg font-semibold cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {needsNewPassword ? 'Atualizando senha...' : 'Entrando...'}
                </div>
              ) : (
                needsNewPassword ? 'Definir Nova Senha' : 'Acessar Sistema'
              )}
            </Button>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setForgotMode(true); setForgotStage('request'); setError(''); setInfo(''); }}
              className="text-sm text-red-600 hover:text-red-500 font-medium cursor-pointer"
            >
              Esqueceu a senha?
            </button>
          </div>
        </form>
        )}

        {forgotMode && (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-6">
            <h2 className="text-xl font-semibold text-[#001489] text-center">Recuperar Senha</h2>
            {forgotStage === 'request' && (
              <>
                <div>
                  <label htmlFor="forgotEmail" className="block text-sm font-medium text-[#001489] mb-1">Email</label>
                  <input
                    id="forgotEmail"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors"
                    placeholder="seuemail@dominio.com"
                  />
                </div>
              </>
            )}
            {forgotStage === 'confirm' && (
              <>
                <div>
                  <label htmlFor="forgotCode" className="block text-sm font-medium text-[#001489] mb-1">Código de Verificação</label>
                  <input
                    id="forgotCode"
                    type="text"
                    required
                    value={forgotCode}
                    onChange={e => setForgotCode(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors"
                    placeholder="Código recebido por email"
                  />
                </div>
                <div>
                  <label htmlFor="forgotNewPassword" className="block text-sm font-medium text-[#001489] mb-1">Nova Senha</label>
                  <input
                    id="forgotNewPassword"
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={e => setForgotNewPassword(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div>
                  <label htmlFor="forgotConfirmPassword" className="block text-sm font-medium text-[#001489] mb-1">Confirmar Nova Senha</label>
                  <input
                    id="forgotConfirmPassword"
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={e => setForgotConfirmPassword(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#001489] focus:border-[#001489] transition-colors"
                    placeholder="Repita a nova senha"
                  />
                </div>
              </>
            )}
            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full flex justify-center py-3 px-4 text-lg font-semibold cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {forgotStage === 'request' ? 'Enviando...' : 'Redefinindo...'}
                  </div>
                ) : (
                  forgotStage === 'request' ? 'Enviar Código' : 'Confirmar Nova Senha'
                )}
              </Button>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setForgotMode(false); setForgotStage('request'); setError(''); setInfo(''); }}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
              >
                Voltar ao Login
              </button>
            </div>
          </form>
        )}

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