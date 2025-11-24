'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import routes from '../../routes';
import { useWorksite } from '../../context/WorksiteContext';
import TimelineClient from "./components/TimeLineClient";
import { TimelineItem } from '../../types/types';

export default function LinhaDoTempoPage() {
  const { selectedWorksite } = useWorksite();
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [viewMode, setViewMode] = useState<'fotos' | 'wireframe'>('fotos');

  useEffect(() => {
    const fetchTimelineData = async () => {
      if (!selectedWorksite) return;

      try {
        // Fetch S3 data based on view mode
        const s3Response = await fetch(
          `/api/s3?worksite=${selectedWorksite}&type=${viewMode}`
        );
        const s3Data: { lastModified: string; url: string; key: string }[] =
          await s3Response.json();

        console.log(`S3 Data (${viewMode}):`, s3Data);

        // Normalize S3 URL (remove região)
        const normalizeUrl = (url: string) =>
          url.replace(/\.s3\.[a-z0-9-]+\.amazonaws\.com/i, '.s3.amazonaws.com');

        if (viewMode === 'fotos') {
          // Fetch RDS descriptions + foto_id for photos
          const rdsResponse = await fetch(
            `/api/fotos?worksite=${selectedWorksite}`
          );
          const rdsData: { foto_id: number; url_s3: string; descricao: string }[] =
            await rdsResponse.json();

          console.log('RDS Data:', rdsData);

          // Maps para lookup rápido
          const descriptionsMap = new Map(
            rdsData.map(item => [normalizeUrl(item.url_s3), item.descricao])
          );

          const idMap = new Map(
            rdsData.map(item => [normalizeUrl(item.url_s3), item.foto_id])
          );

          // Montar timeline de fotos
          if (s3Response.ok) {
            setTimelineData(
              s3Data.map((item) => {
                const date = new Date(item.lastModified);
                const correctedDate = new Date(date.getTime());

                const normalizedUrl = normalizeUrl(item.url);

                const descricaoBD = descriptionsMap.get(normalizedUrl);
                const fotoIdBD = idMap.get(normalizedUrl) ?? null;

                return {
                  fotoId: fotoIdBD,
                  date: correctedDate.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                  }),
                  title: `Foto - ${correctedDate.toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                  })}`,
                  image: item.url,
                  description:
                    descricaoBD ||
                    `Imagem enviada em ${correctedDate.toLocaleDateString('pt-BR', {
                      timeZone: 'America/Sao_Paulo'
                    })}`,
                };
              })
            );
          } else {
            console.error('Erro ao buscar dados do S3:', s3Data);
          }
        } else {
          // Montar timeline de wireframes (sem RDS lookup)
          if (s3Response.ok) {
            setTimelineData(
              s3Data.map((item) => {
                const date = new Date(item.lastModified);
                const correctedDate = new Date(date.getTime());

                return {
                  fotoId: null,
                  date: correctedDate.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                  }),
                  title: `Wireframe - ${correctedDate.toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                  })}`,
                  image: item.url,
                  description: `Wireframe gerado em ${correctedDate.toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                  })}`,
                };
              })
            );
          } else {
            console.error('Erro ao buscar dados do S3:', s3Data);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar os dados da linha do tempo:', error);
      }
    };

    fetchTimelineData();
  }, [selectedWorksite, viewMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Toggle button */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setViewMode('fotos')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg  cursor-pointer ${
              viewMode === 'fotos'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}
          >
            📷 Fotos
          </button>
          <button
            onClick={() => setViewMode('wireframe')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg  cursor-pointer ${
              viewMode === 'wireframe'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-purple-600 hover:bg-purple-50'
            }`}
          >
            🔷 Wireframes
          </button>
        </div>

        <TimelineClient timelineData={timelineData} />
      </div>
    </div>
  );
}
