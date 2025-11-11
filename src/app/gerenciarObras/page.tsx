'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Worksite {
  id: number;
  nome: string;
  descricao?: string;
}

export default function GerenciarObras() {
  const router = useRouter();
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorksites();
  }, []);

  async function fetchWorksites() {
    try {
      const response = await fetch('/api/rds?action=getWorksites');
      if (response.ok) {
        const data = await response.json();
        setWorksites(data);
      }
    } catch (error) {
      console.error('Erro ao buscar obras:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number, nome: string) {
    if (!confirm(`Tem certeza que deseja apagar a obra "${nome}"?`)) {
      return;
    }

    try {
      const response = await fetch('/api/rds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        alert('Obra apagada com sucesso!');
        fetchWorksites();
      } else {
        alert('Erro ao apagar obra');
      }
    } catch (error) {
      console.error('Erro ao apagar obra:', error);
      alert('Erro ao apagar obra');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/home')}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-md"
              >
                ← Voltar
              </button>
              <h1 className="text-3xl font-bold text-gray-800">Gerenciar Obras</h1>
            </div>
            <button
              onClick={() => router.push('/adicionarObra')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-md"
            >
              + Adicionar Obra
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-600">Carregando obras...</p>
          ) : worksites.length === 0 ? (
            <p className="text-center text-gray-600">Nenhuma obra cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-100 border-b-2 border-blue-200">
                    <th className="text-left p-4 font-semibold text-gray-700">ID</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Nome</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Descrição</th>
                    <th className="text-center p-4 font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {worksites.map((site) => (
                    <tr key={site.id} className="border-b hover:bg-blue-50 transition-colors">
                      <td className="p-4 text-gray-700">{site.id}</td>
                      <td className="p-4 text-gray-700 font-medium">{site.nome}</td>
                      <td className="p-4 text-gray-600">{site.descricao || '-'}</td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => router.push(`/adicionarObra?id=${site.id}`)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-4 py-2 rounded transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(site.id, site.nome)}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded transition-colors"
                          >
                            Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}