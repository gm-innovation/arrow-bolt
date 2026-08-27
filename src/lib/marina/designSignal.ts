/**
 * Sinal de design da Marina.
 *
 * Quando a Marina cria ou exporta uma peça no Canva, ela coloca a URL em uma
 * linha separada no topo da resposta: `DESIGNCANVA: https://...`.
 * A linha é técnica — não aparece na conversa; ela alimenta o palco de preview.
 */

const SIGNAL_RE = /^[ \t]*DESIGNCANVA:[ \t]*(\S+)[ \t]*$/im;

export interface DesignSignal {
  url: string;
  /** Texto da resposta sem a linha do sinal. */
  text: string;
}

export function readDesignSignal(content: string | null | undefined): DesignSignal | null {
  if (!content) return null;
  const match = content.match(SIGNAL_RE);
  if (!match) return null;
  const url = match[1].trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return { url, text: content.replace(match[0], "").replace(/^\s*\n/, "").trim() };
}

/** Remove a linha do sinal para exibir só o texto ao colaborador. */
export function stripDesignSignal(content: string | null | undefined): string {
  if (!content) return "";
  return readDesignSignal(content)?.text ?? content;
}

/** Monta a URL de embed do Canva a partir do link do design. */
export function canvaEmbedUrl(url: string): string | null {
  const id = url.match(/\/design\/([A-Za-z0-9_-]+)/)?.[1];
  if (!id) return null;
  const token = url.match(/\/design\/[A-Za-z0-9_-]+\/([A-Za-z0-9_-]+)/)?.[1];
  const base = token && !["edit", "view", "watch"].includes(token)
    ? `https://www.canva.com/design/${id}/${token}/view`
    : `https://www.canva.com/design/${id}/view`;
  return `${base}?embed`;
}
