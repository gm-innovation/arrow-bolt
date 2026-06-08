import type { ContextItem } from "@/hooks/useQualityOrgContext";

export type SwotScenario = "ofensivo" | "defensivo" | "reorientacao" | "sobrevivencia" | "indefinido";

export interface ScenarioResult {
  scenario: SwotScenario;
  label: string;
  description: string;
  internalScore: number;
  externalScore: number;
}

const weight = (impact?: string | null) => (impact === "high" ? 3 : impact === "medium" ? 2 : impact === "low" ? 1 : 1);

export function computeSwotScenario(items: ContextItem[]): ScenarioResult {
  let strengths = 0, weaknesses = 0, opportunities = 0, threats = 0;
  for (const it of items) {
    const w = weight(it.impact_level);
    if (it.category === "swot_strength") strengths += w;
    else if (it.category === "swot_weakness") weaknesses += w;
    else if (it.category === "swot_opportunity") opportunities += w;
    else if (it.category === "swot_threat") threats += w;
  }
  const internalScore = strengths - weaknesses;
  const externalScore = opportunities - threats;

  if (strengths + weaknesses + opportunities + threats === 0) {
    return {
      scenario: "indefinido", label: "Indefinido",
      description: "Cadastre itens SWOT para calcular o cenário estratégico.",
      internalScore, externalScore,
    };
  }

  let scenario: SwotScenario;
  let label: string;
  let description: string;
  if (internalScore >= 0 && externalScore >= 0) {
    scenario = "ofensivo"; label = "Ofensivo";
    description = "Forças internas + oportunidades externas. Avançar com novas iniciativas.";
  } else if (internalScore >= 0 && externalScore < 0) {
    scenario = "defensivo"; label = "Defensivo";
    description = "Forças internas, mas ambiente hostil. Proteger posição e reduzir exposição.";
  } else if (internalScore < 0 && externalScore >= 0) {
    scenario = "reorientacao"; label = "Reorientação";
    description = "Oportunidades externas, mas fraquezas internas. Reorganizar para aproveitar.";
  } else {
    scenario = "sobrevivencia"; label = "Sobrevivência";
    description = "Fraquezas internas + ameaças externas. Foco em mitigação e continuidade.";
  }
  return { scenario, label, description, internalScore, externalScore };
}
