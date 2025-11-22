'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import routes from '../../routes';
import { useWorksite } from '../../context/WorksiteContext';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Color } from 'three';

export default function VisualizarBIMPage() {
  const router = useRouter();
  const { selectedWorksite } = useWorksite();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<IfcViewerAPI | null>(null);

  // Função para extrair todos os pontos 3D do BIM
  const extractPoints = async () => {
  const viewer = viewerRef.current;

  if (!viewer) {
    console.warn("Viewer não carregado ainda.");
    return;
  }

  if (!selectedWorksite) {
    alert("Nenhuma obra selecionada.");
    return;
  }

  const scene = viewer.context.getScene();
  const allPoints: { x: number; y: number; z: number }[] = [];

  scene.traverse((child: any) => {
    if (child.isMesh && child.geometry?.attributes?.position) {
      const pos = child.geometry.attributes.position.array;

      for (let i = 0; i < pos.length; i += 3) {
        allPoints.push({
          x: pos[i],
          y: pos[i + 1],
          z: pos[i + 2],
        });
      }
    }
  });

  console.log("TOTAL DE PONTOS 3D EXTRAÍDOS:", allPoints.length);

  const resp = await fetch("/api/bim-points", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      worksite: selectedWorksite,
      points: allPoints,
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error("Erro ao salvar pontos 3D:", data);
    alert("Erro ao salvar pontos 3D (veja o console).");
    return;
  }

  alert(`Pontos 3D salvos com sucesso!\nTotal: ${allPoints.length}`);
  console.log("Metadados salvos:", data);
};


  useEffect(() => {
    setLoading(true);
    setError(null);

    const loadBIMModel = async () => {
      if (!selectedWorksite) {
        setLoading(false);
        return;
      }

      try {
        if (viewerRef.current) {
          console.log('Disposing previous viewer');
          viewerRef.current.dispose();
          viewerRef.current = null;
        }

        console.log('Fetching BIM for worksite:', selectedWorksite);
        const response = await fetch(`/api/s3?worksite=${selectedWorksite}&type=bim`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar o modelo BIM');
        }

        if (!data || data.length === 0) {
          throw new Error('Nenhum modelo BIM encontrado para esta obra');
        }

        const bimFile = data[0];
        console.log('BIM file URL:', bimFile.url);

        if (!containerRef.current) {
          throw new Error('Container do viewer não encontrado');
        }

        const viewer = new IfcViewerAPI({
          container: containerRef.current,
          backgroundColor: new Color(0x333333),
        });
        viewerRef.current = viewer;

        viewer.axes.setAxes();
        viewer.grid.setGrid();

        viewer.context.ifcCamera.cameraControls.setPosition(10, 10, 10);
        viewer.context.ifcCamera.cameraControls.setTarget(0, 0, 0);

        viewer.IFC.setWasmPath('/');

        console.log('Loading IFC file from:', bimFile.url);
        const model = await viewer.IFC.loadIfcUrl(bimFile.url);

        console.log('IFC model loaded successfully:', model);
        console.log('Model ID:', model.modelID);

        const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
        console.log('IFC Project structure:', ifcProject);

        const IFCWALLSTANDARDCASE = 2056796005;
        const IFCWALL = 2391406946;
        const IFCSLAB = 1529196076;
        const IFCDOOR = 395920057;
        const IFCWINDOW = 3304561284;
        const IFCFURNISHINGELEMENT = 263784265;
        const IFCMEMBER = 1073191201;
        const IFCPLATE = 3171933400;
        const IFCBEAM = 753842376;
        const IFCCOLUMN = 843113511;

        const types = [
          IFCWALLSTANDARDCASE, IFCWALL, IFCSLAB, IFCDOOR, IFCWINDOW,
          IFCFURNISHINGELEMENT, IFCMEMBER, IFCPLATE, IFCBEAM, IFCCOLUMN
        ];

        let allIDs: number[] = [];
        for (const type of types) {
          const ids = await viewer.IFC.loader.ifcManager.getAllItemsOfType(
            model.modelID,
            type,
            false
          );
          if (ids && ids.length > 0) {
            console.log(`Found ${ids.length} items of type ${type}`);
            allIDs = allIDs.concat(ids);
          }
        }

        console.log('Total items found:', allIDs.length);

        if (allIDs.length > 0) {
          const subset = await viewer.IFC.loader.ifcManager.createSubset({
            modelID: model.modelID,
            scene: viewer.context.getScene(),
            ids: allIDs,
            removePrevious: true,
          });
          console.log('Created subset with', allIDs.length, 'elements:', subset);
        } else {
          console.warn('No geometry found in IFC file!');
        }

        console.log('Model children after subset:', model.children);

        await viewer.context.fitToFrame();

        viewer.context.renderer.postProduction.active = true;

        console.log(
          'Camera position:',
          viewer.context.ifcCamera.cameraControls.camera.position
        );

        console.log('Viewer setup complete');

        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar o modelo:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar o modelo BIM');
        setLoading(false);
      }
    };

    loadBIMModel();

    const handleResize = () => {
      if (viewerRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        viewerRef.current.context.renderer.renderer.setSize(width, height);
        viewerRef.current.context.ifcCamera.updateAspect();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (viewerRef.current) {
        console.log('Cleaning up viewer');
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, [selectedWorksite]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-4">
          <div className="mx-auto h-16 w-16 bg-[#001489] rounded-full flex items-center justify-center mb-3 shadow-lg">
            <span className="text-white text-2xl">🏗️</span>
          </div>
          <h1 className="text-3xl font-bold text-[#001489] mb-2">
            Visualização do Modelo BIM
          </h1>
          <p className="text-gray-600">
            {selectedWorksite
              ? `Visualizando modelo da obra ${selectedWorksite}`
              : 'Selecione uma obra para visualizar'}
          </p>
        </div>

        {/* Novo botão para extrair pontos */}
        <div className="text-center mb-6">
          <button
            onClick={extractPoints}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl cursor-pointer"
          >
            Extrair Pontos 3D
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 mb-4">
          <div className="relative w-full h-[450px] overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001489] mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando modelo BIM...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center text-red-600">
                  <p className="text-xl mb-2">😕</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <div
              ref={containerRef}
              className="w-full h-full"
            />
          </div>
        </div>

        <div className="text-center pb-4">
          <button
            onClick={() => router.push(routes.homePage)}
            className="bg-[#001489] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#001367] transition-colors shadow-lg hover:shadow-xl cursor-pointer"
          >
            Voltar para a Página Inicial
          </button>
        </div>

      </div>
    </div>
  );
}
