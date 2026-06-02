# Redesign Carreiras — direção "Editorial premium"

Refinar somente as seções **Benefícios** e **Vagas abertas** da página pública `/carreiras/:slug`. Hero navy, bloco "Sobre/Cultura", CTA "Banco de Talentos" e footer permanecem como estão. Paleta e tipografia travadas (navy `#0f1b3d / #1e3a5f / #3b6fa0`, paper `#e8edf3`, Space Grotesk + DM Sans).

## Mudanças visuais

**Benefícios**
- Eyebrow "BENEFÍCIOS" como pill com borda fina azul (em vez de bloco sólido).
- Título maior: `text-4xl md:text-5xl`, tracking-tight, leading apertado.
- Cards: `rounded-2xl`, borda fina (`navy/8%`), **sombra base sutil** `0 4px 12px rgba(15,27,61,0.05)` para dar profundidade desde já.
- **No hover**: sobe `translateY(-4px)`, sombra cresce para `0 24px 48px rgba(15,27,61,0.10)`, borda navy translúcida, transição 300ms.
- Ícone em quadrado `rounded-xl` 12×12 com fundo paper e ícone navy.

**Vagas abertas**
- Cabeçalho com título maior `text-4xl md:text-5xl`.
- Filtros como pills `rounded-full` (ativo: fundo navy + texto branco; inativo: branco com borda fina).
- Cards de vaga viram **linhas horizontais** em vez de grid 3-col:
  - Borda esquerda 4px navy-400, demais bordas finas, `rounded-r-2xl`.
  - **Sombra base** `0 2px 8px rgba(15,27,61,0.04)`.
  - Linha 1: tag de área (pill) + código discreto.
  - Linha 2: título `text-2xl` Space Grotesk + meta (ícone localização / tipo).
  - Botão "Candidatar-se" `rounded-xl` navy à direita, com lift no hover.
- **No hover**: card sobe `translateY(-2px)`, sombra cresce para `0 16px 32px rgba(15,27,61,0.08)`, borda esquerda intensifica para `NAVY_700`.

## Detalhes técnicos

- Arquivo único: `src/pages/careers/PublicCareers.tsx`, linhas ~607–783 (blocos `{/* Benefícios */}` e `{/* Jobs */}` até o final do grid de vagas — não tocar no CTA "Banco de Talentos" abaixo).
- Manter constantes `NAVY_900/700/400`, `PAPER`, `fontFamilyHead/Body` já existentes.
- Substituir o grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` das vagas por `space-y-4` (lista vertical de cards horizontais).
- Aplicar `transition: all 300ms ease` nos cards; usar handlers `onMouseEnter/Leave` inline (padrão já usado no arquivo) para sombras + transform.
- Manter toda a lógica: `setSelected(o)`, filtro `areaFilter`, `visibleOpenings`, fallback "Nenhuma vaga na área selecionada", ícones `MapPin`/`Briefcase`, código `o.id.slice(0,4)`.
- Nenhuma mudança em backend, edge functions, schema ou no editor admin (`CareersPageEditor.tsx`).
