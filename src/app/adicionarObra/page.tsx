'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdicionarObra() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEditing = !!id;

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchWorksite();
    }
  }, [id]);

  async function fetchWorksite() {
    try {
      const response = await fetch(`/api/rds?action=getWorksite&id=${id}`);
      if (response.ok) {
        const data = await response.json();
        setNome(data.nome);
        setDescricao(data.descricao || '');
      }
    } catch (error) {
      console.error('Erro ao buscar obra:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? JSON.stringify({ id, nome, descricao })
        : JSON.stringify({ nome, descricao });

      const response = await fetch('/api/rds', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (response.ok) {
        alert(isEditing ? 'Obra atualizada com sucesso!' : 'Obra adicionada com sucesso!');
        router.push('/gerenciarObras');
      } else {
        alert('Erro ao salvar obra');
      }
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
      alert('Erro ao salvar obra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            {isEditing ? 'Editar Obra' : 'Adicionar Nova Obra'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-2">
                Nome da Obra *
              </label>
              <input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                placeholder="Digite o nome da obra"
              />
            </div>

            <div>
              <label htmlFor="descricao" className="block text-sm font-semibold text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 resize-none"
                placeholder="Digite uma descrição (opcional)"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-md"
              >
                {loading ? 'Salvando...' : isEditing ? 'Atualizar Obra' : 'Adicionar Obra'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/gerenciarObras')}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-md"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}