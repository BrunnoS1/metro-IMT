

// <<< DADOS DO LADO DO SERVIDOR >>>

import TimelineClient from "./components/TimeLineClient";

// (No futuro, você faria um 'fetch' ou 'await' do seu banco de dados aqui)
const getTimelineData = () => {
  return [
    {
      date: '24 de Abril de 1968',
      title: 'Fundação da Companhia do Metrô',
      description:
        'É fundada a Companhia do Metropolitano de São Paulo (Metrô), dando início oficial ao projeto de transporte subterrâneo da cidade.',
      image: '/images/img1.png',
    },
    {
      date: '14 de Setembro de 1974',
      title: 'Início da Operação Comercial',
      description:
        'O primeiro trecho da Linha 1-Azul (Norte-Sul) é inaugurado, conectando as estações Jabaquara e Vila Mariana. Foi a primeira linha de metrô do Brasil.',
      image: '/images/img2.png',
    },
    {
      date: '10 de Março de 1979',
      title: 'Inauguração da Linha 3-Vermelha',
      description:
        'Inicia-se a operação da Linha 3-Vermelha (Leste-Oeste), começando pelo trecho entre as estações Sé e Brás, expandindo a rede para a zona leste.',
      image: '/images/img3.png',
    },
    {
      date: '25 de Janeiro de 1991',
      title: 'Nasce a Linha 2-Verde',
      description:
        'A Linha 2-Verde (Paulista) é inaugurada, inicialmente com o trecho entre Consolação e Paraíso, passando pela importante Avenida Paulista.',
      image: '/images/img4.png',
    },
    {
      date: '20 de Outubro de 2002',
      title: 'Expansão com a Linha 5-Lilás',
      description:
        'A Linha 5-Lilás começa a operar, inicialmente como uma linha elevada de menor porte na Zona Sul, ligando Capão Redondo ao Largo Treze.',
      image: '/images/img5.png',
    },
    {
      date: '25 de Maio de 2010',
      title: 'Inovação com a Linha 4-Amarela',
      description:
        'A Linha 4-Amarela é inaugurada, sendo a primeira da rede a ser operada pela iniciativa privada (ViaQuatro) e a primeira com trens "driverless" (sem condutor).',
      image: '/images/img6.png',
    },
  ];
};

export default function LinhaDoTempoPage() {
  // 1. Buscamos os dados no servidor.
  const timelineData = getTimelineData();

  // 2. Renderizamos o layout estático (as divs de fundo e espaçamento).
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <TimelineClient timelineData={timelineData} />
      </div>
    </div>
  );
}