/**
 * Versionamento do app Arrow.
 *
 * - `BUNDLE_VERSION`: versão semântica do bundle web (HTML/JS/CSS) entregue por OTA.
 * - `NATIVE_BUILD`: build da casca nativa (APK). Só muda quando algo nativo muda.
 *
 * Ambos são injetados em build time pelo Vite (`define`).
 */

export const BUNDLE_VERSION: string =
  typeof __BUNDLE_VERSION__ !== 'undefined' ? __BUNDLE_VERSION__ : '0.0.0-dev';

export const NATIVE_BUILD: number =
  typeof __NATIVE_BUILD__ !== 'undefined' ? __NATIVE_BUILD__ : 1;

/** Identificador do app usado para validar o manifesto de release. */
export const APP_ID = 'app.lovable.4cb88575f5074382bc47b7a5cefd825f';

/**
 * Compara duas versões semânticas simples (x.y.z, sufixos ignorados).
 * Retorna 1 se `a > b`, -1 se `a < b`, 0 se equivalentes.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('-')[0]
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0);

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}
