'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import routes from '../../routes';
import WorksiteSelect from '../components/worksiteselect';
import { useWorksite } from '../../context/WorksiteContext';

// Utility function to capitalize worksite names (handles composite names)
const capitalizeWorksite = (name: string) => {
  if (!name) return '';
  return name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

export default function EnviarBIMPage() {
  const router = useRouter();
  const { selectedWorksite } = useWorksite();
  const [bimFile, setBimFile] = useState<File | null>(null);

  const handleBIMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBimFile(e.target.files[0]);
    }
  };

  const handleConfirm = async () => {
    if (!selectedWorksite || !bimFile) {
      alert('Por favor, selecione uma obra e adicione um arquivo BIM.');
      return;
    }

    const formData = new FormData();
    formData.append('worksite', selectedWorksite);
    formData.append('file', bimFile);
    formData.append('type', 'modeloBIM');

    try {
      const response = await fetch('/api/s3', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert(`Arquivo BIM para a obra "${selectedWorksite}" foi enviado com sucesso!`);
      } else {
        const errorData = await response.json();
        console.error('Erro ao enviar o arquivo BIM:', errorData);
        alert('Ocorreu um erro ao enviar o arquivo BIM. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar o arquivo BIM:', error);
      alert('Ocorreu um erro ao enviar o arquivo BIM. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto h-20 w-20 bg-[#001489] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl">📁</span>
          </div>
          <h1 className="text-4xl font-bold text-[#001489] mb-2">
            Enviar BIM
          </h1>
          <p className="text-gray-600 text-lg">
            Envie o projeto BIM relacionado à obra selecionada
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-[#001489] mb-2">
              Enviando BIM para {capitalizeWorksite(selectedWorksite) || '...'}
            </h2>
          </div>

          <div className="mb-8">
            <div className="flex flex-col items-center gap-3">
              <label htmlFor="worksite" className="text-lg font-medium text-[#001489]">
                Selecione a obra:
              </label>
              <WorksiteSelect />
            </div>
          </div>

          <div className="mb-8">
            <div className="flex flex-col items-center gap-3">
              <label htmlFor="bimUpload" className="text-lg font-medium text-[#001489]">
                Adicione um arquivo BIM:
              </label>
              <input
                id="bimUpload"
                type="file"
                accept=".bim,.ifc"
                onChange={handleBIMChange}
                className="w-64 p-2 border border-blue-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {bimFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Arquivo selecionado: {bimFile.name}
                </p>
              )}
            </div>
          </div>

          <div className="text-center flex flex-col gap-4">
            <button
              onClick={handleConfirm}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl cursor-pointer"
            >
              Confirmar
            </button>

            <button
              onClick={() => router.push(routes.homePage)}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-lg hover:shadow-xl cursor-pointer"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}