
'use client';

import { useWorksite } from '../context/WorksiteContext';

const worksites = [
  { id: 1, name: 'Vila Sônia' },
  { id: 2, name: 'Morumbi' },
  { id: 3, name: 'Butantã' },
  { id: 4, name: 'Pinheiros' },
  { id: 5, name: 'Faria Lima' },
];

export default function WorksiteSelect() {
  const { selectedWorksite, setSelectedWorksite } = useWorksite();

  return (
    <select
      value={selectedWorksite}
      onChange={(e) => setSelectedWorksite(e.target.value)}
      className="w-64 p-2 border border-blue-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold font-sans"
      style={{ fontFamily: 'inherit', color: '#374151' }}
    >
      <option value="">Selecione uma obra</option>
      {worksites.map((site) => (
        <option key={site.id} value={site.name}>
          {site.name}
        </option>
      ))}
    </select>
  );
}