

## Correcao: "Card is not defined" em Opportunities.tsx

### Problema
O arquivo `src/pages/commercial/Opportunities.tsx` usa `Card` e `CardContent` nos KPI cards mas nao possui o import desses componentes.

### Solucao
Adicionar o import no topo do arquivo:

```
import { Card, CardContent } from "@/components/ui/card";
```

### Arquivo a modificar
- `src/pages/commercial/Opportunities.tsx` -- adicionar import de Card e CardContent

