'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import routes from '../../routes';
import { useWorksite } from '../../context/WorksiteContext';

const timelineData = [
  { date: '2023-01-01', image: '/images/img1.png', description: 'Descrição do evento 1' },
  { date: '2023-02-15', image: '/images/img2.png', description: 'Descrição do evento 2' },
  { date: '2023-03-10', image: '/images/img3.png', description: 'Descrição do evento 3' },
  { date: '2023-04-20', image: '/images/img4.png', description: 'Descrição do evento 4' },
  { date: '2023-05-05', image: '/images/img5.png', description: 'Descrição do evento 5' },
  { date: '2023-05-15', image: '/images/img6.png', description: 'Descrição do evento 6' },
];

export default function LinhaDoTempoPage() {
  const { selectedWorksite } = useWorksite();
  const [currentIndex, setCurrentIndex] = useState(0);

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
                <div
                  key={index}
                  className="flex-shrink-0 w-full p-4"
                  style={{ minWidth: '100%' }}
                >
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="aspect-[4/3] relative overflow-hidden rounded-md mb-4">
                      <Image
                        src={item.image}
                        alt={`Imagem do evento ${index + 1}`}
                        fill
                        sizes="(max-width: 256px) 100vw, 256px"
                        style={{ objectFit: 'cover' }}
                        className="rounded-md"
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-[#001489] mb-2">
                      {item.date}
                    </h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
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
      </div>
    </div>
  );
}
