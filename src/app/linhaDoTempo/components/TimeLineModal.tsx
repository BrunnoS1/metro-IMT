'use client';

import { TimelineItem } from '@/types/types';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorksite } from '@/context/WorksiteContext';

interface TimelineModalProps {
  item: TimelineItem | null;
  onClose: () => void;
  onDelete: (item: TimelineItem) => Promise<void>;
}

export default function TimelineModal({ item, onClose, onDelete }: TimelineModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { selectedWorksite } = useWorksite();
  
  if (!item) return null;

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    try {
      await onDelete(item);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = () => {
    setEditedDescription(item.description);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedDescription('');
  };

  const handleSaveEdit = async () => {
    if (!editedDescription.trim() || editedDescription.length > 1000) {
      alert('A descrição deve ter entre 1 e 1000 caracteres.');
      return;
    }

    if (!selectedWorksite) {
      alert('Selecione uma obra antes de editar a descrição.');
      return;
    }

    setIsSaving(true);

    try {
      // Extract filename from URL
      const url = new URL(item.image);
      const pathParts = url.pathname.split('/');
      const filename = pathParts[pathParts.length - 1];

      // Normalize URL to match RDS format
      const canonicalUrl = item.image.replace(/\.s3\.[a-z0-9-]+\.amazonaws\.com/i, '.s3.amazonaws.com');

      const response = await fetch('/api/fotos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worksite: selectedWorksite,
          nome_arquivo: filename,
          url_s3: canonicalUrl,
          descricao: editedDescription.trim(),
        }),
      });

      if (response.ok) {
        alert('Descrição atualizada com sucesso!');
        setIsEditing(false);
        // Store the current worksite before reload to preserve selection
        const worksiteContext = sessionStorage.getItem('metro_worksite');
        if (worksiteContext) {
          sessionStorage.setItem('metro_worksite_after_delete', worksiteContext);
        }
        // Reload to refresh the description
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Erro ao salvar descrição:', errorData);
        alert(errorData.error || 'Ocorreu um erro ao salvar a descrição. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar descrição:', error);
      alert('Ocorreu um erro ao salvar a descrição. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-[#001489]/50 p-4"
      onClick={onClose}
    >
      {/* Aumentei um pouco o max-width (max-w-3xl) para acomodar melhor o texto ao lado da imagem */}
      <div
        className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- HEADER DO MODAL --- */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 bg-gray-50">
          <div className="pr-8">
            <h2 className="text-2xl font-bold text-[#001489] leading-tight">
              {item.title}
            </h2>
            <p className="text-sm font-semibold text-gray-500 mt-1">
              {item.date}
            </p>
          </div>
          {/* Botão de Fechar */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#001489] transition-colors p-1"
            aria-label="Fechar modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* --- CORPO DO MODAL (Scrollável se o texto for muito longo) --- */}
        <div className="p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Texto (lado esquerdo em telas grandes) */}
            <div className="flex-1 order-2 md:order-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-bold text-gray-800 flex items-center">
                  <span className="bg-[#001489] w-1 h-4 mr-2 rounded-full"></span>
                  Saiba mais:
                </h3>
                {!isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="text-[#001489] hover:text-blue-700 transition-colors p-1 flex-shrink-0"
                    aria-label="Editar descrição"
                    title="Editar descrição"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    maxLength={1000}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001489] resize-none"
                    placeholder="Digite a descrição..."
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {editedDescription.length}/1000 caracteres
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-300"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving || !editedDescription.trim()}
                        className="px-4 py-2 bg-[#001489] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                      >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-700 leading-relaxed overflow-y-auto overflow-x-hidden pr-2 break-words" style={{ maxHeight: '300px' }}>
                  {item.description}
                </div>
              )}
            </div>

            {/* Imagem de Referência (lado direito em telas grandes) */}
            <div className="order-1 md:order-2 flex-shrink-0">
              <div className="relative w-full md:w-56 h-40 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <Image
                  src={item.image}
                  alt={`Referência: ${item.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 224px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <p className="text-xs text-center text-gray-400 mt-2">
                Imagem de referência
              </p>
            </div>
          </div>
        </div>

        {/* --- FOOTER DO MODAL (Botão de Apagar) --- */}
        <div className="flex flex-col md:flex-row md:justify-between gap-4 p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const worksite = sessionStorage.getItem('metro_worksite') || '';
                if (!worksite) {
                  alert('Selecione uma obra antes de comparar com o BIM.');
                  return;
                }
                if (!item.fotoId) {
                  alert('Foto inválida para comparação.');
                  return;
                }
                const encoded = encodeURIComponent(item.image);
                router.push(`/comparacao/ancoras?image=${encoded}&fotoId=${item.fotoId}&worksite=${worksite}`);
              }}
              className="bg-[#001489] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#001367] transition-colors shadow-lg hover:shadow-xl cursor-pointer"
            >
              Comparar com BIM
            </button>
          </div>
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Apagando...' : 'Apagar Imagem'}
          </button>
        </div>
      </div>
    </div>
  );
}
