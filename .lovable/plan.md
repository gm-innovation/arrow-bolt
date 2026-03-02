

## Feed Corporativo Inspirado no LinkedIn — Layout 3 Colunas

Transformar o feed atual em um layout de 3 colunas inspirado no LinkedIn, com perfil do usuário à esquerda, timeline central e sidebar de sugestões/informações à direita.

### Estrutura Visual

```text
┌──────────────┬────────────────────────┬──────────────┐
│  PERFIL      │   TIMELINE CENTRAL     │  SIDEBAR     │
│  (280px)     │   (max ~600px)         │  (280px)     │
│              │                        │              │
│  Avatar      │  [Criar Post]          │ Aniversari-  │
│  Nome        │  ─────────────         │ antes do mês │
│  Função      │  Post 1                │              │
│  Tempo emp.  │  Post 2                │ Grupos       │
│  Idade       │  ...                   │ populares    │
│  Grupos      │                        │              │
│              │                        │ Novos        │
│  Estatísticas│                        │ colabora-    │
│  - Posts     │                        │ dores        │
│  - Likes     │                        │              │
└──────────────┴────────────────────────┴──────────────┘
  (hidden mobile)                        (hidden mobile)
```

### Alterações

**1. `src/components/corp/FeedProfileSidebar.tsx` (Novo)**
- Card com avatar grande, nome, função (badge), tempo de empresa, idade
- Seção de grupos do usuário
- Estatísticas simples (posts publicados, curtidas recebidas)
- Responsivo: no mobile vira um card compacto horizontal no topo

**2. `src/components/corp/FeedRightSidebar.tsx` (Novo)**
- Card "Aniversariantes do Mês" — busca `birth_date` dos profiles da mesma empresa, filtra mês atual
- Card "Novos Colaboradores" — busca `hire_date` dos últimos 30 dias
- Card "Grupos Populares" — lista top grupos com mais membros
- Hidden no mobile

**3. `src/pages/corp/Feed.tsx` — Refatorar layout**
- Alterar de coluna única para grid de 3 colunas (`grid-cols-[280px_1fr_280px]`)
- Buscar `hire_date`, `birth_date`, role do usuário logado
- Coluna esquerda: `FeedProfileSidebar`
- Coluna central: `FeedCreatePost` + lista de posts (como está)
- Coluna direita: `FeedRightSidebar`
- No mobile: layout empilhado, sidebar de perfil compacta no topo, sidebar direita oculta

**4. `src/components/corp/FeedCreatePost.tsx` — Melhorar estilo**
- Adicionar badge da função do usuário ao lado do avatar
- Placeholder mais convidativo estilo LinkedIn: "Compartilhe uma ideia, artigo ou atualização..."
- Botões de mídia sempre visíveis (Foto, Vídeo, Documento) como no LinkedIn, mesmo antes de expandir

**5. `src/components/corp/FeedPostCard.tsx` — Ajustes visuais**
- Separador visual mais claro entre ações (curtir, comentar)
- Contagem de curtidas e comentários no estilo LinkedIn ("X curtidas • Y comentários")

