/**
 * Parser das seções dos relatórios técnicos importados do Auvo.
 * Os cabeçalhos aparecem em formatos variados: "A. ...", "A) ...", "A - ...",
 * "A: ..." e até com espaço antes do separador ("D ) ...").
 * Um mesmo relatório pode conter VÁRIOS blocos A–F (um por equipamento/serviço),
 * então todas as seções de material valem para a auditoria.
 */

export interface ReportSection {
  key: string; // letra da seção (A..Z) ou "_intro"
  title: string;
  body: string;
}

const SECTION_REGEX = /^\s*([A-Z])\s*[.)\-:]\s*(.*)$/;

export const parseReportSections = (reportText: string): ReportSection[] => {
  const lines = reportText.split(/\r?\n/);
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;
  const intro: string[] = [];

  for (const line of lines) {
    const match = line.match(SECTION_REGEX);
    // Só trata como cabeçalho quando o restante da linha é curto (título),
    // evitando confundir com frases que começam com letra + separador.
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

// Aceita qualquer título que comece por material/materiais/materials:
// "MATERIAL FORNECIDO", "MATERIAIS FORNECIDOS", "MATERIAL UTILIZADO",
// "MATERIAL FORNECIDOS PELA GOOGLEMARINE", "MATERIALS SUPPLIED", etc.
const MATERIAL_TITLE = /^\s*materi(?:al|ais|als)\b/i;

const isMaterialSection = (s: ReportSection) => MATERIAL_TITLE.test(s.title) || s.key === "F";

/** Converte respostas inline como "F) 02 kits" em conteúdo auditável. */
const materialBody = (section: ReportSection) => {
  if (section.key !== "F" || MATERIAL_TITLE.test(section.title)) return section.body;
  return [section.title, section.body].filter((value) => value.trim()).join("\n").trim();
};

/**
 * Todas as seções de material declaradas no relatório (um relatório pode ter
 * mais de um bloco A–F). Lista vazia quando nenhuma seção é declarada.
 */
export const extractSuppliedMaterialSections = (
  reportText: string | null | undefined,
): Array<{ title: string; body: string; index: number }> => {
  if (!reportText?.trim()) return [];
  return parseReportSections(reportText)
    .filter(isMaterialSection)
    .map((s, index) => ({
      title: MATERIAL_TITLE.test(s.title) ? s.title : "Material fornecido",
      body: materialBody(s),
      index: index + 1,
    }));
};

/** Retorna o texto da seção de material fornecido, ou null quando não declarada. */
export const extractSuppliedMaterialSection = (
  reportText: string | null | undefined,
): { title: string; body: string } | null => {
  const sections = extractSuppliedMaterialSections(reportText);
  if (sections.length === 0) return null;
  // Compatibilidade: consolida todos os blocos em um único texto.
  if (sections.length === 1) return { title: sections[0].title, body: sections[0].body };
  return {
    title: `${sections[0].title} (${sections.length} blocos)`,
    body: sections.map((s) => `[Bloco ${s.index}] ${s.body}`).join("\n"),
  };
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

/** true quando NENHUM dos blocos declarados traz material. */
export const areAllMaterialSectionsEmpty = (
  sections: Array<{ body: string }>,
): boolean => sections.every((s) => isEmptyMaterialSection(s.body));

