'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import routes from '../../routes';
import { useWorksite } from '../../context/WorksiteContext';
import Item from '../components/item';

interface TimelineItem {
  date: string;
  image: string;
  description: string;
}

export default function LinhaDoTempoPage() {
  const { selectedWorksite } = useWorksite();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);

  useEffect(() => {
    const fetchTimelineData = async () => {
      if (!selectedWorksite) return;

      try {
        const response = await fetch(`/api/s3?worksite=${selectedWorksite}&type=fotos`);
        const data: { lastModified: string; url: string }[] = await response.json();

        if (response.ok) {
          setTimelineData(
            data.map((item) => {
              const date = new Date(item.lastModified);
              const correctedDate = new Date(date.getTime()); // Add 3 hours
              return {
                date: correctedDate.toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo'
                }),
                image: item.url,
                description: `Imagem enviada em ${correctedDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
              };
            })
          );
        } else {
          console.error('Erro ao buscar os dados da linha do tempo:', data);
        }
      } catch (error) {
        console.error('Erro ao buscar os dados da linha do tempo:', error);
      }
    };

    fetchTimelineData();
  }, [selectedWorksite]);

  const handleNext = () => {
    if (timelineData.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % timelineData.length);
  };

  const handlePrev = () => {
    if (timelineData.length === 0) return;
    setCurrentIndex((prevIndex) =>
      (prevIndex - 1 + timelineData.length) % timelineData.length
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto h-20 w-20 bg-[#001489] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl">🚇</span>
          </div>
          <h1 className="text-4xl font-bold text-[#001489] mb-2">
            Linha do Tempo da Obra de {selectedWorksite || '...'}
          </h1>
          <p className="text-gray-600 text-lg">
            Explore os eventos organizados por data
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          {timelineData.length === 0 && (
            <div className="bg-white rounded-lg border border-blue-100 p-6 text-center text-gray-600">
              Nenhuma foto encontrada para {selectedWorksite || 'esta obra'}.
            </div>
          )}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {timelineData.map((item, index) => (
                <Item key={index} item={item} />
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-[#001489] text-white p-3 rounded-full shadow-lg hover:bg-[#001489]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={timelineData.length <= 1}
          >
            &#8592;
          </button>
          <button
            onClick={handleNext}
            className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-[#001489] text-white p-3 rounded-full shadow-lg hover:bg-[#001489]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={timelineData.length <= 1}
          >
            &#8594;
          </button>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Link
            href={routes.homePage}
            className="bg-[#001489] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#001367] transition-colors shadow-lg hover:shadow-xl"
          >
            Voltar para a Página Inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
