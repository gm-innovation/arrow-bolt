/**
 * Limpeza de Markdown nas respostas da Marina.
 *
 * A conversa é texto simples: não renderizamos Markdown, então qualquer marcação
 * que o modelo escreva apareceria crua na tela ("**PRODUTO**") e seria lida em voz
 * alta como "asterisco". Esta função é a rede de segurança na borda de exibição.
 */
export function toPlainText(input: string | null | undefined): string {
  if (!input) return '';
  let text = String(input);

  // Blocos e trechos de código: mantém o conteúdo, remove os acentos graves.
  text = text.replace(/```[a-z0-9]*\n?/gi, '').replace(/`+/g, '');

  // Negrito/itálico: **texto**, __texto__, *texto*, _texto_
  text = text
    .replace(/\*\*\*(.+?)\*\*\*/gs, '$1')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/__(.+?)__/gs, '$1')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=$|[\s.,;:!?)])/gs, '$1$2')
    .replace(/(^|[\s(])_(?!\s)(.+?)_(?=$|[\s.,;:!?)])/gs, '$1$2');

  // Marcadores de lista no início da linha viram travessão.
  text = text.replace(/^\s{0,6}[-*+•]\s+/gm, '— ');

  // Títulos Markdown e citações.
  text = text.replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s{0,3}>\s?/gm, '');

  // Links [texto](url) → texto (url); imagens perdem o "!".
  text = text.replace(/!?\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) =>
    String(url).startsWith('http') ? `${label} (${url})` : String(label),
  );

  // Linhas divisórias e asteriscos soltos remanescentes.
  text = text.replace(/^\s*([-*_]\s*){3,}$/gm, '').replace(/\*/g, '');

  // Espaços à direita e excesso de linhas em branco.
  return text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
