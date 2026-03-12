

## Configuração de XP e Badges pelo RH

Atualmente os valores de XP (15 para curso, 50 para trilha) e ícones/emojis são hardcoded em `useUniversityCompletion.ts`. O RH precisa poder configurar isso.

### Alterações

**1. Nova tabela `university_reward_settings`** (migração):
```sql
CREATE TABLE university_reward_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  reward_type text NOT NULL, -- 'course_completed' | 'trail_completed'
  xp_value integer NOT NULL DEFAULT 15,
  icon text NOT NULL DEFAULT '📚',
  badge_title_template text NOT NULL DEFAULT 'Curso: {name}',
  post_to_feed boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (company_id, reward_type)
);
ALTER TABLE university_reward_settings ENABLE ROW LEVEL SECURITY;
-- RLS: HR/Director can manage, authenticated can read own company
CREATE POLICY "Users can view own company settings" ON university_reward_settings
  FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "HR/Director can manage settings" ON university_reward_settings
  FOR ALL TO authenticated
  USING (is_hr_or_director_in_company(auth.uid(), company_id))
  WITH CHECK (is_hr_or_director_in_company(auth.uid(), company_id));

-- Seed default rows per company (optional, handled in code with upsert)
```

**2. `src/components/university/HRUniversityAchievements.tsx`** — Adicionar seção "Configurações de Recompensas" no topo da aba Conquistas:
- Card com duas linhas: Conclusão de Curso e Conclusão de Trilha
- Cada linha com: ícone (input emoji), XP (input number), template do título, toggle "publicar no feed"
- Botão salvar que faz upsert na tabela `university_reward_settings`
- Query para carregar as configurações existentes

**3. `src/hooks/useUniversityCompletion.ts`** — Em vez de valores hardcoded:
- Buscar configurações da tabela `university_reward_settings` para a empresa do usuário
- Usar valores configurados (XP, ícone, template de título, post_to_feed)
- Fallback para valores padrão caso não haja configuração

### Arquivos alterados
- Migração: criar tabela `university_reward_settings` com RLS
- `src/components/university/HRUniversityAchievements.tsx` — seção de configuração
- `src/hooks/useUniversityCompletion.ts` — ler configurações do banco

