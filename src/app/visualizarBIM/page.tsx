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

  useEffect(() => {
    // Reset loading state
    setLoading(true);
    setError(null);
    
    const loadBIMModel = async () => {
      if (!selectedWorksite) {
        setLoading(false);
        return;
      }

      try {
        // Cleanup previous viewer if exists
        if (viewerRef.current) {
          console.log('Disposing previous viewer');
          viewerRef.current.dispose();
          viewerRef.current = null;
        }

        console.log('Fetching BIM for worksite:', selectedWorksite);
        const response = await fetch(`/api/aws?worksite=${selectedWorksite}&type=bim`);
        console.log('Fetch completed, parsing JSON...');
        const data = await response.json();
        console.log('API response for BIM:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar o modelo BIM');
        }

        if (!data || data.length === 0) {
          console.warn('Nenhum modelo BIM encontrado para esta obra:', data);
          throw new Error('Nenhum modelo BIM encontrado para esta obra');
        }

        // Get the first (and should be only) BIM file
        const bimFile = data[0];
        console.log('BIM file URL:', bimFile.url);

        if (!containerRef.current) {
          throw new Error('Container do viewer não encontrado');
        }

        // Create IFC viewer
        const viewer = new IfcViewerAPI({
          container: containerRef.current,
          backgroundColor: new Color(0x333333), // Dark gray to see if model is there
        });
        viewerRef.current = viewer;

        // Setup viewer - WASM files must be accessible from the browser
        viewer.axes.setAxes();
        viewer.grid.setGrid();
        
        // Add lights to the scene
        viewer.context.ifcCamera.cameraControls.setPosition(10, 10, 10);
        viewer.context.ifcCamera.cameraControls.setTarget(0, 0, 0);
        
        // WASM files are in the public directory root
        viewer.IFC.setWasmPath('/');

        // Load IFC model
        console.log('Loading IFC file from:', bimFile.url);
        const model = await viewer.IFC.loadIfcUrl(bimFile.url);
        
        console.log('IFC model loaded successfully:', model);
        console.log('Model ID:', model.modelID);
        
        // Get all spatial structures
        const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
        console.log('IFC Project structure:', ifcProject);
        
        // Try to get all elements using common IFC types
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
        
        // If we have items, create a subset to render them
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
        
        // Fit the model to the viewport
        console.log('Calling fitToFrame...');
        await viewer.context.fitToFrame();
        
        // Enable post-processing for better visuals
        viewer.context.renderer.postProduction.active = true;
        
        // Log camera position
        console.log('Camera position:', viewer.context.ifcCamera.cameraControls.camera.position);
        console.log('Viewer setup complete');
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar o modelo:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar o modelo BIM');
        setLoading(false);
      }
    };

    loadBIMModel();

    // Handle window resize
    const handleResize = () => {
      if (viewerRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        viewerRef.current.context.renderer.renderer.setSize(width, height);
        viewerRef.current.context.ifcCamera.updateAspect();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup when component unmounts or worksite changes
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
        {/* Header */}
        <div className="text-center mb-4">
          <div className="mx-auto h-16 w-16 bg-[#001489] rounded-full flex items-center justify-center mb-3 shadow-lg">
            <span className="text-white text-2xl">🏗️</span>
          </div>
          <h1 className="text-3xl font-bold text-[#001489] mb-2">
            Visualização do Modelo BIM
          </h1>
          <p className="text-gray-600">
            {selectedWorksite ? `Visualizando modelo da obra ${selectedWorksite}` : 'Selecione uma obra para visualizar'}
          </p>
        </div>

        {/* Viewer Container */}
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

        {/* Navigation */}
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
