'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import routes from '../../routes';

const timelineData = [
  { date: '2023-01-01', image: '/images/img1.png', description: 'Descrição do evento 1' },
  { date: '2023-02-15', image: '/images/img2.png', description: 'Descrição do evento 2' },
  { date: '2023-03-10', image: '/images/img3.png', description: 'Descrição do evento 3' },
];

export default function LinhaDoTempoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<typeof timelineData[0] | null>(null);

  const handleImageClick = (item: typeof timelineData[0]) => {
    setSelectedItem(item);
    setIsModalOpen(true);
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
            Linha do Tempo
          </h1>
          <p className="text-gray-600 text-lg">
            Explore os eventos organizados por data
          </p>
        </div>

        {/* Timeline */}
        <div className="overflow-x-auto">
          <div className="flex space-x-6">
            {timelineData.map((item, index) => (
              <div key={index} className="flex-shrink-0 w-64">
                <button
                  onClick={() => handleImageClick(item)}
                  className="w-full h-full bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-left block p-4 cursor-pointer"
                >

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
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="relative w-full h-96 mb-4">
                <Image
                  src={selectedItem.image}
                  alt="Evento"
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded-lg"
                />
              </div>
              <h3 className="text-xl font-semibold text-[#001489] mb-2">
                {selectedItem.date}
              </h3>
              <p className="text-gray-600 mb-4">{selectedItem.description}</p>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-[#001489] text-white px-4 py-2 rounded hover:bg-[#001367] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

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
