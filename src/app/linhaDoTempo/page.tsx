'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import routes from '../../routes';
import { useWorksite } from '../../context/WorksiteContext';
import Item from '../components/item';
import TimelineClient from "./components/TimeLineClient";
import { TimelineItem } from '../../types/types';

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
              const correctedDate = new Date(date.getTime());
              return {
                date: correctedDate.toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo'
                }),
                title: `Foto - ${correctedDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
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
        <TimelineClient timelineData={timelineData} />
      </div>
    </div>
  );
}