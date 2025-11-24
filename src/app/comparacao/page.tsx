"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";

interface Point {
  id: string;
  xPct: number; // percentage relative ao container (revertido)
  yPct: number;
  anchorIndex?: number; // explicit mapping to anchors3d index
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

  // Removido proxy: usaremos Next/Image que serve via _next/image mesma origem
  const validImageExt = /(\.jpe?g$)|(\.png$)|(\.webp$)|(\.gif$)/i;
  const isValidImage = validImageExt.test(imageUrl.split('?')[0]);

  const fotoId = params.get("fotoId"); // <<--- AGORA VAMOS USAR CORRETAMENTE

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [currentAnchorIndex, setCurrentAnchorIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [worksite, setWorksite] = useState<string | null>(null);
  const [anchors3d, setAnchors3d] = useState<Anchor3D[]>([]);
  const [loadingAnchors, setLoadingAnchors] = useState(false);
  const [showMiniAnchors, setShowMiniAnchors] = useState(true);
  const [bimPoints, setBimPoints] = useState<Anchor3D[]>([]);
  const [loadingBim, setLoadingBim] = useState(false);
  const [wireframeReady, setWireframeReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [computing, setComputing] = useState(false);
  const [opencvLoaded, setOpencvLoaded] = useState(false);
  const [wireframeInfo, setWireframeInfo] = useState<{edges:number;points:number}|null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  // Integração Python
  const [pyLoading, setPyLoading] = useState(false);
  const [pyAnchorsImg, setPyAnchorsImg] = useState<string | null>(null);
  const [pyWireframeImg, setPyWireframeImg] = useState<string | null>(null);
  const [pyStdout, setPyStdout] = useState<string | null>(null);
  const [pyError, setPyError] = useState<string | null>(null);
  // Dimensões e diagnóstico
  const [naturalSize, setNaturalSize] = useState<{w:number;h:number}|null>(null);
  const [pythonSize, setPythonSize] = useState<{w:number;h:number}|null>(null);
  const [dimWarning, setDimWarning] = useState<string | null>(null);
  const [mapping, setMapping] = useState<{scale:number;offsetX:number;offsetY:number;boxW:number;boxH:number}|null>(null);
  const [useUnoptimized, setUseUnoptimized] = useState<boolean>(true);
  // S3 upload para wireframe
  const [wireframeUploading, setWireframeUploading] = useState(false);
  const [wireframeUploadedUrl, setWireframeUploadedUrl] = useState<string | null>(null);
  // Apenas uma imagem final (resultado). Removemos a export de âncoras separada.

  const POINT_SCHEMA_VERSION = 2;
  const storageKey = imageUrl
    ? `comparacao_points_${hashImage(imageUrl)}`
    : "comparacao_points";
  const storageMetaKey = storageKey + "_meta";

  // Worksite from session
  useEffect(() => {
    const storedWorksite = sessionStorage.getItem("metro_worksite");
    if (storedWorksite) setWorksite(storedWorksite);
  }, []);

  // Load persisted 2D points with schema version gating
  useEffect(() => {
    if (!imageUrl) return;
    try {
      const metaRaw = sessionStorage.getItem(storageMetaKey);
      const raw = sessionStorage.getItem(storageKey);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        if (meta.version === POINT_SCHEMA_VERSION) {
          if (raw) setPoints(JSON.parse(raw));
        } else {
          // Versão antiga -> ignorar pontos antigos (evita deslocamentos)
          sessionStorage.removeItem(storageKey);
          setPoints([]);
        }
      } else {
        // Sem meta -> considerar legado, limpar
        sessionStorage.removeItem(storageKey);
        setPoints([]);
      }
    } catch {}
  }, [imageUrl]);

  // Persist 2D points + meta
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(points));
      sessionStorage.setItem(storageMetaKey, JSON.stringify({version: POINT_SCHEMA_VERSION}));
    } catch {}
  }, [points, storageKey, storageMetaKey]);

  // Fetch anchors 3D
  useEffect(() => {
    if (!worksite || !fotoId) return;
    const fetchAnchors = async () => {
      setLoadingAnchors(true);
      try {
        const res = await fetch(`/api/ancoras3d?worksite=${worksite}&fotoId=${fotoId}`);
        if (!res.ok) { setAnchors3d([]); return; }
        const data = await res.json();
        setAnchors3d(Array.isArray(data.anchors3d) ? data.anchors3d : []);
      } catch { setAnchors3d([]); }
      finally { setLoadingAnchors(false); }
    };
    fetchAnchors();
  }, [worksite, fotoId]);

  // Load BIM points for wireframe later
  useEffect(() => {
    if (!worksite) return;
    const fetchBim = async () => {
      setLoadingBim(true);
      try {
        const res = await fetch(`/api/bim-points?worksite=${worksite}`);
        if (!res.ok) {
          setBimPoints([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.points)) {
          setBimPoints(data.points as Anchor3D[]);
        } else {
          setBimPoints([]);
        }
      } catch {
        setBimPoints([]);
      } finally {
        setLoadingBim(false);
      }
    };
    fetchBim();
  }, [worksite]);

  // Robust single-time OpenCV.js loader (avoid multiple runtime init)
  useEffect(() => {
    const w = window as any;
    if (w.__opencvReady) { setOpencvLoaded(true); return; }
    if (w.__opencvLoading) return;
    if (w.cv && w.cv.Mat && w.cv.getBuildInformation) { // already fully initialized
      w.__opencvReady = true; setOpencvLoaded(true); return;
    }
    w.__opencvLoading = true;
    const script = document.createElement('script');
    script.id = 'opencv-js';
    script.src = 'https://docs.opencv.org/4.x/opencv.js';
    script.async = true;
    script.onload = () => {
      const cv = (window as any).cv;
      if (!cv) { setErrorMsg('OpenCV não disponível'); return; }
      cv.onRuntimeInitialized = () => {
        (window as any).__opencvReady = true;
        setOpencvLoaded(true);
      };
      // If runtime already initialized (hot reload), mark ready
      if (cv.Mat && cv.getBuildInformation) {
        (window as any).__opencvReady = true;
        setOpencvLoaded(true);
      }
    };
    script.onerror = () => setErrorMsg('Falha ao carregar OpenCV.js');
    document.body.appendChild(script);
  }, []);
  // --- Helper: validate numeric arrays before creating Mats ---
  function validateNumeric(label:string, arr:number[], expected:number, logPrefix:string){
    if(arr.length!==expected){
      setDebugLog(d=>[...d,`${logPrefix} ${label} length=${arr.length} expected=${expected}`]);
      return false;
    }
    for(let i=0;i<arr.length;i++){
      const v=arr[i];
      if(!Number.isFinite(v)){
        setDebugLog(d=>[...d,`${logPrefix} ${label} invalid at ${i} value=${v}`]);
        return false;
      }
    }
    return true;
  }

  // Build points using matFromArray with channel formats (reduces stride issues)
  function buildObjectPoints(pts:{x:number,y:number,z:number}[], label:string){
    const cv=(window as any).cv;
    const flat:number[]=[]; for(const p of pts){ flat.push(p.x,p.y,p.z); }
    const m=cv.matFromArray(pts.length,1,cv.CV_32FC3,flat);
    setDebugLog(d=>[...d,`${label} CV_32FC3 rows=${pts.length}`]);
    return m;
  }
  function buildImagePoints(pts:number[][], label:string){
    const cv=(window as any).cv;
    const flat:number[]=[]; for(const p of pts){ flat.push(p[0],p[1]); }
    const m=cv.matFromArray(pts.length,1,cv.CV_32FC2,flat);
    setDebugLog(d=>[...d,`${label} CV_32FC2 rows=${pts.length}`]);
    return m;
  }

  // Compute wireframe (versão alinhada ao script Python para maior precisão)
  async function computeWireframe() {
    setComputing(true); setErrorMsg(null); setWireframeInfo(null);
    let objPoints:any=null,imgPoints:any=null,bimMat:any=null,rvec:any=null,tvec:any=null,projected:any=null,bimProjMat:any=null;
    try {
      if(!opencvLoaded){ setErrorMsg('OpenCV não carregado'); return; }
      if(!imgRef.current){ setErrorMsg('Imagem não carregada'); return; }
      if(anchors3d.length<3){ setErrorMsg('>=3 âncoras 3D necessárias'); return; }
      const explicitPairs = points.filter(p=>p.anchorIndex!==undefined && p.anchorIndex!==null && p.anchorIndex>=0 && p.anchorIndex<anchors3d.length);
      let used2d: Point[] = [];
      let used3d: Anchor3D[] = [];
      let pairingMode = '';
      if(explicitPairs.length>=3){
        // Use only explicit mapped pairs
        // Keep order as clicked (could also sort by anchorIndex but not required)
        used2d = explicitPairs;
        used3d = explicitPairs.map(p=>anchors3d[p.anchorIndex!]);
        pairingMode = 'explicit';
      } else {
        if(points.length<3){ setErrorMsg('>=3 pontos 2D necessários (ou atribuir anchorIndex)'); return; }
        const pairCount = Math.min(points.length, anchors3d.length);
        if(pairCount<3){ setErrorMsg('Pares insuficientes'); return; }
        used2d = points.slice(0,pairCount);
        used3d = anchors3d.slice(0,pairCount);
        pairingMode = 'fallbackSlice';
      }
      const pairCount = used2d.length;
      const cv = (window as any).cv;
      const w = imgRef.current.naturalWidth; const h = imgRef.current.naturalHeight;
      const pts2dPix = used2d.map(p=>[(p.xPct/100)*w,(p.yPct/100)*h]);
      // Centro global (todos anchors) para consistência com Python
      const centerAll = anchors3d.reduce((acc,a)=>({x:acc.x+a.x,y:acc.y+a.y,z:acc.z+a.z}),{x:0,y:0,z:0});
      centerAll.x/=anchors3d.length; centerAll.y/=anchors3d.length; centerAll.z/=anchors3d.length;
      const norm3dAll = anchors3d.map(a=>({x:a.x-centerAll.x,y:a.y-centerAll.y,z:a.z-centerAll.z}));
      const radiiAll = norm3dAll.map(a=>Math.hypot(a.x,a.y,a.z));
      const maxRad = Math.max(...radiiAll);
      const anchorRadius = maxRad < 1 ? 100 : maxRad;
      // Subset usado normalizado pelo centro global
      const norm3d = used3d.map(a=>({x:a.x-centerAll.x,y:a.y-centerAll.y,z:a.z-centerAll.z}));
      const {fx,fy,cx,cy} = buildIntrinsic(w,h,91);
      setDebugLog(d=>[...d,
        `pairMode=${pairingMode}`,
        `pairCount=${pairCount}`,
        `anchorRadius=${anchorRadius.toFixed(2)}`,
        `anchorIndices=${used2d.map(p=>p.anchorIndex!==undefined?p.anchorIndex:'?').join(',')}`,
        `anchors3d sample0=${used3d[0]? `${used3d[0].x.toFixed(2)},${used3d[0].y.toFixed(2)},${used3d[0].z.toFixed(2)}`:'none'}`
      ]);
      // Build Mats
      objPoints = buildObjectPoints(norm3d,'objPoints');
      imgPoints = buildImagePoints(pts2dPix,'imgPoints');
      const K = cv.matFromArray(3,3,cv.CV_32F,[fx,0,cx,0,fy,cy,0,0,1]);
      const dist = cv.matFromArray(4,1,cv.CV_32F,[0,0,0,0]);
      rvec = new cv.Mat(); tvec = new cv.Mat();
      let inliersMat:any=null; let usedRansac=false; let ok=false;
      if(cv.solvePnPRansac){
        try {
          inliersMat = new cv.Mat();
          ok = cv.solvePnPRansac(
            objPoints,
            imgPoints,
            K,
            dist,
            rvec,
            tvec,
            false,
            100,      // iterationsCount
            8.0,      // reprojectionError threshold (pixels)
            0.99,     // confidence
            inliersMat,
            cv.SOLVEPNP_ITERATIVE
          );
          if(ok){
            const inliersCount = inliersMat.rows || 0;
            usedRansac = inliersCount>0;
            setDebugLog(d=>[...d,`solvePnPRansac ok inliers=${inliersCount}`]);
          } else {
            setDebugLog(d=>[...d,'solvePnPRansac retornou false, fallback ITERATIVE']);
          }
        } catch(e:any){
          setDebugLog(d=>[...d,`solvePnPRansac exceção: ${e?.message||'erro'}`]);
        }
      } else {
        setDebugLog(d=>[...d,'solvePnPRansac não disponível, usando ITERATIVE']);
      }
      if(!ok){
        ok = cv.solvePnP(objPoints,imgPoints,K,dist,rvec,tvec,false,cv.SOLVEPNP_ITERATIVE);
        setDebugLog(d=>[...d,`solvePnP ITERATIVE ok=${ok}`]);
      }
      if(!ok){ setErrorMsg('solvePnP (RANSAC/ITERATIVE) falhou'); return; }
      // Refine LM se disponível (após melhor pose inicial)
      if(cv.solvePnPRefineLM){
        try {
          cv.solvePnPRefineLM(objPoints,imgPoints,K,dist,rvec,tvec);
          setDebugLog(d=>[...d,'RefineLM aplicado']);
        } catch(e:any) {
          setDebugLog(d=>[...d,`RefineLM falhou: ${e?.message||'erro'}`]);
        }
      } else {
        setDebugLog(d=>[...d,'RefineLM indisponível']);
      }
      projected = new cv.Mat();
      cv.projectPoints(objPoints,rvec,tvec,K,dist,projected);
      const projectedAnchors:number[][]=[];
      for(let i=0;i<pairCount;i++){ projectedAnchors.push([projected.data32F[i*2],projected.data32F[i*2+1]]); }
      // BIM seleção local
      const localThresh = 3*anchorRadius;
      const bimLocal = bimPoints.filter(p=>Math.hypot(p.x-centerAll.x,p.y-centerAll.y,p.z-centerAll.z)<=localThresh);
      setDebugLog(d=>[...d,`bimLocal=${bimLocal.length} threshold=${localThresh.toFixed(1)}`]);
      // Voxel igual Python
      const voxelSize = Math.max(anchorRadius/3.0,1.0);
      const bimVoxel = voxelDownsample(bimLocal, voxelSize);
      setDebugLog(d=>[...d,`bimVoxel=${bimVoxel.length} voxelSize=${voxelSize.toFixed(2)}`]);
      const bimNorm = bimVoxel.map(a=>({x:a.x-centerAll.x,y:a.y-centerAll.y,z:a.z-centerAll.z}));
      const bimArr = bimNorm.flatMap(p=>[p.x,p.y,p.z]);
      bimMat = cv.matFromArray(bimNorm.length,1,cv.CV_32FC3,bimArr);
      bimProjMat = new cv.Mat();
      cv.projectPoints(bimMat,rvec,tvec,K,dist,bimProjMat);
      const bimProj:number[][]=[];
      for(let i=0;i<bimNorm.length;i++){ bimProj.push([bimProjMat.data32F[i*2],bimProjMat.data32F[i*2+1]]); }
      // Filtrar outliers muito longe
      const validBimNorm:Anchor3D[]=[]; const validBimProj:number[][]=[]; const margin=5;
      for(let i=0;i<bimProj.length;i++){
        const [x,y]=bimProj[i];
        if(x>=-w*margin && x<w*margin && y>=-h*margin && y<h*margin){
          validBimNorm.push(bimNorm[i]);
          validBimProj.push([x,y]);
        }
      }
      setDebugLog(d=>[...d,`validBimNorm=${validBimNorm.length} (filtered from ${bimNorm.length})`]);
      const knn = knnIndices(validBimNorm,4);
      let edges:Set<string>=new Set();
      for(let i=0;i<validBimNorm.length;i++){
        for(const j of knn[i]) if(i<j){
          const d = Math.hypot(validBimNorm[i].x-validBimNorm[j].x,validBimNorm[i].y-validBimNorm[j].y,validBimNorm[i].z-validBimNorm[j].z);
          if(d < 4 * voxelSize) edges.add(`${i}-${j}`);
        }
      }
      if(edges.size===0){
        for(let i=0;i<validBimNorm.length;i++){
          for(const j of knn[i]) if(i<j){
            const d = Math.hypot(validBimNorm[i].x-validBimNorm[j].x,validBimNorm[i].y-validBimNorm[j].y,validBimNorm[i].z-validBimNorm[j].z);
            if(d < 8 * voxelSize) edges.add(`${i}-${j}`);
          }
        }
        setDebugLog(d=>[...d,`fallbackEdges=${edges.size}`]);
      }
      setDebugLog(d=>[...d,`edges preDraw=${edges.size}`]);
      // Desenho
      if(canvasRef.current){
        const ctx = canvasRef.current.getContext('2d');
        if(ctx){
          canvasRef.current.width=w; canvasRef.current.height=h;
          ctx.clearRect(0,0,w,h);
          try { if(!imgRef.current) throw new Error('Image ref not available'); ctx.drawImage(imgRef.current,0,0,w,h); setDebugLog(d=>[...d,`drawImage OK: ${w}x${h}`]); } catch(e:any){ setDebugLog(d=>[...d,`drawImage FAIL: ${e.message}`]); throw new Error(`Falha ao desenhar imagem: ${e.message}`); }
          projectedAnchors.forEach(([x,y])=>{ if(x>=0&&x<w&&y>=0&&y<h){ ctx.fillStyle='rgba(255,0,0,0.85)'; ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill(); }});
          ctx.strokeStyle='rgba(255,255,0,0.9)'; ctx.lineWidth=1;
          let drawnEdges=0;
          edges.forEach(k=>{ const [is,js]=k.split('-'); const i=parseInt(is),j=parseInt(js); const [x1,y1]=validBimProj[i]; const [x2,y2]=validBimProj[j]; if(x1>=0&&x1<w&&y1>=0&&y1<h&&x2>=0&&x2<w&&y2>=0&&y2<h){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); drawnEdges++; }});
          setDebugLog(d=>[...d,`drawnEdges=${drawnEdges} of ${edges.size}`]);
          ctx.font='16px sans-serif'; ctx.fillStyle='yellow'; ctx.fillText('Wireframe (KNN-light)',20,32);
          try { const url = canvasRef.current.toDataURL('image/png'); setDebugLog(d=>[...d,`toDataURL length=${url.length}`]); if(url && url.length>100){ setResultImageUrl(url); setWireframeReady(true);} else { throw new Error('Canvas vazio ao exportar'); } } catch(e:any){ setDebugLog(d=>[...d,`toDataURL FAIL: ${e.message}`]); throw new Error(`Erro ao exportar PNG: ${e.message}`); }
        }
      }
      // Erro médio de reprojeção
      if(projectedAnchors.length === pairCount){
        let reproErr=0; const perPoint:string[]=[]; for(let i=0;i<pairCount;i++){ const [px,py]=projectedAnchors[i]; const [ix,iy]=pts2dPix[i]; const err=Math.hypot(px-ix,py-iy); reproErr+=err; perPoint.push(`${i}:${err.toFixed(2)}`); } reproErr/=pairCount; setDebugLog(d=>[...d,`reprojectionErrAvg=${reproErr.toFixed(2)}px`,`reprojEach=${perPoint.join('|')}`]); }
      setWireframeInfo({edges:edges.size,points:validBimNorm.length});
      setDebugLog(d=>[...d,`anchorRadius=${anchorRadius.toFixed(2)}`,`voxelSize=${voxelSize.toFixed(2)}`,`edges=${edges.size}`,`validBimNorm=${validBimNorm.length}`]);
    } catch(e:any){
      console.error(e);
      setErrorMsg(e?.message||'Erro no wireframe');
      setDebugLog(d=>[...d,`EXCEPTION:${e?.message}`]);
    } finally {
      setComputing(false);
      [objPoints,imgPoints,bimMat,rvec,tvec,projected,bimProjMat].forEach(m=>{ try{ m && m.delete(); }catch{} });
    }
  }

  function buildIntrinsic(w:number,h:number,FOV_deg:number){
    const FOV_rad = (FOV_deg*Math.PI)/180;
    const fx = w / (2 * Math.tan(FOV_rad/2));
    const fy = fx;
    const cx = w/2; const cy = h/2;
    return {fx, fy, cx, cy};
  }

  function voxelDownsample(points: Anchor3D[], voxelSize: number){
    const map = new Map<string, Anchor3D>();
    for(const p of points){
      const key = `${Math.floor(p.x/voxelSize)}_${Math.floor(p.y/voxelSize)}_${Math.floor(p.z/voxelSize)}`;
      if(!map.has(key)) map.set(key,p);
    }
    return Array.from(map.values());
  }

  function knnIndices(points: Anchor3D[], k:number){
    const res:number[][]=[];
    for(let i=0;i<points.length;i++){
      const dists = points.map((p,idx)=>({idx, d: Math.hypot(p.x-points[i].x,p.y-points[i].y,p.z-points[i].z)}));
      dists.sort((a,b)=>a.d-b.d);
      res.push(dists.slice(1,k+1).map(o=>o.idx));
    }
    return res;
  }

  function handleImageClick(e: React.MouseEvent) {
    // Map click to NATURAL image pixel coordinates accounting for object-contain letterboxing.
    if (!imgRef.current) return;
    const imgEl = imgRef.current as HTMLImageElement;
    const naturalW = imgEl.naturalWidth;
    const naturalH = imgEl.naturalHeight;
    const rect = imgEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    // The element may be letterboxed inside a fixed aspect-ratio container.
    // Compute displayed image size preserving aspect ratio.
    // rect.width/height are the box; image uses object-contain so:
    const boxW = rect.width;
    const boxH = rect.height;
    const scale = Math.min(boxW / naturalW, boxH / naturalH);
    const dispW = naturalW * scale;
    const dispH = naturalH * scale;
    const offsetX = (boxW - dispW) / 2;
    const offsetY = (boxH - dispH) / 2;
    // Ensure click is inside displayed image (not letterbox padding)
    if (clickX < offsetX || clickX > offsetX + dispW || clickY < offsetY || clickY > offsetY + dispH) {
      return; // ignore clicks in padding areas
    }
    const imgPX = (clickX - offsetX) / scale; // pixel in natural image coordinates
    const imgPY = (clickY - offsetY) / scale;
    const xPct = (imgPX / naturalW) * 100;
    const yPct = (imgPY / naturalH) * 100;
    setPoints(prev => [...prev, { id: generateId(), xPct, yPct, anchorIndex: currentAnchorIndex!==null? currentAnchorIndex: undefined }]);
    // Persist mapping for later marker rendering consistency
    setMapping({scale,offsetX,offsetY,boxW,boxH});
  }

  function handleImageError() {
    setErrorMsg(
      'Falha ao carregar imagem (CORS). Configure CORS no bucket S3 adicionando AllowedOrigins incluindo http://localhost:3000. '
    );
  }

  function removePoint(id: string) {
    setPoints((prev) => prev.filter((p) => p.id !== id));
  }

  function clearAll() {
    setPoints([]);
  }

  function parsePythonImageSize(stdout:string){
    // Procura linha: Imagem carregada: {w}x{h}
    const m = stdout.match(/Imagem carregada:\s*(\d+)x(\d+)/);
    if(m){ return {w: parseInt(m[1],10), h: parseInt(m[2],10)}; }
    return null;
  }

  async function runPythonWireframe(){
    setPyError(null); setPyStdout(null); setPyAnchorsImg(null); setPyWireframeImg(null); setPyLoading(true);
    try {
      if(!imageUrl){ setPyError('Imagem ausente'); return; }
      if(points.length<3){ setPyError('Mínimo 3 pontos 2D'); return; }
      if(anchors3d.length<3){ setPyError('Mínimo 3 âncoras 3D'); return; }
      if(bimPoints.length===0){ setPyError('Pontos BIM não carregados'); return; }
      // Construir pares explícitos usando anchorIndex (mantém correspondência exata)
      const explicitPairs = points.filter(p => p.anchorIndex !== undefined && p.anchorIndex !== null && p.anchorIndex! >= 0 && p.anchorIndex! < anchors3d.length);
      let used2d: {xPct:number;yPct:number}[] = [];
      let used3d: Anchor3D[] = [];
      let pairMode = '';
      if(explicitPairs.length >= 4){
        used2d = explicitPairs.map(p=>({xPct:p.xPct,yPct:p.yPct}));
        used3d = explicitPairs.map(p=>anchors3d[p.anchorIndex!]);
        pairMode = 'explicit';
      } else {
        const count = Math.min(points.length, anchors3d.length);
        if(count < 4){ setPyError('Necessário >=4 pares (atribuir anchorIndex aos pontos)'); return; }
        used2d = points.slice(0,count).map(p=>({xPct:p.xPct,yPct:p.yPct}));
        used3d = anchors3d.slice(0,count);
        pairMode = 'fallbackSlice';
      }
      const payload = {
        imageUrl,
        points2d: used2d,
        anchors3d: used3d,
        bimPoints: bimPoints, // todos BIM points
        noGui: true,
        noPerm: true, // força uso da ordem enviada (sem permutação)
        fovH: 91
      };
      console.log('Sending to Python (paired):', {
        pairMode,
        sentPairs: used2d.length,
        anchorIndices: explicitPairs.length? explicitPairs.map(p=>p.anchorIndex) : 'slice-ordered',
        points2d_sample: used2d.slice(0,2),
        anchors3d_sample: used3d.slice(0,2),
        bimPoints: bimPoints.length
      });
      const resp = await fetch('/api/wireframe',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if(!resp.ok){ 
        // Log full error details for debugging
        console.error('Python API error:', data);
        setPyError(JSON.stringify(data, null, 2)); 
        return; 
      }
      const stdout: string | null = data.stdout || null;
      setPyStdout(stdout);
      if(stdout){
        const sz = parsePythonImageSize(stdout);
        if(sz){
          setPythonSize(sz);
          if(naturalSize && (naturalSize.w !== sz.w || naturalSize.h !== sz.h)){
            setDimWarning(`Dimensão diferente: browser ${naturalSize.w}x${naturalSize.h} vs Python ${sz.w}x${sz.h}. Percentuais geram deslocamento. Use <img unoptimized> ou ajuste pontos.`);
          } else {
            setDimWarning(null);
          }
        }
      }
      setPyAnchorsImg(data.anchorsImage||null);
      setPyWireframeImg(data.wireframeImage||null);
    } catch(e:any){
      console.error('Python wireframe exception:', e);
      setPyError(e?.message||'Erro inesperado');
    } finally { setPyLoading(false); }
  }

  // Removidas funções de limpar âncoras/seleção do painel principal.

  // ----------------------------------------------------------
  //      UPLOAD WIREFRAME PARA S3
  // ----------------------------------------------------------
  async function uploadWireframeToS3() {
    if (!pyWireframeImg) {
      alert('Nenhum wireframe gerado. Execute "Wireframe Python" primeiro.');
      return;
    }
    if (!worksite) {
      alert('Erro: obra não selecionada.');
      return;
    }

    setWireframeUploading(true);

    try {
      // Convert base64 to blob
      const base64Data = pyWireframeImg.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Create unique filename
      const timestamp = Date.now();
      const filename = `wireframe_${fotoId || 'image'}_${timestamp}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      // Upload to S3
      const formData = new FormData();
      formData.append('worksite', worksite);
      formData.append('file', file);
      formData.append('type', 'wireframe');

      const response = await fetch('/api/s3', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setWireframeUploadedUrl(data.url);
        alert(`Wireframe enviado com sucesso para S3!\nURL: ${data.url}`);
      } else {
        console.error('Erro ao enviar wireframe:', data);
        alert('Ocorreu um erro ao enviar o wireframe. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar wireframe:', error);
      alert('Ocorreu um erro ao enviar o wireframe. Tente novamente.');
    } finally {
      setWireframeUploading(false);
    }
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
          className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm cursor-pointer"
        >Voltar</button>
        <button
          onClick={() => router.push('/home')}
          className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-sm text-white cursor-pointer"
        >Home</button>
        <h1 className="text-xl font-semibold">Comparação com BIM</h1>
      </header>

      {!imageUrl && (
        <div className="p-4 text-red-600">Nenhuma imagem fornecida.</div>
      )}

      {imageUrl && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4">
          <div className="flex-1 flex flex-col">
            <div className="relative border rounded shadow bg-white overflow-hidden flex flex-col gap-4">
              {isValidImage && (
                <div className="relative w-full" style={{aspectRatio:'4/3'}}>
                  <Image
                    src={imageUrl}
                    alt="Imagem para comparação"
                    fill
                    sizes="100vw"
                    className="object-contain select-none cursor-crosshair"
                    draggable={false}
                    priority
                    unoptimized={useUnoptimized}
                    onClick={handleImageClick}
                    onError={handleImageError as any}
                    onLoadingComplete={(img)=>{ 
                      imgRef.current = img as HTMLImageElement; 
                      setLoaded(true); 
                      setNaturalSize({w: img.naturalWidth, h: img.naturalHeight}); 
                      // Initialize mapping immediately after load
                      const rect = (img as HTMLImageElement).getBoundingClientRect();
                      const naturalW = img.naturalWidth; const naturalH = img.naturalHeight;
                      const boxW = rect.width; const boxH = rect.height;
                      const scale = Math.min(boxW / naturalW, boxH / naturalH);
                      const dispW = naturalW * scale; const dispH = naturalH * scale;
                      const offsetX = (boxW - dispW)/2; const offsetY = (boxH - dispH)/2;
                      setMapping({scale,offsetX,offsetY,boxW,boxH});
                    }}
                  />
                  {/* Pontos sobrepostos somente na imagem original */}
                  {loaded && mapping && naturalSize && points.map((p) => {
                    const imgPX = (p.xPct/100)*naturalSize.w;
                    const imgPY = (p.yPct/100)*naturalSize.h;
                    const dispX = mapping.offsetX + imgPX * mapping.scale;
                    const dispY = mapping.offsetY + imgPY * mapping.scale;
                    return (
                      <div
                        key={p.id}
                        className="absolute w-5 h-5 -translate-x-2 -translate-y-2 rounded-full bg-blue-600 border-2 border-white shadow"
                        style={{ left: dispX, top: dispY }}
                        title={`px(${imgPX.toFixed(1)},${imgPY.toFixed(1)}) %(${p.xPct.toFixed(2)},${p.yPct.toFixed(2)})`}
                      />
                    );
                  })}
                </div>
              )}
              {!wireframeReady && !isValidImage && (
                <div className="p-4 text-sm text-red-600">URL não parece ser uma imagem suportada. Extensões aceitas: .jpg .jpeg .png .webp .gif</div>
              )}
              {/* Canvas offscreen para exportar a imagem final */}
              <canvas ref={canvasRef} className="absolute -left-[9999px] -top-[9999px]" style={{width: 0, height: 0}} />
              {resultImageUrl && (
                <div className="relative w-full border-t pt-2">
                  <span className="absolute top-2 left-2 z-10 text-xs bg-black/50 text-white px-2 py-1 rounded">Wireframe</span>
                  <img
                    src={resultImageUrl}
                    alt="Wireframe final"
                    className="w-full h-auto object-contain"
                    draggable={false}
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-gray-600 mt-2">
              Clique para adicionar pontos de referência (mínimo 3). Depois gere o wireframe.
            </p>
            {errorMsg && <p className="text-xs text-red-600 mt-1">{errorMsg}</p>}
            {dimWarning && <p className="text-xs text-orange-600 mt-1">{dimWarning}</p>}
            {naturalSize && <p className="text-[10px] text-gray-500">Browser img: {naturalSize.w}x{naturalSize.h}{pythonSize? ` | Python img: ${pythonSize.w}x${pythonSize.h}`:''}{mapping? ` | scale=${mapping.scale.toFixed(4)} off=(${mapping.offsetX.toFixed(1)},${mapping.offsetY.toFixed(1)})`:''}</p>}
            <div className="flex items-center gap-2 mt-1">
              <label className="text-[10px] flex items-center gap-1">
                <input type="checkbox" checked={useUnoptimized} onChange={e=>setUseUnoptimized(e.target.checked)} /> unoptimized
              </label>
              <button
                onClick={()=>{setMapping(null);}}
                className="text-[10px] px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >Recalcular mapping</button>
            </div>
            {wireframeInfo && <p className="text-xs text-green-700 mt-1">Wireframe: {wireframeInfo.edges} arestas / {wireframeInfo.points} pontos</p>}
            {debugLog.length > 0 && (
              <details className="mt-1 text-[10px] text-gray-500 max-h-24 overflow-auto">
                <summary>Debug</summary>
                {debugLog.map((l,i)=>(<div key={i}>{l}</div>))}
              </details>
            )}
            {resultImageUrl && (
              <div className="mt-4 bg-white p-2 rounded shadow flex flex-col gap-2">
                <span className="text-xs font-medium">Resultado Wireframe</span>
                <img src={resultImageUrl} alt="Wireframe result" className="border rounded max-h-72 object-contain" />
                <div className="flex gap-2">
                  <a
                    href={resultImageUrl}
                    download={`wireframe_${fotoId||'imagem'}.png`}
                    className="inline-block text-center text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                  >Download</a>
                  <button
                    onClick={() => { setWireframeReady(false); setResultImageUrl(null); setWireframeInfo(null); }}
                    className="inline-block text-center text-xs px-3 py-1 rounded bg-gray-300 hover:bg-gray-400"
                  >Refazer</button>
                </div>
              </div>
            )}

            {/* Python Wireframe Results */}
            { (pyAnchorsImg || pyWireframeImg || pyError) && (
              <div className="mt-4 bg-white p-4 rounded shadow flex flex-col gap-3">
                <h3 className="text-sm font-bold text-purple-700">Resultado Python Wireframe</h3>
                {pyError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">Erro: {pyError}</div>}
                <div className="grid gap-3 md:grid-cols-2">
                  {pyAnchorsImg && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-700">Anchors Overlay</span>
                      <img src={pyAnchorsImg} alt="Anchors Python" className="border rounded w-full object-contain" />
                    </div>
                  )}
                  {pyWireframeImg && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-700">Wireframe BIM</span>
                      <img src={pyWireframeImg} alt="Wireframe Python" className="border rounded w-full object-contain" />
                    </div>
                  )}
                </div>
                {pyWireframeImg && (
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={uploadWireframeToS3}
                      disabled={wireframeUploading}
                      className="px-3 py-2 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {wireframeUploading ? 'Enviando para S3...' : 'Enviar Wireframe para S3'}
                    </button>
                    {wireframeUploadedUrl && (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">Enviado com sucesso</span>
                    )}
                  </div>
                )}
                {pyStdout && (
                  <details className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded">
                    <summary className="cursor-pointer font-medium">Ver stdout Python</summary>
                    <pre className="whitespace-pre-wrap mt-2">{pyStdout}</pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 flex flex-col gap-4">
            <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
              <h2 className="font-medium">Âncoras 3D</h2>
              <button
                onClick={() => setShowMiniAnchors((v) => !v)}
                className="text-xs self-start px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >{showMiniAnchors ? 'Ocultar janela' : 'Mostrar janela'}</button>
              {loadingAnchors ? (
                <div className="text-sm text-gray-500">Carregando âncoras 3D...</div>
              ) : anchors3d.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhuma âncora carregada.</div>
              ) : (
                    <div className="max-h-48 overflow-auto text-sm space-y-1">
                      {anchors3d.map((a, idx) => {
                        const selected = currentAnchorIndex === idx;
                        const usedBy = points.filter(p=>p.anchorIndex===idx).length;
                        return (
                          <div
                            key={`${a.x}_${a.y}_${a.z}_${idx}`}
                            className={`flex items-center justify-between rounded px-2 py-1 border ${selected? 'bg-indigo-600 text-white':'bg-gray-50'} transition-colors`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">{idx + 1}{usedBy>0?` (${usedBy})`:''}</span>
                              <span className="text-xs opacity-80">x:{a.x.toFixed(2)} y:{a.y.toFixed(2)} z:{a.z.toFixed(2)}</span>
                            </div>
                            <button
                              onClick={()=> setCurrentAnchorIndex(selected? null: idx)}
                              className={`text-xs px-2 py-1 rounded ${selected? 'bg-white text-indigo-600':'bg-indigo-600 text-white'} hover:opacity-90`}
                            >{selected? 'Cancelar':'Selecionar'}</button>
                          </div>
                        );
                      })}
                    </div>
              )}
              {/* Botões extras removidos conforme solicitação */}
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
                    <div className="flex flex-col">
                      <span>{idx + 1}. {p.xPct.toFixed(2)}%, {p.yPct.toFixed(2)}%</span>
                      <span className="text-[10px] text-gray-500">anchorIndex: {p.anchorIndex!==undefined? p.anchorIndex: 'não atribuído'}</span>
                    </div>
                    <div className="flex gap-2">
                      {p.anchorIndex===undefined && anchors3d.length>0 && (
                        <button
                          onClick={()=> setPoints(prev=> prev.map(q=> q.id===p.id? {...q, anchorIndex: currentAnchorIndex!==null? currentAnchorIndex: 0 }: q))}
                          className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                        >Vincular {currentAnchorIndex!==null? `(${currentAnchorIndex})`: ''}</button>
                      )}
                      <button
                        onClick={() => removePoint(p.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >Remover</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={clearAll}
                  disabled={points.length === 0}
                  className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40 cursor-pointer"
                >
                  Limpar Todos
                </button>

                <button
                  onClick={exportJSON}
                  disabled={points.length === 0}
                  className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
                >
                  Salvar pontos
                </button>
                <button
                  onClick={runPythonWireframe}
                  disabled={pyLoading || points.length<3 || anchors3d.length<3 || bimPoints.length===0}
                  className="px-2 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 cursor-pointer"
                >{pyLoading? 'Python...' : 'Wireframe Python'}</button>
                {wireframeReady && resultImageUrl && (
                  <a
                    href={resultImageUrl}
                    download={`wireframe_${fotoId||'imagem'}.png`}
                    className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                  >Download</a>
                )}
              </div>
            </div>
         </div>
        </div>
      )}
      {showMiniAnchors && worksite && fotoId && (
        <div className="fixed bottom-3 right-3 w-72 h-48 bg-white border rounded shadow-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between bg-indigo-600 text-white px-2 py-1 text-xs">
            <span>Visão Âncoras 3D</span>
            <button
              onClick={() => setShowMiniAnchors(false)}
              className="text-white/80 hover:text-white"
            >x</button>
          </div>
          <div className="flex-1">
            {loadingAnchors || loadingBim ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-500">Carregando...</div>
            ) : (
              <iframe
                src={`/comparacao/ancoras?worksite=${worksite}&fotoId=${fotoId}`}
                className="w-full h-full border-0"
                title="Mini Anchors Viewer"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
