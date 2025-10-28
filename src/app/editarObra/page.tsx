
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditarObraPage() {
  const router = useRouter();
  const [obra, setObra] = useState({
    nome: '',
    endereco: '',
    engenheiro: '',
    dataInicio: '',
    previsaoFim: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setObra((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Lógica para salvar a obra
    alert('Obra salva com sucesso!');
    router.push('/gerenciarObras'); // Redireciona de volta para a página de gerenciamento
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-[#001489] mb-6">Editar Obra</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-lg font-medium text-gray-700">Nome da Obra</label>
            <input
              type="text"
              name="nome"
              value={obra.nome}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-lg font-medium text-gray-700">Endereço</label>
            <input
              type="text"
              name="endereco"
              value={obra.endereco}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-lg font-medium text-gray-700">Engenheiro Responsável</label>
            <input
              type="text"
              name="engenheiro"
              value={obra.engenheiro}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-lg font-medium text-gray-700">Data de Início</label>
            <input
              type="date"
              name="dataInicio"
              value={obra.dataInicio}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-lg font-medium text-gray-700">Previsão de Fim</label>
            <input
              type="date"
              name="previsaoFim"
              value={obra.previsaoFim}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Salvar
          </button>
        </form>
        <button
          type="button"
          onClick={() => router.push('/gerenciarObras')}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-lg hover:shadow-xl mt-4"
        >
          Voltar para Gerenciar Obras
        </button>
      </div>
    </div>
  );
}