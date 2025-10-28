'use client';

import { useRouter } from 'next/navigation';
import WorksiteSelect from '../../components/WorksiteSelect';
import { useWorksite } from '../../context/WorksiteContext';

export default function GerenciarObrasPage() {
  const router = useRouter();
  const { selectedWorksite } = useWorksite();

  const handleAdd = () => {
    router.push('/editarObra'); // Redireciona para a página de edição para adicionar uma nova obra
  };

  const handleEdit = () => {
    if (!selectedWorksite) {
      alert('Por favor, selecione uma obra para editar.');
      return;
    }
    router.push('/editarObra'); // Redireciona para a página de edição
  };

  const handleDelete = () => {
    if (!selectedWorksite) {
      alert('Por favor, selecione uma obra para apagar.');
      return;
    }
    const confirmDelete = window.confirm(
      `Deseja realmente excluir a obra "${selectedWorksite}"? Essa ação não pode ser desfeita.`
    );
    if (confirmDelete) {
      // Lógica para apagar a obra
      alert(`Obra "${selectedWorksite}" apagada com sucesso!`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-[#001489] mb-6">Gerenciar Obras</h1>
        <div className="mb-8">
          <label htmlFor="worksite" className="block text-lg font-medium text-gray-700 mb-2">
            Selecione uma obra:
          </label>
          <WorksiteSelect />
          <p className="mt-4 text-lg text-gray-700">
            Obra selecionada: <span className="font-semibold">{selectedWorksite || 'Nenhuma obra selecionada'}</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Adicionar Obra
          </button>
          <button
            onClick={handleEdit}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Editar Obra
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Apagar Obra
          </button>
        </div>
        <button
          onClick={() => router.push('/home')}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-lg hover:shadow-xl mt-4"
        >
          Voltar para Home
        </button>
      </div>
    </div>
  );
}