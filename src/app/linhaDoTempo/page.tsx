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
        // Fetch photos from S3
        const s3Response = await fetch(`/api/s3?worksite=${selectedWorksite}&type=fotos`);
        const s3Data: { lastModified: string; url: string; key: string }[] = await s3Response.json();

        console.log('S3 Data:', s3Data);

        // Fetch descriptions from RDS
        const rdsResponse = await fetch(`/api/fotos?worksite=${selectedWorksite}`);
        const rdsData: { url_s3: string; descricao: string }[] = await rdsResponse.json();

        console.log('RDS Data:', rdsData);

        // Normalize URL function to handle different S3 URL formats
        const normalizeUrl = (url: string) => {
          // Convert both formats to the same: remove region part
          // From: https://bucket.s3.us-east-2.amazonaws.com/path
          // To: https://bucket.s3.amazonaws.com/path
          return url.replace(/\.s3\.[a-z0-9-]+\.amazonaws\.com/i, '.s3.amazonaws.com');
        };

        // Create a map of normalized url to description
        const descriptionsMap = new Map(
          rdsData.map(item => [normalizeUrl(item.url_s3), item.descricao])
        );

        console.log('Descriptions Map size:', descriptionsMap.size);
        descriptionsMap.forEach((value, key) => {
          console.log('Map entry - Key:', key, 'Value:', value);
        });

        if (s3Response.ok) {
          setTimelineData(
            s3Data.map((item) => {
              const date = new Date(item.lastModified);
              const correctedDate = new Date(date.getTime());
              
              // Get description from RDS or use default (normalize URL for comparison)
              const normalizedUrl = normalizeUrl(item.url);
              const description = descriptionsMap.get(normalizedUrl) || 
                `Imagem enviada em ${correctedDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
              
              console.log('S3 URL:', item.url);
              console.log('Normalized URL:', normalizedUrl);
              console.log('Found description:', description);
              
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
                description: description,
              };
            })
          );
        } else {
          console.error('Erro ao buscar os dados da linha do tempo:', s3Data);
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