"""Geração de wireframe BIM projetado sobre imagem usando solvePnP.
Uso:
    python wireframe.py --image foto.jpg --points2d pontos2d.json --anchors anchors3d.json --bim bim_points.json --out out_dir [--no-gui]
"""

import json
import numpy as np
import cv2
import math
import argparse
import os
import sys
import itertools


def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def voxel_downsample(points: np.ndarray, voxel_size: float) -> np.ndarray:
    if len(points) == 0:
        return points
    voxels = {}
    for p in points:
        key = tuple((p // voxel_size).astype(int))
        if key not in voxels:
            voxels[key] = p
    return np.array(list(voxels.values()), dtype=np.float32)


def adaptive_2d_downsample(points_2d: np.ndarray, grid_size: float, w: int, h: int, max_per_cell=3) -> np.ndarray:
    occupied = {}
    selected = []
    for (x, y) in points_2d:
        if not (0 <= x < w and 0 <= y < h):
            continue
        gx = int(x // grid_size)
        gy = int(y // grid_size)
        key = (gx, gy)
        if key not in occupied:
            occupied[key] = 0
        if occupied[key] < max_per_cell:
            selected.append((x, y))
            occupied[key] += 1
    return np.array(selected, dtype=np.float32)


# =====================================================================
# Função substituta do KNN (sem sklearn!)
# =====================================================================

def knn_neighbors(points: np.ndarray, k: int) -> np.ndarray:
    n = len(points)
    neighbors = []
    for i in range(n):
        dists = np.linalg.norm(points - points[i], axis=1)
        idx = np.argsort(dists)[1:k+1]
        neighbors.append(idx)
    return np.array(neighbors)


# =====================================================================
# Utilidades de pose / erro
# =====================================================================

def reprojection_error(points3d_norm: np.ndarray, points2d: np.ndarray, rvec, tvec, K, dist) -> float:
    proj, _ = cv2.projectPoints(points3d_norm, rvec, tvec, K, dist)
    proj = proj.reshape(-1, 2)
    err = np.linalg.norm(proj - points2d, axis=1)
    return float(np.mean(err)), float(np.max(err))

def permutation_search(points3d_norm: np.ndarray, points2d: np.ndarray, K, dist, max_n: int = 8):
    n = len(points3d_norm)
    if n != len(points2d):
        return None  # precisa mesma contagem
    if n > max_n:
        print(f"[perm] n={n} > {max_n}, ignorando brute force")
        return None
    best = None
    best_mean = 1e9
    indices = range(n)
    print(f"[perm] iniciando brute force {n}! = {math.factorial(n)} permutações...")
    for perm in itertools.permutations(indices):
        p3 = points3d_norm[list(perm)]
        ok, rvec_tmp, tvec_tmp = cv2.solvePnP(
            p3,
            points2d,
            K,
            dist,
            flags=cv2.SOLVEPNP_EPNP
        )
        if not ok:
            continue
        mean_err, max_err = reprojection_error(p3, points2d, rvec_tmp, tvec_tmp, K, dist)
        if mean_err < best_mean:
            best_mean = mean_err
            best = {
                "perm": perm,
                "rvec": rvec_tmp,
                "tvec": tvec_tmp,
                "mean_err": mean_err,
                "max_err": max_err
            }
    if best:
        print(f"[perm] melhor mean_err={best['mean_err']:.2f} max_err={best['max_err']:.2f}")
    else:
        print("[perm] nenhuma solução encontrada")
    return best


# =====================================================================
# 1. Carregar JSONs e imagem
# =====================================================================

def parse_args():
    p = argparse.ArgumentParser(description="Gerar wireframe BIM projetado sobre foto")
    p.add_argument("--image", required=True, help="Caminho da imagem")
    p.add_argument("--points2d", required=True, help="JSON dos pontos 2D (%)")
    p.add_argument("--anchors", required=True, help="JSON dos anchors 3D")
    p.add_argument("--bim", required=True, help="JSON dos pontos BIM 3D")
    p.add_argument("--out", default="out", help="Diretório de saída")
    p.add_argument("--no-gui", action="store_true", help="Não abrir janelas OpenCV")
    p.add_argument("--fov-h", type=float, default=91.0, help="FOV horizontal em graus")
    p.add_argument("--fov-v", type=float, default=None, help="FOV vertical em graus (opcional, senão derivado do aspecto)")
    p.add_argument("--no-perm", action="store_true", help="Desabilita brute-force de permutação de correspondências")
    return p.parse_args()

def ensure_out(path: str):
    os.makedirs(path, exist_ok=True)

def main():
    args = parse_args()
    ensure_out(args.out)
    points2d_raw = load_json(args.points2d)
    points3d_raw = load_json(args.anchors)
    img = cv2.imread(args.image)
    if img is None:
        raise Exception(f"Erro ao carregar {args.image}")
    h, w = img.shape[:2]
    print(f"Imagem carregada: {w}x{h}")
    print(f"Points2D recebidos: {len(points2d_raw)}")
    print(f"Anchors3D recebidos: {len(points3d_raw)}")
    if len(points2d_raw) > 0:
        print(f"Primeiro ponto 2D: {points2d_raw[0]}")
    if len(points3d_raw) > 0:
        print(f"Primeiro anchor 3D: {points3d_raw[0]}")
    
    if len(points2d_raw) < 4 or len(points3d_raw) < 4:
        raise Exception("Precisa de pelo menos 4 correspondências para pose robusta")

# =====================================================================
# 2. Converter pontos 2D (% → px)
# =====================================================================

    points2d = np.array([
        [(p["xPct"] / 100.0) * w, (p["yPct"] / 100.0) * h]
        for p in points2d_raw
    ], dtype=np.float32)


# =====================================================================
# 3. Anchors 3D + normalização (sem alterar escala)
# =====================================================================

    points3d = np.array([[p["x"], p["y"], p["z"]] for p in points3d_raw], dtype=np.float32)
    center = np.mean(points3d, axis=0)
    points3d_norm = points3d - center
    anchor_dists = np.linalg.norm(points3d_norm, axis=1)
    anchor_radius = float(anchor_dists.max())
    if anchor_radius < 1:
        anchor_radius = 100.0


# =====================================================================
# 4. Matriz intrínseca via FOV + distorção radial
# =====================================================================

    # Calcular intrínsecas a partir de FOV horizontal (e vertical se fornecido)
    fov_h_deg = args.fov_h
    fov_h_rad = math.radians(fov_h_deg)
    fx = w / (2 * math.tan(fov_h_rad / 2))
    if args.fov_v is not None:
        fov_v_rad = math.radians(args.fov_v)
        fy = h / (2 * math.tan(fov_v_rad / 2))
    else:
        # Assume pixels quadrados: usar fx para fy
        fy = fx
    cx = w / 2.0
    cy = h / 2.0
    print(f"Intrínsecas: fx={fx:.2f} fy={fy:.2f} cx={cx:.2f} cy={cy:.2f} (FOVh={fov_h_deg} FOVv={'auto' if args.fov_v is None else args.fov_v})")
    K = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]], dtype=np.float32)
    # Distorção leve (k1, k2, p1, p2, k3)
    dist = np.array([0.0, 0.0, 0.0, 0.0, 0.0], dtype=np.float32)


    # =====================================================================
    # 5. Pose estimation robusta com fallback + permutação
    # =====================================================================

    rvec = None
    tvec = None
    used_order = list(range(len(points3d_norm)))

    # 5.1 Tentativa RANSAC (parâmetros mais tolerantes)
    print("Tentando solvePnPRansac...")
    ok, rvec, tvec, inliers = cv2.solvePnPRansac(
        points3d_norm,
        points2d,
        K,
        dist,
        reprojectionError=8.0,
        confidence=0.995,
        iterationsCount=300,
        flags=cv2.SOLVEPNP_ITERATIVE
    )
    if ok and inliers is not None and len(inliers) >= 4:
        print(f"RANSAC OK: {len(inliers)}/{len(points2d)} inliers")
        inlier_idx = inliers.flatten()
        p3_in = points3d_norm[inlier_idx]
        p2_in = points2d[inlier_idx]
        ok2, rvec, tvec = cv2.solvePnP(
            p3_in,
            p2_in,
            K,
            dist,
            rvec=rvec,
            tvec=tvec,
            useExtrinsicGuess=True,
            flags=cv2.SOLVEPNP_ITERATIVE
        )
        if ok2:
            print("Refinamento pós-RANSAC OK")
        else:
            print("Refinamento pós-RANSAC falhou, usando pose RANSAC bruta")
    else:
        print("RANSAC falhou ou inliers insuficientes. Fallback para métodos diretos.")
        # 5.2 Fallback EPNP
        ok_epnp, rvec_epnp, tvec_epnp = cv2.solvePnP(
            points3d_norm,
            points2d,
            K,
            dist,
            flags=cv2.SOLVEPNP_EPNP
        )
        if ok_epnp:
            print("EPNP OK")
            rvec, tvec = rvec_epnp, tvec_epnp
        else:
            print("EPNP falhou, tentando ITERATIVE direto")
            ok_it, rvec_it, tvec_it = cv2.solvePnP(
                points3d_norm,
                points2d,
                K,
                dist,
                flags=cv2.SOLVEPNP_ITERATIVE
            )
            if not ok_it:
                raise Exception("Nenhuma estratégia de solvePnP obteve solução")
            rvec, tvec = rvec_it, tvec_it

    # 5.3 Reprojection diagnóstico inicial
    mean_err, max_err = reprojection_error(points3d_norm, points2d, rvec, tvec, K, dist)
    print(f"Erro reprojection inicial mean={mean_err:.2f}px max={max_err:.2f}px")

    # 5.4 Se erro muito alto, tentar brute force de permutação (assumindo correspondências desconhecidas)
    if mean_err > 25.0 and not args.no_perm:
        print("Erro alto, iniciando brute force permutação para realinhar correspondências...")
        best = permutation_search(points3d_norm, points2d, K, dist, max_n=8)
        if best:
            used_order = list(best["perm"])
            points3d_perm = points3d_norm[used_order]
            rvec, tvec = best["rvec"], best["tvec"]
            mean_err, max_err = reprojection_error(points3d_perm, points2d, rvec, tvec, K, dist)
            print(f"Após permutação: mean={mean_err:.2f}px max={max_err:.2f}px")
            # Refinar LM se disponível
            try:
                rvec_ref, tvec_ref = cv2.solvePnPRefineLM(
                    points3d_perm,
                    points2d,
                    K,
                    dist,
                    rvec,
                    tvec
                )
                rvec, tvec = rvec_ref, tvec_ref
                mean_err, max_err = reprojection_error(points3d_perm, points2d, rvec, tvec, K, dist)
                print(f"LM pós-permutação: mean={mean_err:.2f}px max={max_err:.2f}px")
            except:
                print("LM não disponível pós-permutação")
            # Substitui conjunto normalizado para projeção subsequente
            points3d_norm = points3d_perm
        else:
            print("Permutação não melhorou a solução.")
    else:
        # Tentativa LM refinamento leve se não veio de permutação e ainda não refinado
        try:
            rvec_ref, tvec_ref = cv2.solvePnPRefineLM(
                points3d_norm,
                points2d,
                K,
                dist,
                rvec,
                tvec
            )
            rvec, tvec = rvec_ref, tvec_ref
            mean_err, max_err = reprojection_error(points3d_norm, points2d, rvec, tvec, K, dist)
            print(f"LM adicional: mean={mean_err:.2f}px max={max_err:.2f}px")
        except:
            pass

    print(f"Pose final: mean_err={mean_err:.2f}px max_err={max_err:.2f}px; ordem_used={used_order}")
    # Diagnóstico por eixo
    proj_check, _ = cv2.projectPoints(points3d_norm, rvec, tvec, K, dist)
    proj_check = proj_check.reshape(-1, 2)
    deltas = proj_check - points2d
    mean_dx = float(np.mean(deltas[:,0]))
    mean_dy = float(np.mean(deltas[:,1]))
    print(f"Erro médio por eixo: dx={mean_dx:.2f}px dy={mean_dy:.2f}px")

    # Ajuste automático de fy se viés vertical grande
    if abs(mean_dy) > 12.0 and len(points2d) >= 4:
        print("Viés vertical detectado; iniciando ajuste de fy...")
        base_fx = K[0,0]
        base_fy = K[1,1]
        best_state = (mean_err, mean_dy, base_fy, rvec, tvec, K.copy())
        # Usar pontos inliers se disponíveis, senão todos
        pts3_for_refine = points3d_norm
        pts2_for_refine = points2d
        for scale in np.linspace(0.90, 1.10, 21):
            K_try = K.copy()
            K_try[1,1] = base_fy * scale
            ok_try, rvec_try, tvec_try = cv2.solvePnP(
                pts3_for_refine,
                pts2_for_refine,
                K_try,
                dist,
                rvec=rvec,
                tvec=tvec,
                useExtrinsicGuess=True,
                flags=cv2.SOLVEPNP_ITERATIVE
            )
            if not ok_try:
                continue
            proj_try, _ = cv2.projectPoints(pts3_for_refine, rvec_try, tvec_try, K_try, dist)
            proj_try = proj_try.reshape(-1,2)
            deltas_try = proj_try - pts2_for_refine
            mean_err_try = float(np.mean(np.linalg.norm(deltas_try, axis=1)))
            mean_dy_try = float(np.mean(deltas_try[:,1]))
            # Critério: minimizar |mean_dy| e mean_err
            score = abs(mean_dy_try) + 0.25 * mean_err_try
            best_score = abs(best_state[1]) + 0.25 * best_state[0]
            if score < best_score:
                best_state = (mean_err_try, mean_dy_try, K_try[1,1], rvec_try, tvec_try, K_try)
        if best_state[2] != base_fy:
            mean_err, mean_dy, new_fy, rvec, tvec, K = best_state
            print(f"Ajuste fy aplicado: fy {base_fy:.2f} -> {new_fy:.2f}; mean_err={mean_err:.2f} dy={mean_dy:.2f}")
            # Recalcular métricas finais
            proj_final, _ = cv2.projectPoints(points3d_norm, rvec, tvec, K, dist)
            proj_final = proj_final.reshape(-1,2)
            deltas_final = proj_final - points2d
            print(f"Após ajuste fy: dx_mean={np.mean(deltas_final[:,0]):.2f}px dy_mean={np.mean(deltas_final[:,1]):.2f}px")
        else:
            print("Ajuste fy não trouxe melhoria significativa.")


# =====================================================================
# 6. Projetar anchors
# =====================================================================

    projected_anchors, _ = cv2.projectPoints(points3d_norm, rvec, tvec, K, dist)
    projected_anchors = projected_anchors.reshape(-1, 2)


# =====================================================================
# 7. Render anchors
# =====================================================================

    overlay = img.copy()
    for (x, y) in points2d:
        cv2.circle(overlay, (int(x), int(y)), 8, (0, 255, 0), -1)
    for (x, y) in projected_anchors:
        if 0 <= x < w and 0 <= y < h:
            cv2.circle(overlay, (int(x), int(y)), 8, (0, 0, 255), -1)
    cv2.imwrite(os.path.join(args.out, "resultado_anchors.png"), overlay)


# =====================================================================
# 8. Carregar BIM points
# =====================================================================

    bim_raw = load_json(args.bim)
    bim_points = np.array([[p["x"], p["y"], p["z"]] for p in bim_raw], dtype=np.float32)

    local_threshold = 3.0 * anchor_radius
    dists_bim_to_center = np.linalg.norm(bim_points - center, axis=1)
    mask_local = dists_bim_to_center <= local_threshold
    bim_local = bim_points[mask_local]
    if len(bim_local) == 0:
        raise Exception("Nenhum ponto BIM está perto dos anchors.")


# =====================================================================
# 9. Voxelização leve
# =====================================================================

    voxel_size = max(anchor_radius / 3.0, 1.0)
    bim_voxel = voxel_downsample(bim_local, voxel_size)
    if len(bim_voxel) == 0:
        bim_voxel = bim_local.copy()
    bim_voxel_norm = bim_voxel - center


# =====================================================================
# 10. Projetar pontos BIM
# =====================================================================

    bim_proj, _ = cv2.projectPoints(bim_voxel_norm, rvec, tvec, K, dist)
    bim_proj = bim_proj.reshape(-1, 2)


# =====================================================================
# 11. Wireframe via KNN (NOVA VERSÃO SEM SKLEARN!)
# =====================================================================

    print("\nGerando wireframe aproximado...")

    k = 4
    indices = knn_neighbors(bim_voxel_norm, k)
    edges = set()
    for i in range(len(bim_voxel_norm)):
        for j in indices[i]:
            if i < j:
                d = np.linalg.norm(bim_voxel_norm[i] - bim_voxel_norm[j])
                if d < 4 * voxel_size:
                    edges.add((i, j))
    edges = list(edges)
    print(f"Total de arestas aproximadas: {len(edges)}")


# =====================================================================
# 12. Render wireframe
# =====================================================================

    bim_overlay = img.copy()
    for (i, j) in edges:
        x1, y1 = bim_proj[i]
        x2, y2 = bim_proj[j]
        if 0 <= x1 < w and 0 <= y1 < h and 0 <= x2 < w and 0 <= y2 < h:
            cv2.line(bim_overlay, (int(x1), int(y1)), (int(x2), int(y2)), (255, 255, 0), 1)
    cv2.putText(
        bim_overlay,
        "Wireframe",
        (30, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 0),
        2
    )
    cv2.imwrite(os.path.join(args.out, "bim_wireframe.png"), bim_overlay)
    print("\nArquivos salvos em:", os.path.abspath(args.out))


# =====================================================================
# 13. Mostrar janelas
# =====================================================================

    if not args.no_gui:
        cv2.imshow("Anchors Overlay", overlay)
        cv2.imshow("Wireframe BIM", bim_overlay)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("Erro:", e, file=sys.stderr)
        sys.exit(1)
