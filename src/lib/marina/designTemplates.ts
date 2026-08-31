// Catálogo de modelos de pedido de design e montagem do prompt final.
// Regra da casa: sem estilo escolhido, a peça sai em fotografia ultrarrealista.

export interface DesignSpec {
  /** Modelo escolhido (chave do catálogo) ou "livre". */
  template: string;
  tema: string;
  texto: string;
  especificacoes: string;
  formato: string;
  tom: string;
  cta: string;
  estilo: string;
  marca: string;
  /** URLs de fotos reais que a peça deve reproduzir com fidelidade. */
  referencias: string[];
}

export interface DesignTemplate {
  key: string;
  label: string;
  descricao: string;
  /** Sugestões que preenchem os campos ao escolher o modelo. */
  sugestao: Partial<Omit<DesignSpec, "template" | "referencias">>;
}

export const FORMATOS = [
  { value: "post quadrado 1080x1080 (feed)", label: "Feed quadrado 1080×1080" },
  { value: "story vertical 1080x1920", label: "Story 1080×1920" },
  { value: "carrossel 1080x1350 com 3 páginas", label: "Carrossel 1080×1350" },
  { value: "banner horizontal 1920x1080", label: "Banner 1920×1080" },
  { value: "capa de LinkedIn 1584x396", label: "Capa LinkedIn 1584×396" },
];

export const TONS = [
  { value: "institucional e sóbrio", label: "Institucional" },
  { value: "comercial e persuasivo", label: "Comercial" },
  { value: "técnico e objetivo", label: "Técnico" },
  { value: "próximo e descontraído", label: "Descontraído" },
];

/** Estilos de imagem. O primeiro é o padrão da casa. */
export const ESTILOS = [
  {
    value:
      "fotografia ultrarrealista, luz natural, texturas e reflexos reais, sem qualquer aparência de ilustração, desenho, render 3D ou imagem gerada por IA",
    label: "Ultra-realista (padrão)",
  },
  {
    value:
      "foto ultrarrealista de produto/equipamento, fiel ao equipamento real das referências: mesmo modelo, cor, marca e proporções, sem inventar nem deformar detalhes",
    label: "Produto/equipamento fiel à referência",
  },
  {
    value:
      "foto técnica ultrarrealista em bancada de laboratório, iluminação controlada, foco nítido nos detalhes do instrumento",
    label: "Foto técnica de laboratório",
  },
  {
    value:
      "foto ultrarrealista de bordo: ambiente real de embarcação/plataforma, equipe com EPI, luz natural do mar",
    label: "Foto de bordo",
  },
  {
    value: "composição gráfica limpa com o brand kit da LECSOR, tipografia forte e fundo sólido da marca",
    label: "Gráfico com brand kit",
  },
  {
    value: "ilustração vetorial moderna e simples (somente se for realmente pedido)",
    label: "Ilustração (só quando pedido)",
  },
];

export const ESTILO_PADRAO = ESTILOS[0].value;

export const TEMPLATES: DesignTemplate[] = [
  {
    key: "livre",
    label: "Pedido livre",
    descricao: "Você escreve tudo do zero.",
    sugestao: {},
  },
  {
    key: "promocao",
    label: "Promoção / desconto",
    descricao: "Condição comercial com prazo e chamada forte.",
    sugestao: {
      texto: "Condição especial por tempo limitado",
      especificacoes:
        "Destacar o desconto ou condição, o prazo de validade e o serviço/produto. Sem poluir com muito texto.",
      tom: TONS[1].value,
      cta: "Fale com nosso time",
      estilo: ESTILO_PADRAO,
      marca: "Logo LECSOR, site e WhatsApp comercial no rodapé.",
    },
  },
  {
    key: "lancamento",
    label: "Lançamento de serviço",
    descricao: "Apresenta um serviço novo com o diferencial técnico.",
    sugestao: {
      texto: "Novo serviço LECSOR",
      especificacoes:
        "Mostrar o serviço em operação real, citar o diferencial técnico e o segmento atendido (naval, offshore, industrial).",
      tom: TONS[0].value,
      cta: "Saiba mais",
      estilo: ESTILO_PADRAO,
      marca: "Logo LECSOR e site.",
    },
  },
  {
    key: "case",
    label: "Caso de sucesso",
    descricao: "Resultado entregue em um atendimento real.",
    sugestao: {
      especificacoes:
        "Contar o resultado em números (prazo, disponibilidade, economia). Não citar nome do cliente sem autorização.",
      tom: TONS[0].value,
      cta: "Conheça nossos resultados",
      estilo: ESTILOS[3].value,
      marca: "Logo LECSOR discreta no canto.",
    },
  },
  {
    key: "vaga",
    label: "Vaga / RH",
    descricao: "Divulgação de vaga ou employer branding.",
    sugestao: {
      texto: "Estamos contratando",
      especificacoes: "Cargo, local, requisitos principais e como se candidatar.",
      tom: TONS[3].value,
      cta: "Envie seu currículo",
      estilo: ESTILOS[3].value,
      marca: "Logo LECSOR e e-mail de RH.",
    },
  },
  {
    key: "aviso",
    label: "Aviso operacional",
    descricao: "Comunicado interno ou operacional, direto ao ponto.",
    sugestao: {
      especificacoes: "Mensagem curta, legível de longe, sem excesso de elementos gráficos.",
      tom: TONS[2].value,
      cta: "",
      estilo: ESTILOS[4].value,
      marca: "Logo LECSOR no topo.",
    },
  },
  {
    key: "institucional",
    label: "Institucional",
    descricao: "Presença de marca, valores e capacidade técnica.",
    sugestao: {
      especificacoes: "Transmitir confiabilidade e capacidade técnica; imagem principal com equipe ou equipamento real.",
      tom: TONS[0].value,
      cta: "lecsorinnovation.com.br",
      estilo: ESTILO_PADRAO,
      marca: "Logo LECSOR e site.",
    },
  },
  {
    key: "evento",
    label: "Evento / feira",
    descricao: "Convite para feira, evento ou treinamento.",
    sugestao: {
      texto: "Nos encontre no evento",
      especificacoes: "Nome do evento, data, local e número do estande.",
      tom: TONS[1].value,
      cta: "Agende uma conversa no evento",
      estilo: ESTILO_PADRAO,
      marca: "Logo LECSOR e logo do evento, se houver.",
    },
  },
];

export function emptySpec(): DesignSpec {
  return {
    template: "livre",
    tema: "",
    texto: "",
    especificacoes: "",
    formato: FORMATOS[0].value,
    tom: TONS[0].value,
    cta: "",
    estilo: ESTILO_PADRAO,
    marca: "",
    referencias: [],
  };
}

/**
 * Monta o pedido final que vai para a Marina.
 *
 * Regra da casa: TODO o texto da peça (título, subtítulo, CTA, logotipo) entra
 * neste pedido, porque o design é gerado de uma vez no Canva — a edição só
 * altera texto que já existe, nunca insere texto novo.
 */
export function buildDesignPrompt(spec: DesignSpec): string {
  const modelo = TEMPLATES.find((t) => t.key === spec.template);
  const estilo = spec.estilo?.trim() || ESTILO_PADRAO;
  const linhas = [
    "Use generate_design do Canva com este briefing completo:",
    `Tamanho: ${spec.formato}`,
    `Assunto: ${spec.tema.trim()}`,
    modelo && modelo.key !== "livre" ? `Tipo de peça: ${modelo.label} — ${modelo.descricao}` : "",
    spec.texto.trim() ? `Título: ${spec.texto.trim()}` : "Título: nenhum texto informado",
    spec.especificacoes.trim() ? `Subtítulo/especificações: ${spec.especificacoes.trim()}` : "",
    spec.cta.trim() ? `CTA: ${spec.cta.trim()}` : "",
    "Logotipo: LECSOR TECHNOLOGY",
    spec.marca.trim() ? `Elementos de marca: ${spec.marca.trim()}` : "Fundo e cores: brand kit da LECSOR",
    spec.tom.trim() ? `Tom de voz: ${spec.tom.trim()}` : "",
    `Estilo: ${estilo}`,
    spec.referencias.length
      ? `Referências: use as ${spec.referencias.length} foto(s) anexadas como referência OBRIGATÓRIA do equipamento real — mantenha modelo, cor, marca e proporções, sem inventar nem deformar detalhes.`
      : "Referências: nenhuma foto anexada; se o equipamento precisar ser fiel ao original, me avise antes de finalizar.",
    "Gere o design já com todos esses textos aplicados, sem placeholder e sem inventar frases.",
    "Retorne os links no formato DESIGNCANVA: <url>",
  ];
  return linhas.filter(Boolean).join("\n");
}

/** Pedido de ajuste, aproveitando as mesmas especificações. */
export function buildAdjustPrompt(link: string, instrucao: string, spec: Partial<DesignSpec>): string {
  const estilo = spec.estilo?.trim() || ESTILO_PADRAO;
  return [
    `Ajuste o design do Canva ${link}: ${instrucao}.`,
    "Altere apenas elementos que já existem na peça. Se o ajuste pedir texto novo, gere outra versão já com esse texto em vez de editar.",
    spec.especificacoes?.trim() ? `Especificações a respeitar: ${spec.especificacoes.trim()}` : "",
    `Estilo: ${estilo}`,
    spec.referencias?.length
      ? "Mantenha o equipamento fiel às fotos de referência: mesmo modelo, cor, marca e proporções."
      : "Preserve a identidade e os detalhes do equipamento já presente na peça.",
    "Retorne o link no formato DESIGNCANVA: <url>",
  ]
    .filter(Boolean)
    .join("\n");
}

