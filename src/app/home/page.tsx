'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import routes from '../../routes'

const worksites = [
  { id: 1, name: 'Vila Sônia' },
  { id: 2, name: 'Morumbi' },
  { id: 3, name: 'Butantã' },
  { id: 4, name: 'Pinheiros' },
  { id: 5, name: 'Faria Lima' },
];

// Add this style tag right before the component
const selectStyle = {
  fontFamily: 'inherit'
} as const;

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [selectedWorksite, setSelectedWorksite] = useState('')

  useEffect(() => {
    // Verifica se o usuário está logado
    const token = localStorage.getItem('metro_token')
    const userData = localStorage.getItem('metro_user')

    if (!token || !userData) {
      router.push('/')
      return
    }

    setUser(JSON.parse(userData))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('metro_token')
    localStorage.removeItem('metro_user')
    router.push(routes.home)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001489] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto h-20 w-20 bg-[#001489] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl">🚇</span>
          </div>
          <h1 className="text-4xl font-bold text-[#001489] mb-2">
            Página de Teste
          </h1>
          <p className="text-gray-600 text-lg">
            Bem-vindo ao sistema do Metrô SP
          </p>
        </div>

        {/* Conteúdo */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-[#001489] mb-2">
              Olá, {user.name}!
            </h2>
            <p className="text-gray-600">
              Você acessou com sucesso a página protegida.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Email: {user.email}
            </p>
          </div>

          <div className="mb-8">
            <div className="flex flex-col items-center gap-3">
              <label htmlFor="worksite" className="text-lg font-medium text-[#001489]">
                Observando a obra:
              </label>

              <select
                id="worksite"
                value={selectedWorksite}
                onChange={(e) => setSelectedWorksite(e.target.value)}
                className="w-64 p-2 border border-blue-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold font-sans"
                style={{ fontFamily: 'inherit', color: '#374151' }}
              >
                <option style={{ fontFamily: 'inherit' }} value="">
                  Selecione uma obra
                </option>
                {worksites.map((site) => (
                  <option key={site.id} value={site.id} style={{ fontFamily: 'inherit' }}>
                    {site.name}
                  </option>
                ))}
              </select>


            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link
              href={routes.linhaDoTempoPage}
              className="bg-blue-50 p-6 rounded-lg border border-blue-200 block"
            >
              <h3 className="font-semibold text-[#001489] mb-2">Linha do Tempo</h3>
              <p className="text-sm text-gray-600">Veja a linha do tempo da construção</p>
            </Link>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-[#001489] mb-2">Funcionalidade 2</h3>
              <p className="text-sm text-gray-600">Descrição da segunda funcionalidade</p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-[#001489] mb-2">Funcionalidade 3</h3>
              <p className="text-sm text-gray-600">Descrição da terceira funcionalidade</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl cursor-pointer"
            >
              Sair do Sistema
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Metrô São Paulo - Sistema de Teste</p>
        </div>
      </div>
    </div>
  )
}