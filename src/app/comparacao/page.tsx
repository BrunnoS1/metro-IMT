"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Point {
  id: string;
  xPct: number;
  yPct: number;
}

interface Anchor3D {
  x: number;
  y: number;
  z: number;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function hashImage(url: string) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const chr = url.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString();
}

export default function ComparacaoPage() {
  const params = useSearchParams();
  const router = useRouter();

  const imageUrl = params.get("image")
    ? decodeURIComponent(params.get("image") as string)
    : "";

  const fotoId = params.get("fotoId"); // <<--- AGORA VAMOS USAR CORRETAMENTE

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [worksite, setWorksite] = useState<string | null>(null);
  const [anchors3d, setAnchors3d] = useState<Anchor3D[]>([]);
  const [loadingAnchors, setLoadingAnchors] = useState(false);

  const storageKey = imageUrl
    ? `comparacao_points_${hashImage(imageUrl)}`
    : "comparacao_points";

  useEffect(() => {
    const storedWorksite = sessionStorage.getItem("metro_worksite");
    if (storedWorksite) {
      setWorksite(storedWorksite);
    }
  }, []);

  useEffect(() => {
    if (!imageUrl) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed: Point[] = JSON.parse(raw);
        setPoints(parsed);
      }
    } catch {}
  }, [imageUrl]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(points));
    } catch {}
  }, [points, storageKey]);

  useEffect(() => {
    if (!worksite || !fotoId) return;

    const fetchAnchors = async () => {
      setLoadingAnchors(true);
      try {
        const res = await fetch(`/api/ancoras3d?worksite=${worksite}&fotoId=${fotoId}`);
        if (!res.ok) {
          setAnchors3d([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.anchors3d)) {
          setAnchors3d(data.anchors3d as Anchor3D[]);
        } else {
          setAnchors3d([]);
        }
      } catch {
        setAnchors3d([]);
      } finally {
        setLoadingAnchors(false);
      }
    };

    fetchAnchors();
  }, [worksite, fotoId]);

  function handleImageClick(e: React.MouseEvent) {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = (x / rect.width) * 100;
    const yPct = (y / rect.height) * 100;
    setPoints((prev) => [...prev, { id: generateId(), xPct, yPct }]);
  }

  function removePoint(id: string) {
    setPoints((prev) => prev.filter((p) => p.id !== id));
  }

  function clearAll() {
    setPoints([]);
  }

  // ----------------------------------------------------------
  //      SALVAMENTO CORRIGIDO — AGORA ENVIA "foto_id"
  // ----------------------------------------------------------
  async function exportJSON() {
    if (!imageUrl) {
      alert("Erro: nenhuma imagem carregada.");
      return;
    }

    if (points.length === 0) {
      alert("Nenhum ponto selecionado.");
      return;
    }

    if (!fotoId) {
      alert("Erro: fotoId não encontrado na URL.");
      return;
    }

    if (!worksite) {
      alert("Erro: obra não selecionada.");
      return;
    }

    try {
      const response = await fetch("/api/pontos2d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foto_id: Number(fotoId), // <<<  AGORA É O CAMPO CORRETO
          worksite,
          pontos2d: points,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Pontos salvos com sucesso!\nTotal: ${points.length}`);
      } else {
        console.error("Erro ao salvar pontos 2D:", data);
        alert(data.error || "Erro ao salvar pontos 2D.");
      }
    } catch (err) {
      console.error("Falha na requisição:", err);
      alert("Erro inesperado ao salvar os pontos.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-800 flex flex-col">
      <header className="p-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
        >
          Voltar
        </button>
        <h1 className="text-xl font-semibold">Comparação com BIM</h1>
      </header>

      {!imageUrl && (
        <div className="p-4 text-red-600">Nenhuma imagem fornecida.</div>
      )}

      {imageUrl && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4">
          <div className="flex-1 flex flex-col">
            <div className="relative border rounded shadow bg-white overflow-hidden">
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Imagem para comparação"
                onLoad={() => setLoaded(true)}
                onClick={handleImageClick}
                className="w-full h-auto select-none cursor-crosshair"
                draggable={false}
              />
              {loaded &&
                points.map((p) => (
                  <div
                    key={p.id}
                    className="absolute w-5 h-5 -mt-2 -ml-2 rounded-full bg-blue-600 border-2 border-white shadow hover:scale-110 transition"
                    style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
                    title={`(${p.xPct.toFixed(2)}%, ${p.yPct.toFixed(2)}%)`}
                  />
                ))}
            </div>

            <p className="text-xs text-gray-600 mt-2">
              Clique na imagem para adicionar pontos de referência. Os pontos
              são salvos na nuvem.
            </p>
          </div>

          <div className="w-full lg:w-80 flex flex-col gap-4">
            <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
              <h2 className="font-medium">Âncoras 3D selecionadas</h2>
              {loadingAnchors ? (
                <div className="text-sm text-gray-500">Carregando âncoras 3D...</div>
              ) : anchors3d.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhuma âncora carregada.</div>
              ) : (
                <div className="max-h-48 overflow-auto text-sm space-y-1">
                  {anchors3d.map((a, idx) => (
                    <div
                      key={`${a.x}_${a.y}_${a.z}_${idx}`}
                      className="flex justify-between bg-gray-50 rounded px-2 py-1"
                    >
                      <span className="font-semibold">{idx + 1}</span>
                      <span className="text-gray-700">
                        x:{a.x.toFixed(2)} y:{a.y.toFixed(2)} z:{a.z.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded shadow p-4 flex flex-col gap-3">
              <h2 className="font-medium">Pontos Selecionados ({points.length})</h2>

              <div className="max-h-64 overflow-auto space-y-2 text-sm">
                {points.length === 0 && <div className="text-gray-500">Nenhum ponto.</div>}
                {points.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-gray-50 rounded px-2 py-1"
                  >
                    <span>
                      {idx + 1}. {p.xPct.toFixed(2)}%, {p.yPct.toFixed(2)}%
                    </span>
                    <button
                      onClick={() => removePoint(p.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={clearAll}
                  disabled={points.length === 0}
                  className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40"
                >
                  Limpar Todos
                </button>

                <button
                  onClick={exportJSON}
                  disabled={points.length === 0}
                  className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  Exportar JSON
                </button>
              </div>
            </div>
         </div>
        </div>
      )}
    </div>
  );
}
