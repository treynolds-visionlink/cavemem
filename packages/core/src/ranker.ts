export interface RankItem {
  id: number;
  bm25?: number;
  cosine?: number;
}

/**
 * Normalize BM25 and cosine scores into [0, 1], then blend using alpha.
 * alpha=1 → pure keyword, alpha=0 → pure vector.
 */
export function hybridRank(items: RankItem[], alpha: number): Array<{ id: number; score: number }> {
  const bm25s = items.map((x) => x.bm25 ?? 0);
  const cosines = items.map((x) => x.cosine ?? 0);
  const [bmin, bmax] = [Math.min(...bm25s), Math.max(...bm25s)];
  const [cmin, cmax] = [Math.min(...cosines), Math.max(...cosines)];
  const bRange = bmax - bmin || 1;
  const cRange = cmax - cmin || 1;

  return items
    .map((x) => {
      const b = ((x.bm25 ?? bmin) - bmin) / bRange;
      const c = ((x.cosine ?? cmin) - cmin) / cRange;
      return { id: x.id, score: alpha * b + (1 - alpha) * c };
    })
    .sort((a, b) => b.score - a.score);
}

export function cosine(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
