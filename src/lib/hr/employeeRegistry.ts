/**
 * Rótulos, listas controladas e normalizações do cadastro de colaboradores (RH).
 * Datas sempre com construtor local (nunca `new Date('YYYY-MM-DD')`).
 */

export const MARITAL_STATUS_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União estável" },
  { value: "outro", label: "Outro" },
  { value: "nao_informado", label: "Não informado" },
] as const;

export const EDUCATION_OPTIONS = [
  { value: "fundamental_incompleto", label: "Fundamental incompleto" },
  { value: "fundamental_completo", label: "Fundamental completo" },
  { value: "medio_incompleto", label: "Médio incompleto" },
  { value: "medio_completo", label: "Médio completo" },
  { value: "tecnico", label: "Técnico" },
  { value: "superior_incompleto", label: "Superior incompleto" },
  { value: "superior_completo", label: "Superior completo" },
  { value: "pos_graduacao", label: "Pós-graduação" },
  { value: "mestrado", label: "Mestrado" },
  { value: "doutorado", label: "Doutorado" },
  { value: "nao_informado", label: "Não informado" },
] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "clt", label: "CLT" },
  { value: "estagio", label: "Estágio" },
  { value: "aprendiz", label: "Aprendiz" },
  { value: "temporario", label: "Temporário" },
  { value: "pj", label: "PJ" },
  { value: "autonomo", label: "Autônomo" },
  { value: "outro", label: "Outro" },
] as const;

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "em_ferias", label: "Em férias" },
  { value: "afastado", label: "Afastado" },
  { value: "licenca", label: "Licença" },
  { value: "desligado", label: "Desligado" },
  { value: "inativo", label: "Inativo" },
  { value: "cadastro_pendente", label: "Cadastro pendente" },
] as const;

export const CONTACT_KIND_OPTIONS = [
  { value: "telefone", label: "Telefone" },
  { value: "celular", label: "Celular" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
] as const;

export const CONTACT_CATEGORY_OPTIONS = [
  { value: "corporativo", label: "Corporativo" },
  { value: "pessoal", label: "Pessoal" },
] as const;

export const ADDRESS_KIND_OPTIONS = [
  { value: "residencial", label: "Residencial" },
  { value: "correspondencia", label: "Correspondência" },
  { value: "outro", label: "Outro" },
] as const;

export const DEPENDENT_RELATION_OPTIONS = [
  { value: "filho", label: "Filho(a)" },
  { value: "conjuge", label: "Cônjuge" },
  { value: "enteado", label: "Enteado(a)" },
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "outro", label: "Outro" },
] as const;

export const IDENTITY_DOC_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "rg", label: "RG" },
  { value: "cnh", label: "CNH" },
  { value: "ctps", label: "CTPS" },
  { value: "pis", label: "PIS/NIT" },
  { value: "titulo_eleitor", label: "Título de eleitor" },
  { value: "reservista", label: "Certificado de reservista" },
  { value: "passaporte", label: "Passaporte" },
  { value: "outro", label: "Outro" },
] as const;

export const IDENTITY_DOC_STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "valido", label: "Válido" },
  { value: "vencido", label: "Vencido" },
  { value: "rejeitado", label: "Rejeitado" },
] as const;

export const optionLabel = (
  options: readonly { value: string; label: string }[],
  value?: string | null,
) => options.find((o) => o.value === value)?.label ?? "—";

/** Mascara CPF/RG/CNH deixando visíveis apenas os últimos dígitos. */
export function maskSensitive(value?: string | null) {
  if (!value) return "—";
  const clean = String(value).trim();
  if (clean.length <= 4) return "•".repeat(clean.length);
  return `${"•".repeat(Math.max(3, clean.length - 4))}${clean.slice(-4)}`;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

/** Validação de CPF (dígitos verificadores). */
export function isValidCPF(value?: string | null) {
  const cpf = onlyDigits(String(value ?? ""));
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export const formatCPF = (value?: string | null) => {
  const d = onlyDigits(String(value ?? ""));
  if (d.length !== 11) return value ?? "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export const formatZip = (value?: string | null) => {
  const d = onlyDigits(String(value ?? ""));
  if (d.length !== 8) return value ?? "";
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

/** Anos/meses de casa a partir da data de admissão (sempre calculado). */
export function tenureLabel(hireDate?: string | null) {
  if (!hireDate) return "—";
  const [y, m, d] = hireDate.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const start = new Date(y, m - 1, d);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} ${rest === 1 ? "mês" : "meses"}`;
  return rest === 0 ? `${years} ${years === 1 ? "ano" : "anos"}` : `${years}a ${rest}m`;
}

/** Idade a partir da data de nascimento (sempre calculada). */
export function ageFromBirthDate(birthDate?: string | null) {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const born = new Date(y, m - 1, d);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

// ---------------- Normalizações da planilha ----------------

const stripAccents = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** "Não" | "1" | "Sim, 2 filhos" → { has, count } */
export function normalizeDependents(raw?: string | number | null): { has: boolean; count: number } {
  if (raw === null || raw === undefined || raw === "") return { has: false, count: 0 };
  if (typeof raw === "number") return { has: raw > 0, count: Math.max(0, Math.trunc(raw)) };
  const text = stripAccents(String(raw));
  if (/^(nao|n|0|nenhum)$/.test(text)) return { has: false, count: 0 };
  const num = text.match(/(\d+)/);
  if (num) {
    const count = Number(num[1]);
    return { has: count > 0, count };
  }
  if (/^(sim|s)$/.test(text)) return { has: true, count: 1 };
  return { has: false, count: 0 };
}

export function normalizeMaritalStatus(raw?: string | null): string {
  const t = stripAccents(String(raw ?? ""));
  if (!t) return "nao_informado";
  if (t.includes("solteir")) return "solteiro";
  if (t.includes("cas")) return "casado";
  if (t.includes("divorc") || t.includes("separad")) return "divorciado";
  if (t.includes("viuv")) return "viuvo";
  if (t.includes("uniao") || t.includes("amasi")) return "uniao_estavel";
  return "outro";
}

export function normalizeEducation(raw?: string | null): string {
  const t = stripAccents(String(raw ?? ""));
  if (!t) return "nao_informado";
  const incomplete = t.includes("incompl") || t.includes("cursando");
  if (t.includes("doutor")) return "doutorado";
  if (t.includes("mestr")) return "mestrado";
  if (t.includes("pos") || t.includes("mba") || t.includes("especializ")) return "pos_graduacao";
  if (t.includes("superior") || t.includes("graduac") || t.includes("faculdade") || t.includes("ensino sup"))
    return incomplete ? "superior_incompleto" : "superior_completo";
  if (t.includes("tecnic") || t.includes("tecnol")) return "tecnico";
  if (t.includes("medio") || t.includes("2 grau") || t.includes("segundo grau"))
    return incomplete ? "medio_incompleto" : "medio_completo";
  if (t.includes("fundamental") || t.includes("1 grau") || t.includes("primeiro grau"))
    return incomplete ? "fundamental_incompleto" : "fundamental_completo";
  return "nao_informado";
}

export function normalizeEmploymentType(raw?: string | null): string | null {
  const t = stripAccents(String(raw ?? ""));
  if (!t) return null;
  if (t.includes("clt") || t.includes("efetiv")) return "clt";
  if (t.includes("estag")) return "estagio";
  if (t.includes("aprend") || t.includes("jovem")) return "aprendiz";
  if (t.includes("tempor")) return "temporario";
  if (t.includes("pj") || t.includes("juridic")) return "pj";
  if (t.includes("autonom")) return "autonomo";
  return "outro";
}

/** "TEC. EM ELETRONICA II - C" → { name: "TEC. EM ELETRONICA", level: "II-C" } */
export function splitPositionAndLevel(raw?: string | null): { name: string; level: string | null } {
  const value = String(raw ?? "").trim();
  if (!value) return { name: "", level: null };
  const m = value.match(/^(.*?)[\s,-]+\b((?:I{1,3}|IV|V|VI)(?:\s*-\s*[A-D])?)\s*$/i);
  if (!m) return { name: value, level: null };
  const level = m[2].replace(/\s*-\s*/, "-").toUpperCase();
  return { name: m[1].replace(/[\s,-]+$/, "").trim(), level };
}

/** Quebra endereço em texto livre, preservando o original em `raw`. */
export function parseAddress(raw?: string | null) {
  const value = String(raw ?? "").trim();
  const result: {
    raw: string;
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  } = { raw: value, street: null, number: null, complement: null, district: null, city: null, state: null, zip_code: null };
  if (!value) return result;

  let rest = value;
  const cep = rest.match(/\b(\d{5})-?(\d{3})\b/);
  if (cep) {
    result.zip_code = `${cep[1]}-${cep[2]}`;
    rest = rest.replace(cep[0], "").trim();
  }
  const uf = rest.match(/[\s,/-]([A-Z]{2})\b\s*$/);
  if (uf) {
    result.state = uf[1];
    rest = rest.slice(0, uf.index).trim();
  }
  const parts = rest.split(/\s*[,;]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length) {
    const first = parts[0];
    const numMatch = first.match(/^(.*?)[,\s]+n?º?\s*(\d+[A-Za-z]?)\s*$/i);
    if (numMatch) {
      result.street = numMatch[1].trim();
      result.number = numMatch[2];
    } else {
      result.street = first;
      if (parts[1] && /^\d+[A-Za-z]?$/.test(parts[1])) result.number = parts.splice(1, 1)[0];
    }
    if (parts[1]) result.district = parts[1];
    if (parts[2]) result.city = parts[2];
    if (parts[3]) result.complement = parts.slice(3).join(", ");
  }
  return result;
}

/** Converte data em texto ou serial do Excel para `YYYY-MM-DD`. */
export function normalizeSheetDate(raw?: string | number | null): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    const base = new Date(1899, 11, 30);
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.trunc(raw));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }
  const text = String(raw).trim();
  const br = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (br) {
    const year = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
    return `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}
