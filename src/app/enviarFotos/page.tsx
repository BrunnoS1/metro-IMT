'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import routes from '../../routes';
import WorksiteSelect from '../../components/WorksiteSelect';
import { useWorksite } from '../../context/WorksiteContext';

export default function EnviarFotosPage() {
  const router = useRouter();
  const { selectedWorksite } = useWorksite();
  const [image, setImage] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleOpenCamera = () => {
    alert('Abrindo a câmera do dispositivo...');
    // Aqui você pode implementar a lógica para abrir a câmera do dispositivo
  };

  const handleConfirm = async () => {
    if (!selectedWorksite || !image) {
      alert('Por favor, selecione uma obra e adicione uma imagem.');
      return;
    }

    const formData = new FormData();
    formData.append('worksite', selectedWorksite);
    formData.append('file', image);
    formData.append('type', 'fotos');

    try {
      const response = await fetch('/api/aws', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert(`Imagem para a obra "${selectedWorksite}" foi enviada com sucesso!`);
      } else {
        const errorData = await response.json();
        console.error('Erro ao enviar a imagem:', errorData);
        alert('Ocorreu um erro ao enviar a imagem. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar a imagem:', error);
      alert('Ocorreu um erro ao enviar a imagem. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto h-20 w-20 bg-[#001489] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl">📷</span>
          </div>
          <h1 className="text-4xl font-bold text-[#001489] mb-2">
            Envio de Fotos
          </h1>
          <p className="text-gray-600 text-lg">
            Envie imagens relacionadas à obra selecionada
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-[#001489] mb-2">
              Enviando imagens para {selectedWorksite || '...'}
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
              <label htmlFor="imageUpload" className="text-lg font-medium text-[#001489]">
                Adicione uma imagem:
              </label>
              <div className="flex gap-4">
                <input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  onClick={() => document.getElementById('imageUpload')?.click()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Selecionar Arquivo
                </button>
                <button
                  onClick={handleOpenCamera}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Abrir Câmera
                </button>
              </div>
              {image && (
                <p className="text-sm text-gray-600 mt-2">
                  Imagem selecionada: {image.name}
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