import Image from 'next/image';

interface TimelineItemProps {
  item: {
    date: string;
    image: string;
    description: string;
  };
}

export default function Item({ item }: TimelineItemProps) {
  return (
    <div className="flex-shrink-0 w-full p-4" style={{ minWidth: '100%' }}>
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="aspect-[4/3] relative overflow-hidden rounded-md mb-4">
          <Image
            src={item.image}
            alt={`Imagem do evento`}
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
  );
}
