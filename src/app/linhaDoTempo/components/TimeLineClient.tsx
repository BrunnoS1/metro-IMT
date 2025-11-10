'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useWorksite } from '@/context/WorksiteContext';
import routes from '@/routes';
import { TimelineItem } from '@/types/types';
import TimelineModal from './TimeLineModal'; // Corrigi o 'TimeLine' para 'Timeline' para consistência

interface TimelineClientProps {
  timelineData: TimelineItem[];
}

export default function TimelineClient({ timelineData }: TimelineClientProps) {
  const { selectedWorksite } = useWorksite();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % timelineData.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + timelineData.length) % timelineData.length
    );
  };

  const handleItemClick = (item: TimelineItem) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  return (
    <>
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
              <div
                key={index}
                className="flex-shrink-0 w-full p-4"
                style={{ minWidth: '100%' }}
              >
                <div className="bg-white rounded-lg shadow-md p-4">
                  {/* <<< ALTERAÇÃO: 'mb-4' removido daqui >>> */}
                  <div
                    className="aspect-[4/3] relative overflow-hidden rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleItemClick(item)}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 256px) 100vw, 256px"
                      style={{ objectFit: 'cover' }}
                      className="rounded-md"
                    />
                    {/* <<< ALTERAÇÃO: Título e data embutidos na imagem >>> */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white rounded-b-md">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="text-sm opacity-80">{item.date}</p>
                    </div>
                  </div>
                  
                  {/* <<< ALTERAÇÃO: Título, data e descrição removidos daqui >>> */}
                  {/* <h3 className="text-lg font-semibold text-[#001489] mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{item.date}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {item.description}
                    </p>
                  */}
                </div>
              </div>
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

      {/* Renderização condicional do Modal */}
      {selectedItem && (
        <TimelineModal item={selectedItem} onClose={handleCloseModal} />
      )}
    </>
  );
}