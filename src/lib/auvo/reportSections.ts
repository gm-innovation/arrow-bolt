/**
 * Parser das seções dos relatórios técnicos importados do Auvo.
 * Os relatórios seguem o padrão "A. ... B. ... F. MATERIAL FORNECIDO".
 * A auditoria de materiais vale apenas o que está declarado na seção de
 * material fornecido.
 */

export interface ReportSection {
  key: string; // letra da seção (A..Z) ou "_intro"
  title: string;
  body: string;
}

const SECTION_REGEX = /^\s*([A-Z])\s*\.\s*(.*)$/;

export const parseReportSections = (reportText: string): ReportSection[] => {
  const lines = reportText.split(/\r?\n/);
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;
  const intro: string[] = [];

  for (const line of lines) {
    const match = line.match(SECTION_REGEX);
    // Só trata como cabeçalho quando o restante da linha é curto (título),
    // evitando confundir com frases que começam com letra + ponto.
    if (match && match[2].trim().length <= 60) {
      if (current) sections.push(current);
      current = { key: match[1], title: match[2].trim(), body: "" };
      continue;
    }
    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    } else {
      intro.push(line);
    }
  }
  if (current) sections.push(current);

  const introText = intro.join("\n").trim();
  if (introText) {
    sections.unshift({ key: "_intro", title: "", body: introText });
  }

  return sections.map((s) => ({ ...s, body: s.body.trim() }));
};

const MATERIAL_TITLE = /materi(a|ai)s?\s+fornecid|materi(a|ai)s?\s+utilizad|material\s*$/i;

/** Retorna o texto da seção de material fornecido, ou null quando não declarada. */
export const extractSuppliedMaterialSection = (
  reportText: string | null | undefined,
): { title: string; body: string } | null => {
  if (!reportText?.trim()) return null;
  const sections = parseReportSections(reportText);
  const found = sections.find(
    (s) => MATERIAL_TITLE.test(s.title) || (s.key === "F" && !s.title),
  );
  if (!found) return null;
  return { title: found.title || "Material fornecido", body: found.body };
};

/** true quando a seção existe mas declara ausência de material. */
export const isEmptyMaterialSection = (body: string) => {
  const normalized = body.trim().toLowerCase().replace(/[.\-–—*\s]/g, "");
  return (
    normalized === "" ||
    ["na", "n/a", "nao", "não", "nenhum", "nenhummaterial", "semmaterial", "0"].includes(
      normalized.replace(/\//g, ""),
    )
  );
};
