import { NextRequest } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

interface Point2D { xPct: number; yPct: number; }
interface Point3D { x: number; y: number; z: number; }

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const raw = await req.text();
    let body: any = {};
    try { body = JSON.parse(raw || '{}'); } catch {}
    const { imageUrl, points2d, anchors3d, bimPoints, noGui, noPerm, fovH, fovV } = body || {};

    if (!imageUrl || !Array.isArray(points2d) || !Array.isArray(anchors3d) || !Array.isArray(bimPoints)) {
      return json(400, { error: 'Campos obrigatórios: imageUrl, points2d[], anchors3d[], bimPoints[]', received: Object.keys(body) });
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return json(400, { error: 'Falha ao baixar imagem', status: imgRes.status });
    }
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const baseDir = path.join(process.cwd(), 'python');
    const runId = randomUUID();
    const tempDir = path.join(baseDir, 'temp', runId);
    await fs.mkdir(tempDir, { recursive: true });

    const imagePath = path.join(tempDir, 'foto.jpg');
    const points2dPath = path.join(tempDir, 'pontos2d.json');
    const anchorsPath = path.join(tempDir, 'anchors3d.json');
    const bimPath = path.join(tempDir, 'bim_points.json');
    const outDir = path.join(tempDir, 'out');
    await fs.mkdir(outDir, { recursive: true });

    await fs.writeFile(imagePath, imgBuffer);
    await fs.writeFile(points2dPath, JSON.stringify(points2d, null, 2));
    await fs.writeFile(anchorsPath, JSON.stringify(anchors3d, null, 2));
    await fs.writeFile(bimPath, JSON.stringify(bimPoints, null, 2));

    const scriptPath = path.join(baseDir, 'wireframe.py');
    if (!(await fileExists(scriptPath))) {
      return json(500, { error: 'wireframe.py não encontrado', scriptPath });
    }

    const pythonExec = process.platform === 'win32'
      ? path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
      : path.join(process.cwd(), '.venv', 'bin', 'python');
    const cmd = await fileExists(pythonExec) ? pythonExec : 'python';

    const args = [
      scriptPath,
      '--image', imagePath,
      '--points2d', points2dPath,
      '--anchors', anchorsPath,
      '--bim', bimPath,
      '--out', outDir,
      ...(noGui ? ['--no-gui'] : []),
      ...(typeof fovH === 'number' ? ['--fov-h', String(fovH)] : []),
      ...(typeof fovV === 'number' ? ['--fov-v', String(fovV)] : []),
      ...(noPerm ? ['--no-perm'] : [])
    ];

    const execResult = await runProcess(cmd, args, { cwd: process.cwd(), timeoutMs: 60_000 });
    if (execResult.code !== 0) {
      return json(500, {
        error: 'Execução Python falhou',
        stderr: execResult.stderr,
        stdout: execResult.stdout,
        code: execResult.code,
        cmd,
        args,
        durationMs: Date.now() - started
      });
    }

    const anchorsImgPath = path.join(outDir, 'resultado_anchors.png');
    const wireframeImgPath = path.join(outDir, 'bim_wireframe.png');
    const anchorsImg = await readImageBase64(anchorsImgPath);
    const wireframeImg = await readImageBase64(wireframeImgPath);

    return json(200, {
      runId,
      stdout: execResult.stdout,
      anchorsImage: anchorsImg,
      wireframeImage: wireframeImg,
      pythonExecUsed: cmd,
      argsUsed: args,
      pairingMode: noPerm ? 'fixed-order' : 'adaptive',
      durationMs: Date.now() - started
    });
  } catch (e: any) {
    return json(500, { error: e?.message || 'Erro interno', stack: e?.stack });
  }
}

async function fileExists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

function runProcess(cmd: string, args: string[], opts: { cwd: string; timeoutMs: number }) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      stderr += '\nTimeout alcançado';
      try { child.kill('SIGTERM'); } catch {}
    }, opts.timeoutMs);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

async function readImageBase64(filePath: string) {
  try {
    const buf = await fs.readFile(filePath);
    return 'data:image/png;base64,' + buf.toString('base64');
  } catch { return null; }
}

function json(status: number, obj: any) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
