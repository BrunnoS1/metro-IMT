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

export default function EnviarFotosPage() {
  const router = useRouter();
  const { selectedWorksite } = useWorksite();
  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleOpenCamera = () => {
    alert('Abrindo a câmera do dispositivo...');
  };

  const handleConfirm = async () => {
    if (!selectedWorksite || !image) {
      alert('Por favor, selecione uma obra e adicione uma imagem.');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('worksite', selectedWorksite);
    formData.append('file', image);
    formData.append('type', 'fotos');

    try {
      const response = await fetch('/api/s3', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadedFilename(data.filename);
        setUploadedUrl(data.url);
        alert(`Imagem para a obra "${selectedWorksite}" foi enviada com sucesso! Agora você pode adicionar uma descrição.`);
      } else {
        console.error('Erro ao enviar a imagem:', data);
        alert('Ocorreu um erro ao enviar a imagem. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar a imagem:', error);
      alert('Ocorreu um erro ao enviar a imagem. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveDescription = async () => {
    console.log('[Salvar Descrição] Estado atual:', {
      uploadedFilename,
      uploadedUrl,
      descriptionLength: description.length,
      descriptionTrimmed: description.trim().length,
      selectedWorksite
    });

    if (!uploadedFilename) {
      alert('Arquivo não encontrado. Envie a imagem primeiro.');
      return;
    }

    const trimmed = description.trim();
    if (!trimmed) {
      alert('Por favor, escreva uma descrição válida.');
      return;
    }
    if (trimmed.length > 1000) {
      alert('A descrição deve ter no máximo 1000 caracteres.');
      return;
    }

    const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'pi-metro-bucket';
    const worksite = selectedWorksite || 'UNKNOWN';

    const originalUrl = uploadedUrl || `https://${bucket}.s3.amazonaws.com/obras/${worksite}/fotos/${uploadedFilename}`;
    const canonicalUrl = originalUrl.replace(/\.s3\.[a-z0-9-]+\.amazonaws\.com/i, '.s3.amazonaws.com');

    console.log('[Salvar Descrição] URL original:', originalUrl, 'URL canônica:', canonicalUrl);

    try {
      const response = await fetch('/api/fotos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worksite: selectedWorksite,      // <-- ESSENCIAL
          nome_arquivo: uploadedFilename,
          url_s3: canonicalUrl,
          descricao: trimmed,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Descrição salva com sucesso!');
        setImage(null);
        setDescription('');
        setUploadedFilename(null);
        setUploadedUrl(null);
      } else {
        console.error('Erro ao salvar descrição:', data);
        alert(data.error || 'Ocorreu um erro ao salvar a descrição. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar descrição:', error);
      alert('Ocorreu um erro ao salvar a descrição. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">
          <div className="mx-auto h-20 w-20 bg-[#001489] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl">📷</span>
          </div>
          <h1 className="text-4xl font-bold text-[#001489] mb-2">Envio de Fotos</h1>
          <p className="text-gray-600 text-lg">Envie imagens relacionadas à obra selecionada</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">

          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-[#001489] mb-2">
              Enviando imagens para {capitalizeWorksite(selectedWorksite) || '...'}
            </h2>
          </div>

          <div className="mb-8">
            <div className="flex flex-col items-center gap-3">
              <label className="text-lg font-medium text-[#001489]">Selecione a obra:</label>
              <WorksiteSelect />
            </div>
          </div>

          <div className="mb-8">
            <div className="flex flex-col items-center gap-3">
              <label className="text-lg font-medium text-[#001489]">Adicione uma imagem:</label>
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

              {image && <p className="text-sm text-gray-600 mt-2">Imagem selecionada: {image.name}</p>}
            </div>
          </div>

          <div className="text-center flex flex-col gap-4">
            {!uploadedFilename ? (
              <button
                onClick={handleConfirm}
                disabled={isUploading || !image}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 shadow-lg disabled:bg-gray-400"
              >
                {isUploading ? 'Enviando...' : 'Confirmar'}
              </button>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-700 font-semibold mb-2">✓ Imagem enviada com sucesso!</p>
                  <p className="text-sm text-gray-600">Arquivo: {uploadedFilename}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-lg font-medium text-[#001489] mb-2">Descrição da Imagem:</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1000}
                    rows={5}
                    placeholder="Escreva uma descrição..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-sm text-gray-500 mt-1 text-right">{description.length}/1000 caracteres</p>
                </div>

                <button
                  onClick={handleSaveDescription}
                  disabled={!description.trim()}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 shadow-lg disabled:bg-gray-400"
                >
                  Salvar Descrição
                </button>
              </>
            )}

            <button
              onClick={() => router.push(routes.homePage)}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 shadow-lg"
            >
              Voltar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
