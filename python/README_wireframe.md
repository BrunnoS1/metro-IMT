# Wireframe Python

## Ambiente
```powershell
python -m venv .venv
. .venv\Scripts\activate
pip install -r python\requirements.txt
```

## Execução manual
```powershell
python python\wireframe.py ^
  --image python\foto.jpg ^
  --points2d python\pontos2d.json ^
  --anchors python\anchors3d.json ^
  --bim python\bim_points.json ^
  --out python\out ^
  --no-gui ^
  --fov-h 91 ^
  --no-perm
```
Imagens geradas: `python/out/resultado_anchors.png` e `python/out/bim_wireframe.png`.

### Novos parâmetros
- `--fov-h`: FOV horizontal em graus (default 91). Ajuste se souber a ótica real.
- `--fov-v`: FOV vertical em graus (opcional). Se omitido, assume pixels quadrados e usa `fx` para `fy`.
- `--no-perm`: Desabilita a busca de permutação (mantém ordem fornecida dos anchors). Use quando correspondências estão corretas e você quer estabilidade.

## Via API Next.js
Endpoint: `POST /api/wireframe`
Body exemplo:
```json
{
  "imageUrl": "https://host/foto.jpg",
  "points2d": [{"xPct":13.1,"yPct":19.63}],
  "anchors3d": [{"x":159526.95,"y":781.03,"z":-248787.01}],
  "bimPoints": [{"x":159526.95,"y":781.03,"z":-248787.01}],
  "noGui": true
}
```
Resposta: base64 em `anchorsImage`, `wireframeImage`, além de `stdout`.

## Erros comuns
- "Falha ao baixar imagem": URL inválida ou sem permissão.
- "solvePnP falhou": menos de 3 pares válidos (pontos/anchors).
- Timeout: script excedeu 60s (reduza quantidade de pontos BIM).

## Dicas
- Ajuste `--fov-h` / `--fov-v` se observar deslocamentos sistemáticos (vertical/horizontal) persistentes.
- Use `--no-perm` para evitar reorder de âncoras quando a semântica de cada ponto é importante.
- Limite BIMPoints (ex: primeiros 500) para performance se necessário; a API já pode enviar todos.
- Garanta pelo menos 4 correspondências para maior robustez (RANSAC / fallback).
- Remova `--no-gui` para visualizar janelas OpenCV localmente.
