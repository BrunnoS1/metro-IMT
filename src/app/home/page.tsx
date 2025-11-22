'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import routes from '../../routes'
import WorksiteSelect from '../components/worksiteselect';

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
  const [loadingBIM, setLoadingBIM] = useState(false)

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
            Monitoramento Inteligente - Metrô SP
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
              <WorksiteSelect />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link
              href={routes.linhaDoTempoPage}
              className="bg-blue-50 p-6 rounded-lg border border-blue-200 block hover:bg-blue-100 transition-colors"
            >
              <h3 className="font-semibold text-[#001489] mb-2">Linha do Tempo</h3>
              <p className="text-sm text-gray-600">Veja a linha do tempo da construção</p>
            </Link>

            <Link
              href={routes.enviarFotosPage}
              className="bg-blue-50 p-6 rounded-lg border border-blue-200 block hover:bg-blue-100 transition-colors"
            >
              <h3 className="font-semibold text-[#001489] mb-2">Enviar fotos</h3>
              <p className="text-sm text-gray-600">Escolha a obra e envie fotos da construção por aqui</p>
            </Link>

            <Link
              href={routes.enviarBIMPage}
              className="bg-blue-50 p-6 rounded-lg border border-blue-200 block hover:bg-blue-100 transition-colors"
            >
              <h3 className="font-semibold text-[#001489] mb-2">Enviar BIM</h3>
              <p className="text-sm text-gray-600">Envie o projeto BIM da construção</p>
            </Link>

            <Link
              href={routes.visualizarBIMPage}
              onClick={(e) => {
                e.preventDefault();
                setLoadingBIM(true);
                router.push(routes.visualizarBIMPage);
              }}
              className="bg-blue-50 p-6 rounded-lg border border-blue-200 block hover:bg-blue-100 transition-colors"
            >
              <h3 className="font-semibold text-[#001489] mb-2">Visualizar BIM</h3>
              <p className="text-sm text-gray-600">Veja o projeto BIM da construção</p>
            </Link>
          </div>

          <div className="text-center flex flex-col gap-4">
            <button
              onClick={() => router.push(routes.gerenciarObrasPage)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl cursor-pointer"
            >
              Gerenciar Obras
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl cursor-pointer"
            >
              Sair do Sistema
            </button>
            <div className="h-4"></div> {/* Espaço entre os botões */}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Metrô São Paulo - Sistema de Teste</p>
        </div>
      </div>

      {/* Loading Toast */}
      {loadingBIM && (
        <div className="fixed bottom-8 right-8 bg-[#001489] text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-slide-up z-50">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <div>
            <p className="font-semibold">Carregando Visualizador BIM</p>
            <p className="text-sm text-blue-200">Aguarde, isso pode levar alguns segundos...</p>
          </div>
        </div>
      )}
    </div>
  )
}