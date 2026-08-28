# Canva obrigatório e layout totalmente editável

## Decisão

Toda peça solicitada na área Design deverá existir no Canva com **layout completo em camadas editáveis** antes de ser considerada pronta ou poder ser aprovada.

A imagem achatada gerada no Arrow deixa de ser a peça final. Ela poderá ser usada apenas como **fotografia/base visual**, em uma camada substituível. Textos, logo, CTA, faixas, formas e demais elementos serão montados separadamente no Canva.

```text
pedido + assets + textos autorizados
        ↓
direção de arte e fotografia-base sem texto/logo
        ↓
Canva monta a peça em camadas editáveis
        ↓
Canva exporta PNG de conferência
        ↓
palco mostra esse mesmo PNG
        ↓
aprovação habilitada somente com canva_url válido
```

## Regras obrigatórias

- Nenhum pedido de design será concluído com apenas a imagem do palco.
- `canva_url` válido é requisito para o estado “pronto para aprovação”.
- O botão de aprovação ficará bloqueado enquanto a versão editável não existir.
- A Marina não dirá que a peça está pronta antes de criar e validar o design no Canva.
- Se o Canva falhar, a peça ficará como **“Canva pendente”**, com ação **“Tentar criar no Canva novamente”**; não poderá ser aprovada.
- O preview do palco será uma exportação do próprio design Canva, eliminando a diferença entre palco e Canva.
- Ajustes serão aplicados ao design Canva existente; se for tecnicamente necessário recriá-lo, a nova URL substituirá a anterior no mesmo registro/versão.
- A Marina nunca publicará automaticamente; a aprovação humana permanece obrigatória.

## Composição editável

O fluxo enviará ao Canva um pacote de produção estruturado:

- fotografia-base sem textos, logo ou elementos gráficos incorporados;
- fotos reais de equipamentos como assets separados e substituíveis;
- logo oficial como elemento separado;
- cada título, subtítulo, CTA e informação autorizada como caixa de texto separada;
- faixas, máscaras, fundos e formas como elementos independentes;
- formato e posições definidos pelo briefing do diretor de arte;
- proibição de templates genéricos, placeholders e qualquer texto inventado.

A fotografia continua sendo um asset raster, mas será uma camada independente que pode ser movida, recortada, redimensionada ou substituída. Todo o restante do layout será reconstruído como elementos nativos editáveis do Canva.

## Mudanças no fluxo

1. **Preparar assets**
   - Gerar somente a fotografia-base, sem tipografia ou logo incorporados.
   - Reunir referências selecionadas, logo oficial e textos literais autorizados.
   - Montar uma especificação determinística de camadas, posições e hierarquia.

2. **Criar no Canva**
   - Trocar a instrução atual, que manda usar a imagem pronta como fundo, por uma instrução de montagem em camadas.
   - Exigir que o motor use as ferramentas Canva e devolva `DESIGNCANVA`.
   - Validar a URL retornada e solicitar imediatamente uma exportação PNG para conferência.
   - Aplicar retentativas controladas para indisponibilidade temporária, sem gerar uma segunda peça paralela.

3. **Persistir uma única peça**
   - `canva_url` identifica o arquivo-mestre editável.
   - `storage_path` guarda a exportação de conferência desse arquivo-mestre, usada no palco.
   - A fotografia-base temporária não será apresentada nem aprovada como peça final.
   - Falhas preservarão o pedido e os assets para a ação de retentativa.

4. **Bloquear estados inválidos**
   - No backend, recusar aprovação quando não houver `canva_url`.
   - Recusar aprovação se a exportação de conferência ainda não estiver disponível.
   - Não marcar como aprovado quando a exportação/armazenamento falhar.
   - Remover o atalho atual que aprova diretamente uma arte com `source = marina`.

5. **Atualizar o palco**
   - Mostrar estados claros: “Preparando assets”, “Montando no Canva”, “Exportando preview”, “Pronto para aprovação” e “Canva pendente”.
   - Exibir o PNG exportado do Canva como preview.
   - Manter “Abrir no Canva” sempre visível quando pronto.
   - Disponibilizar “Tentar criar no Canva novamente” nas falhas.
   - Renomear a ação para **“Aprovar peça”**; aprovação não significa publicação automática.

6. **Ajustes e versões**
   - Ao solicitar ajuste, enviar a nota junto do identificador do design Canva existente.
   - Atualizar as camadas do mesmo design e gerar nova exportação para o palco.
   - Manter histórico das versões sem misturar previews locais com arquivos Canva.

## Validação

- Criar uma peça com fotografia, logo, título e CTA e confirmar no Canva que cada item é selecionável separadamente.
- Confirmar visualmente que o preview do palco é igual à exportação do Canva.
- Simular falha do Canva e verificar que aprovação fica bloqueada e a retentativa preserva o pedido.
- Solicitar ajuste e confirmar que o arquivo Canva existente é atualizado e o palco recebe a nova exportação.
- Testar desktop e celular, além dos estados de carregamento, falha e aprovação.

## Observação técnica

A integração atual envia um PNG final achatado ao Canva e permite aprovação sem `canva_url`; isso não atende ao requisito de layout completo. A implementação substituirá esse caminho por composição nativa em camadas e tornará o Canva uma dependência obrigatória do fluxo de design.
