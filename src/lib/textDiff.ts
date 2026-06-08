// Minimal line-level diff (Myers-ish, simple LCS) for short policy texts.
// Returns an array of segments to render side-by-side.

export type DiffOp = "equal" | "added" | "removed";
export interface DiffLine {
  op: DiffOp;
  text: string;
}

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = (oldText ?? "").split(/\r?\n/);
  const b = (newText ?? "").split(/\r?\n/);
  const n = a.length;
  const m = b.length;

  // LCS table
  const dp: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: "equal", text: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ op: "removed", text: a[i] });
      i++;
    } else {
      out.push({ op: "added", text: b[j] });
      j++;
    }
  }
  while (i < n) { out.push({ op: "removed", text: a[i++] }); }
  while (j < m) { out.push({ op: "added", text: b[j++] }); }
  return out;
}
