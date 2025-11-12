'use client';

import { TimelineItem } from '@/types/types';
import Image from 'next/image';
import { useState } from 'react';

interface TimelineModalProps {
  item: TimelineItem | null;
  onClose: () => void;
  onDelete: (item: TimelineItem) => Promise<void>;
}

export default function TimelineModal({ item, onClose, onDelete }: TimelineModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!item) return null;

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    try {
      await onDelete(item);
    } finally {
      setIsDeleting(false);
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
          <div className="flex flex-col md:flex-row">
            {/* Texto (lado esquerdo em telas grandes) */}
            <div className="flex-1 order-2 md:order-1 mt-4 md:mt-0 md:pr-6">
              <h3 className="text-md font-bold text-gray-800 mb-3 flex items-center">
                <span className="bg-[#001489] w-1 h-4 mr-2 rounded-full"></span>
                Saiba mais:
              </h3>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.description}
              </div>
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
        <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50">
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