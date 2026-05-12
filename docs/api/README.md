# Arrow API — Guia de integração

Bem-vindo. Este guia explica como o **site institucional** (ou qualquer sistema externo) envia dados ao CRM e ao módulo de Marketing do Arrow.

## 1. Autenticação

Todas as chamadas usam uma **API key** no header:

```
Authorization: Bearer ark_live_<sua-chave>
```

Para obter uma chave:

1. Entre no Arrow como **Super Admin**.
2. Menu lateral → **API & Integrações** → aba **Integrações** → **Nova integração**.
3. Escolha os escopos necessários (recomendado para um site institucional: `leads:write`, `opportunities:write`, `catalog:read`).
4. Copie a chave gerada — ela é mostrada **uma única vez**.

## 2. Base URL

```
https://iyuypkfksxfsutubcpay.supabase.co/functions/v1/public-api
```

## 3. Endpoints principais

### Criar solicitação de proposta (RFQ)

`POST /v1/leads/rfq`

```bash
curl -X POST https://iyuypkfksxfsutubcpay.supabase.co/functions/v1/public-api/v1/leads/rfq \
  -H "Authorization: Bearer ark_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "company": { "name": "Marítima Atlântico", "cnpj": "12.345.678/0001-90" },
    "contact": { "name": "João Souza", "email": "joao@maritima.com.br" },
    "request": {
      "type": "quote",
      "title": "Manutenção anual",
      "message": "Preciso de proposta para 3 embarcações.",
      "products": [{ "id": "uuid-do-produto", "quantity": 3 }]
    },
    "source": "site-institucional"
  }'
```

Resposta `201`:

```json
{
  "data": {
    "lead_id": "uuid",
    "client_id": "uuid",
    "buyer_id": "uuid",
    "stage": "identified",
    "created_at": "2026-05-12T13:00:00Z"
  },
  "request_id": "uuid"
}
```

### Captura simples de contato

`POST /v1/leads/contact` — para newsletter ou "fale conosco".

### Consultar lead

`GET /v1/leads/{id}` — retorna estágio atual.

### Catálogo

- `GET /v1/catalog/products?page=1&page_size=50&category=...`
- `GET /v1/catalog/products/{id}`
- `GET /v1/catalog/services` — apenas serviços recorrentes.

## 4. Idempotência

Envie `Idempotency-Key: <uuid>` em chamadas `POST`. Repetir a mesma chave dentro de 24h retorna a resposta original (com `idempotent_replay: true`) — útil para retries do site sem criar leads duplicados.

## 5. Rate limit

**120 requisições por minuto** por API key. Excedeu? Resposta `429`.

## 6. Erros

Formato padrão:

```json
{
  "error": { "code": "invalid_body", "message": "...", "details": { } },
  "request_id": "uuid"
}
```

| HTTP | code                     | Significado                          |
|------|--------------------------|--------------------------------------|
| 400  | `invalid_body`           | Corpo não passou na validação.       |
| 401  | `invalid_api_key`        | Chave ausente, inválida ou revogada. |
| 403  | `scope_required`         | A chave não tem o escopo necessário. |
| 404  | `not_found`              | Rota ou recurso inexistente.         |
| 429  | `rate_limited`           | 120 req/min excedido.                |
| 500  | `internal_error`         | Erro inesperado — registre o `request_id`. |

## 7. Versionamento

- `/v1` é estável. Mudanças que quebrem compatibilidade vão para `/v2` com pelo menos 6 meses de overlap.
- Adições compatíveis (novos campos opcionais, novos endpoints) podem ser feitas em `/v1`.

## 8. Limites

- Body máximo: 1 MB.
- `name`, `title`: 255 chars.
- `message`, `description`: 5000 chars.

## 9. Especificação OpenAPI

Spec navegável e "Try it out" estão em **/super-admin/api-docs** dentro do Arrow.
Spec bruto: `https://arrow.googlemarineinnovation.com.br/api/openapi.yaml`.

## 10. Suporte

Em caso de erros recorrentes, envie o `request_id` da resposta para o suporte — ele é a chave de busca no log interno.
