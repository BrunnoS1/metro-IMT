'use client';

import { useWorksite } from '../../context/WorksiteContext';
import { useEffect, useState } from 'react';

interface Worksite {
  id: number;
  nome: string;
}

export default function worksiteselect() {
  const { selectedWorksite, setSelectedWorksite } = useWorksite();
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorksites() {
      try {
        const response = await fetch('/api/rds?action=getWorksites');
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            setWorksites(data);
            setError(null);
          } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            setError('Resposta inválida do servidor');
          }
        } else {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            setError(errorData.error || 'Erro ao carregar obras');
            console.error('Erro da API:', errorData);
          } else {
            setError('Erro ao carregar obras');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar obras:', error);
        setError('Erro de conexão ao buscar obras');
      } finally {
        setLoading(false);
      }
    }

    fetchWorksites();
  }, []);

  return (
    <div>
      <select
        value={selectedWorksite}
        onChange={(e) => setSelectedWorksite(e.target.value)}
        className="w-64 p-2 border border-blue-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold font-sans"
        style={{ fontFamily: 'inherit', color: '#374151' }}
        disabled={loading}
      >
        <option value="">
          {loading ? 'Carregando...' : error ? 'Erro ao carregar' : 'Selecione uma obra'}
        </option>
        {worksites.map((site) => (
          <option key={site.id} value={site.nome}>
            {site.nome}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}