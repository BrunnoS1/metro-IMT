"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IfcViewerAPI } from "web-ifc-viewer";
import { Color, Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import { useWorksite } from "@/context/WorksiteContext";

interface BIMPoint {
  x: number;
  y: number;
  z: number;
}

const IFC_TYPES = [
  2056796005, // IFCWALLSTANDARDCASE
  2391406946, // IFCWALL
  1529196076, // IFCSLAB
  395920057, // IFCDOOR
  3304561284, // IFCWINDOW
  263784265, // IFCFURNISHINGELEMENT
  1073191201, // IFCMEMBER
  3171933400, // IFCPLATE
  753842376, // IFCBEAM
  843113511, // IFCCOLUMN
];

export default function Anchors3DPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { selectedWorksite } = useWorksite();

  const imageUrl = params.get("image") || "";
  const fotoId = params.get("fotoId");

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<IfcViewerAPI | null>(null);
  const spheresRef = useRef<Mesh[]>([]);
  const loadedWorksiteRef = useRef<string | null>(null);

  const [worksite, setWorksite] = useState<string>(params.get("worksite") || selectedWorksite || "");
  const [bimPoints, setBimPoints] = useState<BIMPoint[]>([]);
  const [anchors, setAnchors] = useState<BIMPoint[]>([]);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [pointsError, setPointsError] = useState<string | null>(null);

  const keyFromPoint = (p: BIMPoint) => `${p.x}_${p.y}_${p.z}`;

  useEffect(() => {
    if (!worksite && selectedWorksite) {
      setWorksite(selectedWorksite);
      return;
    }
    if (!worksite) {
      const stored = sessionStorage.getItem("metro_worksite");
      if (stored) {
        setWorksite(stored);
      }
    }
  }, [selectedWorksite, worksite]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new IfcViewerAPI({
      container: containerRef.current,
      backgroundColor: new Color(0x333333),
    });

    viewer.axes.setAxes();
    viewer.grid.setGrid();
    viewer.context.ifcCamera.cameraControls.setPosition(10, 10, 10);
    viewer.context.ifcCamera.cameraControls.setTarget(0, 0, 0);
    viewer.IFC.setWasmPath("/");

    viewerRef.current = viewer;

    const handleResize = () => {
      if (viewerRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        viewerRef.current.context.renderer.renderer.setSize(width, height);
        viewerRef.current.context.ifcCamera.updateAspect();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!worksite || !viewerRef.current) return;
    if (loadedWorksiteRef.current === worksite) return;

    const loadModel = async () => {
      setLoadingModel(true);
      setModelError(null);

      try {
        const res = await fetch(`/api/s3?worksite=${worksite}&type=bim`);
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `Erro ao carregar o modelo BIM (status ${res.status})`);
        }
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Nenhum modelo BIM encontrado para esta obra");
        }

        const ifcFile =
          data.find((f: { url: string }) => f.url?.toLowerCase().endsWith(".ifc")) || data[0];

        const viewer = viewerRef.current!;

        const model = await viewer.IFC.loadIfcUrl(ifcFile.url);

        let allIDs: number[] = [];
        for (const type of IFC_TYPES) {
          const ids = await viewer.IFC.loader.ifcManager.getAllItemsOfType(model.modelID, type, false);
          if (ids && ids.length > 0) {
            allIDs = allIDs.concat(ids);
          }
        }

        if (allIDs.length > 0) {
          await viewer.IFC.loader.ifcManager.createSubset({
            modelID: model.modelID,
            scene: viewer.context.getScene(),
            ids: allIDs,
            removePrevious: true,
          });
        }

        await viewer.context.fitToFrame();
        viewer.context.renderer.postProduction.active = true;
        loadedWorksiteRef.current = worksite;
      } catch (err) {
        setModelError(err instanceof Error ? err.message : "Erro ao carregar o modelo BIM");
      } finally {
        setLoadingModel(false);
      }
    };

    loadModel();
  }, [worksite]);

  useEffect(() => {
    if (!worksite) return;
    setLoadingPoints(true);
    setPointsError(null);

    const loadPoints = async () => {
      try {
        const res = await fetch(`/api/bim-points?worksite=${worksite}`);
        if (!res.ok) {
          const msg = await res.text();

          // Qualquer falha tenta gerar pontos novamente
          const generate = await fetch("/api/bim-points", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ worksite }),
          });

          if (generate.ok) {
            const genData = await generate.json();
            setBimPoints(Array.isArray(genData.points) ? (genData.points as BIMPoint[]) : []);
            return;
          }

          throw new Error(msg || `Erro ao carregar pontos 3D (status ${res.status})`);
        }
        const data = await res.json();
        if (Array.isArray(data.points)) {
          setBimPoints(data.points as BIMPoint[]);
        } else {
          setBimPoints([]);
        }
      } catch (err) {
        setPointsError(err instanceof Error ? err.message : "Erro ao carregar pontos 3D");
        setBimPoints([]);
      } finally {
        setLoadingPoints(false);
      }
    };

    loadPoints();
  }, [worksite]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const selectedKeys = new Set(anchors.map((p) => keyFromPoint(p)));
    spheresRef.current.forEach((sphere) => {
      viewer.context.getScene().remove(sphere);
    });
    spheresRef.current = [];

    if (!bimPoints.length) return;

    const geometry = new SphereGeometry(0.2, 12, 12);
    const baseMaterial = new MeshBasicMaterial({ color: "#ff0000" });
    const selectedMaterial = new MeshBasicMaterial({ color: "#00ff88" });

    bimPoints.forEach((p) => {
      const key = keyFromPoint(p);
      const sphere = new Mesh(geometry, selectedKeys.has(key) ? selectedMaterial : baseMaterial);
      sphere.position.set(p.x, p.y, p.z);
      sphere.userData.bimPoint = p;
      viewer.context.getScene().add(sphere);
      spheresRef.current.push(sphere);
    });
  }, [bimPoints, anchors]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const canvas = viewer.context.getDomElement();

    const handleClick = () => {
      const [hit] = viewer.context.castRay(spheresRef.current);
      if (!hit?.object?.userData?.bimPoint) return;

      const point = hit.object.userData.bimPoint as BIMPoint;
      const key = keyFromPoint(point);

      setAnchors((prev) => {
        const exists = prev.some((p) => keyFromPoint(p) === key);
        return exists ? prev.filter((p) => keyFromPoint(p) !== key) : [...prev, point];
      });
    };

    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, []);

  const confirmAnchors = async () => {
    if (!worksite || !fotoId) return;
    if (anchors.length < 3) {
      alert("Selecione pelo menos 3 âncoras.");
      return;
    }

    const res = await fetch("/api/ancoras3d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        worksite,
        fotoId: Number(fotoId),
        anchors3d: anchors,
      }),
    });

    if (!res.ok) {
      alert("Erro ao salvar âncoras 3D.");
      return;
    }

    router.push(`/comparacao?image=${encodeURIComponent(imageUrl)}&fotoId=${fotoId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="p-4">
        <h1 className="text-xl font-bold text-[#001489]">Selecionar Pontos Âncora 3D</h1>
        <p className="text-gray-600 text-sm">Clique nas esferas vermelhas para escolher os pontos.</p>
      </header>

      <div className="flex-1 p-4">
        <div className="relative w-full h-[600px] bg-white rounded shadow overflow-hidden">
          <div ref={containerRef} className="w-full h-full" />

          {(loadingModel || loadingPoints) && !modelError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-gray-700 text-sm">
              Carregando modelo BIM e pontos 3D...
            </div>
          )}

          {modelError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-red-600 text-sm text-center px-4">
              {modelError}
            </div>
          )}
        </div>

        {pointsError && (
          <div className="mt-2 text-sm text-red-600">Aviso: {pointsError}</div>
        )}
      </div>

      <div className="p-4 bg-white shadow flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Âncoras selecionadas: <span className="font-semibold">{anchors.length}</span>
        </p>
        <button
          onClick={confirmAnchors}
          disabled={anchors.length < 3 || !worksite || !fotoId}
          className="px-4 py-2 bg-[#001489] text-white rounded hover:bg-[#001367] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirmar Âncoras
        </button>
      </div>
    </div>
  );
}
