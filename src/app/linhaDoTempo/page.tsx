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
        const response = await fetch(`/api/aws?worksite=${selectedWorksite}`);
        const data: { lastModified: string; url: string }[] = await response.json();

        if (response.ok) {
          setTimelineData(
            data.map((item) => ({
              date: item.lastModified,
              image: item.url,
              description: `Imagem enviada em ${new Date(item.lastModified).toLocaleDateString()}`,
            }))
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
    setCurrentIndex((prevIndex) => (prevIndex + 1) % timelineData.length);
  };

  const handlePrev = () => {
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
            className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-[#001489] text-white p-3 rounded-full shadow-lg hover:bg-[#001489]/90 transition"
          >
            &#8592;
          </button>
          <button
            onClick={handleNext}
            className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-[#001489] text-white p-3 rounded-full shadow-lg hover:bg-[#001489]/90 transition"
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
