# Arquitetura multiempresa e integração do motor de risco — INOVAAPPS 2026

> Documento de desenho técnico e de produto. Não representa uma implementação concluída.
>
> Data: 19/09/2026
> Escopo: plataforma SaaS multiempresa, motor genérico de risco, experiência da empresa cliente e painel operacional da Globalsys.

## 1. Objetivo

O INOVAAPPS 2026 deve atender dois perfis de empresa dentro da mesma plataforma:

- **Empresas de tecnologia**, que enviam eventos de uso, dados de suporte, relacionamento, contrato e receita.
- **Empresas gerais**, que enviam planilhas CSV ou Excel com os dados que consideram relevantes para acompanhar seus clientes.

Nos dois casos, a plataforma deve produzir um **índice explicável de risco**, de 0 a 100, mostrar a cobertura dos dados utilizados e detalhar quais indicadores mais contribuíram para o resultado.

O motor existente em `AlgoritmoGenericoRisco - Copia.zip` já cobre a parte essencial do cálculo por planilha. Ele não é um modelo de machine learning e não calcula probabilidade de cancelamento, data prevista de saída ou causalidade. Portanto, a interface deve chamar o resultado de **índice de risco**, nunca de “probabilidade de churn”.

## 2. Decisões principais

### 2.1 Arquitetura recomendada para o hackathon

```text
Navegador
   │
   ├── React/Vite na Vercel
   │       │
   │       ├── Supabase Auth
   │       ├── Supabase Postgres + RLS
   │       └── Supabase Storage privado
   │
   └── acompanha o status da análise por polling ou Realtime
                         │
                         ▼
               Tabela analysis_jobs
                         │
                         ▼
              1 worker Python em container
                         │
                         ├── baixa o arquivo por URL assinada
                         ├── executa o motor existente
                         └── persiste resultados normalizados
```

Decisões:

1. **Vercel hospeda somente o frontend.** O processamento com pandas e openpyxl não deve depender de uma função serverless curta, pois arquivos maiores podem exceder tempo e memória disponíveis.
2. **Supabase é o plano de controle e dados:** autenticação, organizações, permissões, configurações, arquivos privados, trabalhos e resultados.
3. **Um único worker Python é suficiente para o hackathon.** Ele pode rodar em Render, Railway, Fly.io ou Cloud Run. A recomendação inicial é Render ou Railway por simplicidade operacional.
4. **A fila inicial será uma tabela Postgres.** O worker consulta trabalhos pendentes e os reivindica de forma atômica. Não é necessário introduzir Redis, Kafka ou RabbitMQ nesta fase.
5. **O núcleo matemático existente deve ser reutilizado**, sem reescrever o cálculo no frontend ou no banco.
6. **Resultados publicados são imutáveis.** Reprocessar cria uma nova execução; nunca sobrescreve a anterior.

### 2.2 Fonte única para as faixas de risco

As faixas do motor existente devem prevalecer em toda a aplicação:

| Chave | Rótulo | Intervalo |
|---|---|---:|
| `LOW` | Baixo | 0 a 29 |
| `ATTENTION` | Atenção | 30 a 59 |
| `HIGH` | Alto | 60 a 79 |
| `CRITICAL` | Crítico | 80 a 100 |

O frontend atual usa três faixas e outros limites. Essa divergência deverá ser removida quando a integração for implementada.

### 2.3 Cobertura como proteção contra conclusões frágeis

O motor informa a cobertura com base no peso disponível em relação ao peso configurado. A aplicação deve tratar a cobertura como parte inseparável do score.

Política recomendada da aplicação — não é uma regra já existente no motor:

| Cobertura | Estado na interface | Comportamento recomendado |
|---|---|---|
| 70% a 100% | Adequada | Exibir e priorizar normalmente |
| 40% a 69,99% | Parcial | Exibir aviso junto ao score |
| Abaixo de 40% | Insuficiente | Não usar em ranking automático nem em totais financeiros de risco |

Um score 85 com cobertura de 25% não deve aparecer como uma certeza. A interface deve dizer “dados insuficientes” e explicar quais indicadores faltaram.

## 3. O que o motor atual realmente faz

### 3.1 Capacidades confirmadas

- Aceita arquivos CSV e XLSX.
- Limita upload a 50 MB na implementação atual.
- Perfila planilhas e colunas.
- Permite escolher a entidade principal e relacionar abas.
- Agrega múltiplas linhas para uma linha por entidade antes da junção entre abas.
- Suporta regras:
  - valor alto representa risco;
  - valor baixo representa risco;
  - risco binário;
  - risco categórico;
  - faixa-alvo;
  - tendência de risco;
  - campo informativo.
- Suporta agregações `FIRST`, `LATEST`, `MEAN`, `RECENT_MEAN`, `SUM`, `MIN` e `MAX`.
- Normaliza pesos e calcula score de 0 a 100.
- Calcula cobertura.
- Retorna contribuição por indicador, valor agregado, origem, regra, peso e tratamento de ausência.
- Produz ranking, detalhes, metodologia e metadados dos indicadores.
- Exporta XLSX, CSV e relatório HTML.

### 3.2 O que ele não faz

- Não treina modelo preditivo.
- Não estima probabilidade estatística de cancelamento.
- Não prevê uma data de cancelamento.
- Não infere causalidade.
- Não processa eventos em streaming diretamente.
- Não persiste contas, organizações, permissões ou resultados em banco.
- Não sincroniza respostas entre dispositivos.
- Não reconhece automaticamente colunas renomeadas com segurança.
- Não resolve sozinho a hierarquia empresa → produto → funcionalidade.

Esses limites devem aparecer no produto e na apresentação para preservar a confiança na solução.

## 4. Atores e controle de acesso

### 4.1 Escopos

Existem dois escopos independentes:

- **Tenant da empresa cliente:** pessoas da empresa veem somente os dados da própria organização.
- **Operação Globalsys:** pessoas autorizadas operam a plataforma e veem, por padrão, apenas dados técnicos e agregados.

### 4.2 Tipos de usuário da empresa cliente

| Papel | Pode fazer |
|---|---|
| **Administrador** | Gerenciar membros, fontes, integrações, configurações, versões e análises |
| **Gestor** | Ver toda a carteira, criar ações, delegar casos, editar e publicar configurações com justificativa |
| **Customer Success** | Ver clientes, scores, explicações e ações atribuídas; atualizar atendimento |
| **Integrador** | Configurar fontes, credenciais e mapeamentos; não altera pesos de negócio |
| **Analista** | Explorar dados e preparar rascunhos de configuração; publicação exige Gestor ou Administrador |

Para o hackathon, Administrador e Gestor podem publicar configurações. Em uma versão comercial, a empresa poderá restringir a publicação somente ao Administrador.

### 4.3 Acesso à aba Conexões

Na empresa tecnológica:

- Administrador: acesso completo.
- Integrador: acesso completo às conexões e ao mapeamento técnico.
- Gestor: visualização do estado e autorização de alterações.
- Analista: leitura de metadados e qualidade.
- Customer Success: somente status resumido, sem segredos ou credenciais.

Credenciais nunca devem retornar ao navegador depois de cadastradas. O banco deve guardar apenas segredo cifrado ou referência a um cofre de segredos. Para o hackathon, integrações reais podem ser limitadas a uma única fonte demonstrativa.

### 4.4 Operadores Globalsys

O papel `platform_admin` não pertence a uma organização cliente. Ele acessa o painel operacional da plataforma, mas não deve receber acesso irrestrito às linhas das planilhas ou aos eventos individuais.

Uma futura função de suporte com acesso aos dados de um tenant deve exigir:

- autorização explícita da empresa;
- prazo de expiração;
- justificativa;
- auditoria de todas as consultas.

Isso deve ficar para depois do hackathon.

## 5. Modelo de dados

Todas as tabelas de tenant devem possuir `organization_id`, índice por organização e políticas RLS. Identificadores são UUID, salvo quando indicado.

### 5.1 Identidade e tenancy

#### `organizations`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK | Tenant |
| `name` | text | Nome da empresa |
| `profile` | enum | `technology` ou `general` |
| `segment` | text nullable | Segmento declarado |
| `status` | enum | `active`, `suspended`, `closed` |
| `settings` | jsonb | Preferências não sensíveis |
| `created_at` | timestamptz | Auditoria |

#### `organization_members`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK | Organização |
| `user_id` | uuid FK para `auth.users` | Usuário Supabase |
| `role` | enum | `admin`, `manager`, `cs`, `integrator`, `analyst` |
| `status` | enum | `invited`, `active`, `disabled` |
| `created_at` | timestamptz |  |

Restrição única: `(organization_id, user_id)`.

### 5.2 Carteira da empresa

#### `customers`

Representa a entidade acompanhada pela organização usuária da plataforma.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK | Identificador interno |
| `organization_id` | uuid FK | Tenant proprietário |
| `external_id` | text | Chave na origem do cliente |
| `display_name` | text | Nome exibido |
| `status` | enum | `active`, `attention`, `cancelled` |
| `context` | jsonb | Segmento, região e campos configurados |
| `business_values` | jsonb | Receita e outros valores configurados |
| `source_last_seen_at` | timestamptz nullable | Última presença na fonte |
| `created_at`, `updated_at` | timestamptz |  |

Restrição única: `(organization_id, external_id)`.

#### `products`

Catálogo de produtos ou serviços vendidos pela organização.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `name` | text | Produto ou serviço |
| `kind` | text nullable | Família ou tipo |
| `active` | boolean |  |

#### `customer_products`

Contrato de um produto com um cliente. Evita duplicar a empresa quando ela possui vários produtos.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK | Unidade de análise tecnológica recomendada |
| `organization_id` | uuid FK |  |
| `customer_id` | uuid FK |  |
| `product_id` | uuid FK |  |
| `external_id` | text nullable | Chave na origem |
| `plan` | text nullable |  |
| `monthly_revenue` | numeric nullable | Receita recorrente |
| `strategic_criticality` | smallint nullable | 1 a 5 |
| `active_users` | integer nullable |  |
| `contract_started_at`, `renews_at`, `cancelled_at` | date nullable |  |
| `status` | enum | `active`, `attention`, `cancelled` |

Uma empresa geral pode analisar diretamente `customers`. Uma empresa tecnológica pode analisar `customer_products`, deixando a empresa como contexto consolidado.

### 5.3 Fontes, arquivos e importações

#### `data_sources`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `type` | enum | `spreadsheet`, `tracking`, `crm`, `support`, `financial` |
| `name` | text | Nome apresentado |
| `status` | enum | `draft`, `active`, `error`, `disabled` |
| `config` | jsonb | Mapeamento não secreto |
| `secret_ref` | text nullable | Referência ao segredo, nunca o segredo aberto |
| `created_by` | uuid |  |

#### `imports`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `data_source_id` | uuid FK |  |
| `storage_path` | text | Caminho privado no Storage |
| `original_filename` | text | Somente nome, sem caminho local |
| `mime_type` | text |  |
| `size_bytes` | bigint | Limite inicial: 50 MB |
| `sha256` | text | Idempotência e duplicidade |
| `status` | enum | `uploaded`, `profiling`, `ready`, `processing`, `completed`, `failed` |
| `schema_profile` | jsonb nullable | Abas, colunas, tipos e amostras seguras |
| `row_count` | bigint nullable |  |
| `error_code`, `error_message` | text nullable | Erro sanitizado |
| `created_by`, `created_at` | uuid/timestamptz |  |

O bucket deve ser privado e usar o caminho:

```text
{organization_id}/{import_id}/{arquivo}
```

### 5.4 Templates e versões

#### `analysis_templates`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid nullable | Nulo somente para template global controlado pela plataforma |
| `name` | text |  |
| `segment` | text nullable | Segmento sugerido |
| `status` | enum | `active`, `archived` |
| `created_by` | uuid |  |

#### `analysis_template_versions`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `template_id` | uuid FK |  |
| `version` | integer | Sequencial por template |
| `status` | enum | `draft`, `published`, `archived` |
| `config` | jsonb | Configuração completa aceita pelo motor |
| `schema_signature` | jsonb | Abas, colunas e tipos esperados |
| `change_reason` | text | Obrigatório ao publicar nova versão |
| `created_by` | uuid |  |
| `created_at`, `published_at` | timestamptz |  |

Uma versão publicada é imutável. Uma alteração cria a versão seguinte.

#### `template_compatibility_checks`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `import_id` | uuid FK |  |
| `template_version_id` | uuid FK |  |
| `status` | enum | `compatible`, `warning`, `incompatible` |
| `missing_fields` | jsonb | Colunas esperadas ausentes |
| `new_fields` | jsonb | Colunas novas |
| `type_mismatches` | jsonb | Tipos incompatíveis |
| `suggested_mappings` | jsonb | Sugestões ainda não confirmadas |
| `confirmed_by` | uuid nullable |  |

### 5.5 Execução e resultados

#### `analysis_jobs`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `import_id` | uuid FK |  |
| `analysis_run_id` | uuid FK |  |
| `status` | enum | `pending`, `processing`, `succeeded`, `failed` |
| `attempts` | integer | Máximo inicial recomendado: 3 |
| `available_at` | timestamptz | Retry simples |
| `locked_at`, `locked_by` | timestamptz/text nullable | Reivindicação atômica |
| `last_error` | text nullable | Sanitizado |
| `created_at`, `updated_at` | timestamptz |  |

O worker deve reivindicar o próximo trabalho em uma função SQL transacional equivalente a `FOR UPDATE SKIP LOCKED`.

#### `analysis_runs`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `import_id` | uuid FK |  |
| `template_version_id` | uuid FK | Versão exata usada |
| `subject_type` | enum | `customer` ou `customer_product` |
| `engine_version` | text | Versão do motor implantado |
| `status` | enum | `queued`, `processing`, `completed`, `failed` |
| `summary` | jsonb | Contagens agregadas |
| `started_at`, `completed_at` | timestamptz nullable |  |
| `error_code`, `error_message` | text nullable |  |

Restrição de idempotência recomendada: uma chave única derivada de `(organization_id, import.sha256, template_version_id, engine_version)`.

#### `analysis_results`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `analysis_run_id` | uuid FK |  |
| `customer_id` | uuid FK nullable |  |
| `customer_product_id` | uuid FK nullable |  |
| `canonical_entity_id` | text | Chave devolvida pelo motor |
| `score` | numeric(5,2) | Índice, não probabilidade |
| `band` | enum | Quatro faixas universais |
| `coverage` | numeric(5,2) | 0 a 100 |
| `rank` | integer nullable | Nulo quando cobertura insuficiente |
| `context` | jsonb | Campos de contexto daquela execução |
| `business_values` | jsonb | Receita e valores daquela execução |
| `top_factors` | jsonb | Resumo para leitura rápida |

Deve existir exatamente um dos campos `customer_id` ou `customer_product_id`, conforme `subject_type`.

#### `analysis_metric_results`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `analysis_result_id` | uuid FK |  |
| `metric_key`, `metric_label` | text | Identidade do indicador |
| `source_sheet`, `source_column` | text | Linhagem |
| `aggregated_value` | jsonb | Preserva número, texto, booleano ou nulo |
| `rule` | text | Regra aplicada |
| `risk_01` | numeric | Contribuição normalizada de 0 a 1 |
| `raw_weight` | numeric | Peso configurado |
| `normalized_weight` | numeric | Peso após ausência/reponderação |
| `contribution_points` | numeric | Pontos no índice final |
| `missing_applied` | text nullable | Política de ausência aplicada |
| `scale_metadata` | jsonb nullable | Escala efetivamente usada |

### 5.6 Tracking tecnológico

#### `tracking_events`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid FK |  |
| `customer_product_id` | uuid FK |  |
| `event_name` | text | Evento catalogado |
| `occurred_at` | timestamptz |  |
| `properties` | jsonb | Dados mínimos e não sensíveis |
| `source_id` | uuid FK | Integração de origem |

O motor atual é batch. Portanto, os eventos precisam passar por um adaptador que gere indicadores agregados por janela, por exemplo:

```text
cliente_produto | logins_30d | pesagens_30d | variacao_pesagens_60d | erros_integracao_30d
```

O adaptador entrega uma tabela compatível ao mesmo motor. Ele não muda a fórmula e não cria previsão estatística.

### 5.7 Auditoria

#### `audit_logs`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid PK |  |
| `organization_id` | uuid nullable | Nulo para evento estritamente operacional da plataforma |
| `actor_user_id` | uuid nullable |  |
| `action` | text | Ex.: `template.publish` |
| `target_type`, `target_id` | text/uuid |  |
| `before`, `after` | jsonb nullable | Sem segredos |
| `reason` | text nullable | Obrigatório em mudanças críticas |
| `created_at` | timestamptz |  |

### 5.8 Relações principais

```text
organization
├── organization_members
├── data_sources
│   └── imports
├── customers
│   └── customer_products ── products
├── analysis_templates
│   └── analysis_template_versions
├── analysis_runs
│   ├── analysis_results
│   │   └── analysis_metric_results
│   └── analysis_jobs
└── audit_logs
```

## 6. RLS e segurança multiempresa

### 6.1 Regra-base

Uma pessoa só acessa uma linha se possuir vínculo ativo com o mesmo `organization_id`.

Exemplo conceitual de política:

```sql
exists (
  select 1
  from organization_members member
  where member.organization_id = target.organization_id
    and member.user_id = auth.uid()
    and member.status = 'active'
)
```

Escritas sensíveis adicionam a verificação do papel. A aplicação não deve confiar apenas em esconder botões.

### 6.2 Regras recomendadas

- O navegador nunca recebe a chave `service_role`.
- O worker é o único processo com permissão de serviço para consumir trabalhos e persistir resultados.
- O `organization_id` é derivado da sessão ou de uma função segura; não é aceito livremente do corpo enviado pelo navegador.
- Arquivos usam bucket privado e URL assinada curta.
- Templates globais possuem `organization_id = null`, são somente leitura para tenants e só podem ser mantidos pela Globalsys.
- Um tenant nunca consulta membros, arquivos, resultados ou logs de outro tenant.
- O painel Globalsys usa views ou RPCs agregadas com `security definer`, campos explicitamente permitidos e auditoria.
- Erros exibidos ao operador não devem conter linhas da planilha, tokens, e-mails ou payloads completos.
- Chaves de integração devem ser armazenadas cifradas ou em cofre; a UI mostra somente os últimos caracteres.

### 6.3 Política de arquivo e LGPD

Para o MVP:

- manter o arquivo bruto por sete dias;
- permitir exclusão imediata pelo Administrador;
- apagar automaticamente o bruto após o prazo;
- manter configuração, perfil estrutural, resultados e auditoria enquanto a conta estiver ativa;
- registrar finalidade e consentimento contratual para os dados enviados;
- evitar copiar dados pessoais para logs e metadados.

A retenção definitiva é uma decisão jurídica e comercial que deve ser fechada antes de produção.

## 7. Onboarding até o primeiro dashboard

### 7.1 Fluxo comum

```text
Criar conta
  → criar organização
  → responder perfil da empresa
  → escolher fonte inicial
  → validar os dados
  → configurar indicadores
  → confirmar pesos e ausências
  → publicar versão da configuração
  → executar análise
  → revisar cobertura
  → abrir primeiro dashboard
```

### 7.2 Empresa geral — planilha

1. Usuário cria a organização e escolhe “Analisar minha carteira por dados próprios”.
2. Envia CSV ou XLSX ao bucket privado.
3. O backend cria `import` e trabalho de perfilamento.
4. O motor identifica abas, colunas, tipos e possíveis chaves.
5. O usuário confirma:
   - qual coluna representa o cliente ou contrato;
   - como as abas se relacionam;
   - quais campos são contexto;
   - quais campos representam valor de negócio.
6. A plataforma oferece três caminhos:
   - reaplicar um template próprio compatível;
   - partir de um template global do segmento;
   - configurar os indicadores manualmente com sugestões iniciais.
7. O usuário define regra, agregação, peso, escala e comportamento para ausência.
8. A prévia mostra score, cobertura e contribuição para uma amostra.
9. Gestor ou Administrador publica a versão.
10. A aplicação enfileira a análise completa.
11. Ao concluir, o dashboard mostra ranking, cobertura, valores expostos e explicações.

### 7.3 Empresa tecnológica — eventos e fontes combinadas

1. Usuário cria a organização e declara possuir produto tecnológico.
2. Cadastra produto e escolhe uma conexão.
3. Integrador recebe uma chave uma única vez ou configura uma origem suportada.
4. Mapeia o identificador externo para cliente e produto contratado.
5. Define catálogo mínimo de eventos e significado de cada funcionalidade.
6. O adaptador agrega eventos em métricas de janela e combina, quando disponível, CRM, suporte, financeiro e satisfação.
7. O restante do fluxo usa o mesmo editor de indicadores, versionamento, execução e resultado da empresa geral.

O tracking não é o score. Ele é uma das fontes possíveis do score.

### 7.4 Arquivo sem template

O usuário passa pelo assistente completo. Sugestões automáticas podem indicar nomes, tipos e possíveis relações, mas nenhuma coluna deve ganhar peso ou sentido de risco sem confirmação humana.

### 7.5 Arquivo com template salvo

| Situação | Comportamento |
|---|---|
| Mesmas abas, colunas e tipos | Aplicar automaticamente e pedir confirmação antes de executar |
| Colunas extras | Permitir execução e mostrar aviso; campos novos ficam sem uso |
| Coluna esperada ausente | Bloquear execução até remover ou remapear o indicador |
| Coluna renomeada | Sugerir remapeamento, mas exigir confirmação |
| Tipo incompatível | Bloquear apenas o indicador afetado e explicar esperado versus recebido |
| Relação entre abas mudou | Exigir nova confirmação do relacionamento |

O validador atual do motor compara nomes exatos. Sugestão de renomeação deve ser uma camada da aplicação, baseada em nome, tipo e amostra, e sempre confirmada. Depois da confirmação, deve ser criada uma nova versão do template.

## 8. Versionamento e histórico

### 8.1 Ciclo de configuração

```text
Rascunho → Publicada → Arquivada
              │
              └── qualquer mudança cria uma nova versão em Rascunho
```

- Versões publicadas são imutáveis.
- Toda execução aponta para uma versão exata.
- Publicação exige uma justificativa curta.
- Pesos devem totalizar um valor positivo; a interface pode exibir 100% para facilitar entendimento, embora o motor normalize os pesos.
- Alterações de regra, peso, escala, ausência, agregação ou origem criam nova versão.

### 8.2 Comparabilidade histórica

Scores de versões diferentes não devem ser ligados como se fossem uma única série equivalente. O gráfico precisa marcar a troca de configuração.

No MVP:

- comparar evolução somente dentro da mesma versão;
- mostrar uma quebra vertical quando a configuração mudar;
- permitir consultar a metodologia de cada ponto.

Depois do hackathon, a plataforma poderá reprocessar importações antigas com a versão nova para criar uma base comparável.

### 8.3 Escalas automáticas

O motor atual pode recalcular percentis 5 e 95 a cada execução para amostras maiores. Isso significa que o mesmo valor pode receber risco diferente quando a população muda.

Recomendação:

- no MVP, persistir em cada execução os limites efetivamente usados e avisar que a escala foi recalibrada;
- para produção, avaliar congelar os limites na primeira execução publicada de uma versão ou exigir escala manual em indicadores críticos.

Congelar a escala exigirá uma pequena evolução do motor ou a resolução prévia dos limites na camada de execução.

## 9. Contrato JSON entre motor e frontend

O resultado bruto do motor deve ser transformado por uma camada de API. O frontend não deve depender dos nomes atuais em português nem da forma interna do DataFrame.

### 9.1 Contrato versionado

```json
{
  "schemaVersion": "1.0",
  "analysisRun": {
    "id": "run_01K...",
    "organizationId": "org_01K...",
    "importId": "imp_01K...",
    "templateVersionId": "tplv_01K...",
    "engineVersion": "generic-risk-1.0",
    "subjectType": "customer_product",
    "status": "completed",
    "completedAt": "2026-09-19T15:30:00Z"
  },
  "summary": {
    "entitiesAnalyzed": 58,
    "averageScore": 47.32,
    "averageCoverage": 88.1,
    "countsByBand": {
      "LOW": 31,
      "ATTENTION": 16,
      "HIGH": 7,
      "CRITICAL": 4,
      "INSUFFICIENT_DATA": 0
    },
    "businessValueAtRisk": {
      "value": 208500,
      "currency": "BRL"
    }
  },
  "entities": [
    {
      "entity": {
        "canonicalId": "atlas|pesagem",
        "customerId": "cus_01K...",
        "customerProductId": "cp_01K...",
        "displayName": "Sistema de Pesagem",
        "companyName": "Atlas Logística",
        "context": {
          "segment": "Logística",
          "owner": "Marina Costa"
        },
        "businessValues": {
          "monthlyRevenue": {
            "value": 18000,
            "currency": "BRL"
          }
        }
      },
      "risk": {
        "score": 82.35,
        "isProbability": false,
        "band": "CRITICAL",
        "coverage": 87.5,
        "coverageStatus": "adequate",
        "rank": 1
      },
      "topContributions": [
        {
          "metricKey": "completed_weighings",
          "label": "Pesagens concluídas",
          "aggregatedValue": 184,
          "rule": "LOW_IS_RISK",
          "risk01": 0.91,
          "configuredWeight": 30,
          "normalizedWeight": 0.343,
          "contributionPoints": 31.21,
          "missingApplied": null,
          "source": {
            "sheet": "uso_produto",
            "column": "pesagens_concluidas"
          },
          "scale": {
            "mode": "AUTO_PERCENTILE",
            "min": 150,
            "max": 920
          }
        }
      ]
    }
  ],
  "warnings": [
    {
      "code": "AUTO_SCALE_RECALIBRATED",
      "message": "Os limites automáticos foram recalculados para esta execução."
    }
  ]
}
```

### 9.2 Mapeamento do resultado atual

| Motor atual | Contrato público |
|---|---|
| `Entidade` | `entity.canonicalId` |
| `Score` | `risk.score` |
| `Faixa` | `risk.band` normalizada |
| `Cobertura` | `risk.coverage` |
| posição do ranking | `risk.rank` |
| fatores/contribuições | `topContributions` |
| detalhes por métrica | `analysis_metric_results` |
| contexto configurado | `entity.context` |
| valores de negócio | `entity.businessValues` |
| metadados das métricas | catálogo/configuração da resposta |

### 9.3 O que não deve aparecer nesse contrato

Não incluir enquanto não existir um modelo validado:

- `churnProbability`;
- `estimatedCancellationDate`;
- `daysUntilChurn`;
- `predictionConfidence` estatística;
- afirmações de causa e efeito.

Os gráficos preditivos atuais do protótipo devem permanecer marcados como demonstrativos ou ser ocultados no modo de dados reais até existir uma capacidade separada de previsão.

### 9.4 Histórico

O motor executa uma fotografia por vez. Uma série histórica deve ser composta pela API a partir de várias `analysis_runs`, não inventada na resposta de uma execução.

```json
{
  "entityId": "cp_01K...",
  "series": [
    {
      "runId": "run_01",
      "templateVersionId": "tplv_03",
      "measuredAt": "2026-07-01T00:00:00Z",
      "score": 61.2,
      "coverage": 92.0
    }
  ]
}
```

## 10. Dashboard com indicadores heterogêneos

### 10.1 Componentes universais

Todas as empresas podem ter:

- total de entidades analisadas;
- distribuição nas quatro faixas;
- score médio e cobertura média;
- valor de negócio exposto, quando configurado;
- ranking com score e cobertura;
- principais contribuições;
- qualidade e completude dos dados;
- data, arquivo e versão da última execução;
- evolução histórica por execução comparável.

### 10.2 Componentes dinâmicos

Os indicadores específicos são renderizados a partir da configuração e de seus metadados. O frontend não deve possuir componentes exclusivos para nomes como “pesagens” ou “chamados”.

Tipos de apresentação suficientes para o MVP:

| Tipo | Exibição |
|---|---|
| Número | valor, tendência e contribuição |
| Moeda | valor com moeda configurada |
| Percentual | barra ou número percentual |
| Booleano | estado presente/ausente |
| Categoria | rótulo e regra aplicada |
| Data | data e distância temporal calculada pela aplicação |

O nome, unidade, descrição, origem e direção de risco vêm do template.

### 10.3 Resultado com baixa cobertura

Exemplo de tratamento visual:

```text
┌────────────────────────────────────────────────────┐
│ Cliente Aurora                    Dados insuficientes│
│ Índice calculado: 78              Cobertura: 32%     │
│                                                     │
│ Este resultado não entrou no ranking.               │
│ Faltaram: NPS, chamados reabertos e atraso.          │
│ [Ver origem dos dados] [Corrigir mapeamento]         │
└────────────────────────────────────────────────────┘
```

### 10.4 Empresa, produto e consolidação

O score do motor pertence à entidade configurada. Para tecnologia, recomenda-se usar o contrato do produto como unidade de análise. A visão por empresa pode consolidar seus produtos, mas deve declarar que essa consolidação é uma regra da aplicação, não do motor genérico.

No MVP, manter a fórmula empresarial já definida pelo produto somente para a visão consolidada, com rótulo próprio. Não misturar esse valor com o score direto do motor.

```text
Índice do produto: calculado pelo motor genérico
Saúde consolidada da empresa: agregação da aplicação
```

## 11. Processamento assíncrono

### 11.1 Sequência

```text
1. Frontend pede autorização de upload
2. Supabase cria o registro da importação
3. Navegador envia o arquivo ao Storage privado
4. Frontend confirma o upload
5. Backend cria analysis_run e analysis_job
6. Worker reivindica o job
7. Worker baixa o arquivo com URL assinada curta
8. Worker executa perfilamento ou análise
9. Worker grava resultado em transação
10. Worker marca job e execução como concluídos
11. Frontend recebe atualização ou consulta novamente
```

### 11.2 Estados de tela

```text
Enviando arquivo
  → validando estrutura
  → aguardando processamento
  → processando indicadores
  → salvando resultados
  → concluído
```

Falhas devem mostrar um código curto, explicação compreensível e ação possível. Exemplo: “A coluna `cliente_id` esperada pelo template não foi encontrada. Remapeie a coluna ou escolha outro template.”

### 11.3 Idempotência e retry

- O checksum evita criar análises duplicadas por duplo clique.
- O worker pode tentar novamente até três vezes em falhas transitórias.
- Erro de configuração ou schema não deve ser repetido automaticamente.
- Um job travado pode voltar a `pending` após um tempo limite definido.
- A escrita de resultados e a conclusão do run devem ocorrer de forma transacional.

### 11.4 Limites iniciais

- Formatos: CSV e XLSX.
- Tamanho: até 50 MB, acompanhando o limite atual do motor.
- Uma análise por organização por vez no plano demonstrativo.
- Tempo limite operacional sugerido: dez minutos no worker.
- Número máximo de linhas e abas deve ser definido somente após teste de carga; não é uma capacidade comprovada do motor atual.

## 12. Wireframes textuais

### 12.1 Configuração de pesos e indicadores

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Configurar análise                     Rascunho v3   Arquivo: clientes.xlsx │
│ Template: Saúde da carteira B2B                  Compatibilidade: Atenção   │
├───────────────┬────────────────────────────────────────────┬────────────────┤
│ 1. Entidade   │ INDICADORES                                │ RESUMO         │
│ 2. Relações   │                                            │ Peso: 100%     │
│ 3. Contexto   │ [Uso mensal]                               │ 6 indicadores  │
│ 4. Indicadores│ Origem: uso.ativos_30d                     │ 2 com ausência │
│ 5. Pesos      │ Regra: valor baixo = risco                 │                │
│ 6. Revisão    │ Agregação: média recente  Peso: [30]       │ Cobertura      │
│               │ Ausência: ignorar e reponderar             │ prevista: 84%  │
│               │ [Editar]                                   │                │
│               │                                            │ Alertas        │
│               │ [SLA cumprido]                             │ • 1 coluna foi │
│               │ Origem: suporte.pct_sla                    │   remapeada    │
│               │ Regra: valor baixo = risco  Peso: [25]     │ • escala auto  │
│               │ [Editar]                                   │                │
├───────────────┴────────────────────────────────────────────┴────────────────┤
│ Motivo da versão: [____________________________________________]           │
│ [Salvar rascunho] [Visualizar amostra]                  [Publicar e rodar] │
└─────────────────────────────────────────────────────────────────────────────┘
```

Antes de publicar, a tela deve mostrar a fórmula em linguagem simples e uma amostra de como cada indicador contribuiu.

### 12.2 Dashboard da empresa cliente

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Visão geral          Período: Set/2026       Última análise: há 12 min      │
│ Fonte: clientes_setembro.xlsx       Configuração: Saúde B2B v3              │
├───────────────┬───────────────┬───────────────┬─────────────────────────────┤
│ 58 analisados │ 11 alto/crít. │ R$ 208,5 mil │ Cobertura média: 88,1%      │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ Distribuição de risco                │ Principais fatores da carteira       │
│ Baixo 31 | Atenção 16 | Alto 7 | C4 │ 1. Queda de uso          31%        │
│                                      │ 2. SLA não cumprido       24%        │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ RANKING                         [Buscar] [Faixa] [Produto] [Cobertura]       │
│ # Produto / Empresa       Índice  Faixa    Cobertura  Valor       Ação      │
│ 1 Pesagem / Atlas          82,35  Crítico     87,5%   R$ 18 mil  [Abrir]   │
│ 2 ERP / Orion              74,10  Alto        93,0%   R$ 42 mil  [Abrir]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ao abrir: valor → regra → peso → contribuição → origem → dado ausente      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Painel operacional Globalsys

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Operação Globalsys                                      Ambiente: Produção │
├───────────────┬───────────────┬───────────────┬─────────────────────────────┤
│ 42 empresas   │ 6 jobs ativos │ 2 falhas 24h  │ Tempo mediano: 48 s         │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ FILA DE PROCESSAMENTO                │ QUALIDADE OPERACIONAL                │
│ Empresa    Job       Estado   Tempo  │ Cobertura média por tenant          │
│ Acme       #1042     Rodando   00:31 │ Falhas por código                   │
│ Delta      #1043     Pendente  —     │ Uso de templates                    │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ EMPRESAS                                                                   │
│ Nome     Plano  Perfil       Última análise  Cobertura  Status técnico      │
│ Acme     Demo   Tecnologia   há 12 min       91%        Saudável            │
│ Delta    Demo   Geral        falhou           —         Schema incompatível │
├─────────────────────────────────────────────────────────────────────────────┤
│ Privacidade: este painel não exibe linhas, clientes ou métricas individuais│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 13. Painel Globalsys: permitido e proibido

### 13.1 Mostrar por padrão

- organizações e plano;
- perfil tecnológico ou geral;
- membros ativos em quantidade;
- última atividade;
- importações e status;
- tamanho e tipo do arquivo;
- duração do processamento;
- falhas por código sanitizado;
- cobertura média agregada;
- versão de template e motor;
- uso de recursos e fila;
- histórico de auditoria operacional.

### 13.2 Não mostrar por padrão

- linhas originais da planilha;
- nomes dos clientes da empresa;
- valores individuais de receita;
- eventos individuais de uso;
- respostas de pesquisas;
- credenciais e tokens;
- payloads completos de erro.

## 14. Gestão de templates

### 14.1 Template próprio

É criado e mantido pela empresa. Contém as escolhas de entidade, relações, indicadores, pesos, escalas, ausência e campos de contexto.

### 14.2 Template global por segmento

É uma base opcional mantida pela Globalsys. Ele deve ser apresentado como ponto de partida, não como verdade universal.

```text
Template global → copiar para a organização → revisar → publicar versão própria
```

Essa cópia evita que uma alteração global mude silenciosamente scores já publicados.

### 14.3 Governança mínima

- Nome e descrição claros.
- Segmento e finalidade.
- Responsável pela publicação.
- Histórico de versões.
- Justificativa de alteração.
- Teste em amostra antes de publicar.
- Revisão humana da direção de risco.

Há um indício de configuração a revisar no exemplo do motor: um percentual de SLA cumprido aparece com regra em que valor alto representa risco. Isso pode estar semanticamente invertido. A plataforma não deve “corrigir” silenciosamente; deve mostrar a regra em linguagem humana para confirmação.

## 15. Fluxo de tracking para empresas tecnológicas

### 15.1 Evento mínimo

```json
{
  "externalCustomerId": "atlas",
  "externalProductId": "pesagem",
  "eventName": "weighing.completed",
  "occurredAt": "2026-09-19T14:10:00Z",
  "properties": {
    "unitId": "sp-02"
  }
}
```

Evitar enviar nome, e-mail ou conteúdo operacional quando um identificador técnico for suficiente.

### 15.2 Agregação

Um job periódico converte eventos em métricas por contrato e janela. Exemplo:

- eventos nos últimos 7, 30 e 60 dias;
- usuários ativos;
- dias desde a última ativação;
- variação em relação à janela anterior;
- unidades sem atividade;
- falhas de integração.

Esses campos entram como colunas no motor junto com suporte, financeiro e relacionamento. O usuário vê a explicação do indicador, não cada ação individual de uma pessoa.

### 15.3 Confiança e privacidade

Na comunicação com o cliente final, usar linguagem sobre experiência e valor percebido. Não dizer “percebemos que você não clicou na função X”. Internamente, apresentar padrões agregados no contrato/produto, com acesso limitado por papel.

## 16. Riscos e decisões abertas

| Tema | Risco | Recomendação |
|---|---|---|
| Faixas divergentes | Mesmo score recebe rótulos diferentes | Adotar as quatro faixas do motor em toda a plataforma |
| Score tratado como probabilidade | Promessa estatística inexistente | Usar “índice de risco” e `isProbability: false` |
| Baixa cobertura | Prioridade baseada em poucos dados | Aplicar a política 70/40 e retirar cobertura insuficiente do ranking |
| Escala automática | Score muda com a população | Persistir limites; depois permitir congelamento por versão |
| Mudança de template | Série histórica enganosa | Quebrar a série por versão; reprocessamento fica para depois |
| Coluna renomeada | Template deixa de funcionar | Sugerir remapeamento, exigir confirmação e criar versão nova |
| Tipo incompatível | Regra calcula resultado inválido | Bloquear indicador e mostrar esperado versus recebido |
| Entidade duplicada | Junção agrega clientes incorretamente | Prévia obrigatória da chave e teste de unicidade por aba |
| Fórmula consolidada de empresa | Pode ser confundida com score do motor | Rotular como agregação da aplicação e manter cálculo separado |
| Tracking em tempo real | Motor atual só processa lote | Criar adaptador diário/horário antes de considerar streaming |
| Processamento em memória | Queda ao reiniciar e perda de estado | Persistir jobs, configs e resultados no Supabase |
| Arquivos grandes | Memória e tempo imprevisíveis | Manter 50 MB e medir antes de prometer volume de linhas |
| Templates globais | Regra genérica pode não servir ao negócio | Copiar e confirmar; não executar automaticamente |
| Dados pessoais | Exposição cruzada ou em logs | RLS, bucket privado, minimização, retenção e auditoria |
| Painel Globalsys | Excesso de privilégio | Mostrar agregados; suporte detalhado somente com acesso temporário |
| Segredos de integração | Vazamento pelo frontend | Cofre/cifra e exibição única da chave |
| Concorrência do worker | Dois workers processam o mesmo job | Reivindicação transacional e idempotência |
| Métrica semanticamente invertida | Peso correto aplicado na direção errada | Revisão em linguagem humana antes da publicação |

## 17. MVP do hackathon

### 17.1 Fazer agora

1. Supabase Auth, organizações, membros e cinco papéis.
2. RLS por `organization_id`.
3. Upload privado de CSV/XLSX até 50 MB.
4. Perfilamento e configuração usando o motor atual.
5. Templates versionados, com um template próprio e um global demonstrativo.
6. Tabela de jobs e um worker Python.
7. Contrato JSON versionado.
8. Persistência de runs, resultados e contribuições.
9. Dashboard da empresa com quatro faixas e cobertura.
10. Um fluxo tecnológico demonstrativo que agrega eventos para colunas.
11. Painel Globalsys com fila, falhas e métricas agregadas.
12. Auditoria de publicação e execução.

### 17.2 Deixar para depois

- previsão estatística de churn;
- data estimada de cancelamento;
- IA conversacional real para configurar métricas;
- identificação automática e definitiva de colunas;
- streaming em tempo real;
- broker dedicado;
- múltiplos workers com autoscaling;
- marketplace de templates;
- reprocessamento massivo de histórico;
- data warehouse;
- acesso temporário de suporte a dados do tenant;
- cobrança, limites comerciais e planos completos;
- sincronização externa de pesquisas e benefícios;
- calibração automática validada por segmento.

O corte preserva o diferencial do projeto: a mesma plataforma aceita tracking tecnológico e planilhas heterogêneas, mas ambos terminam em um índice configurável, explicável e auditável.

## 18. Ordem recomendada de implementação

### Fase 0 — alinhar o domínio atual

- substituir as três faixas pelas quatro do motor;
- separar “índice de produto” de “saúde consolidada da empresa”;
- remover linguagem de probabilidade dos dados reais;
- definir o contrato JSON público.

### Fase 1 — tenancy e persistência

- criar schema Supabase;
- configurar Auth, membros e RLS;
- implementar Storage privado;
- registrar auditoria mínima.

### Fase 2 — fluxo geral por planilha

- upload, perfilamento e compatibilidade;
- configuração e versões;
- fila e worker;
- persistência e dashboard dinâmico.

### Fase 3 — operação Globalsys

- status de organizações, importações e jobs;
- erros sanitizados;
- cobertura e tempo de processamento;
- template global demonstrativo.

### Fase 4 — tecnologia

- uma conexão real ou endpoint de eventos;
- catálogo mínimo de eventos;
- agregador por janela;
- execução pelo mesmo motor.

## 19. Critérios de aceite da arquitetura

- Um usuário de uma organização não consegue ler ou escrever dados de outra.
- O browser nunca recebe `service_role` ou segredo de integração.
- Um upload não bloqueia uma requisição web durante o cálculo.
- Reiniciar o worker não perde o estado do trabalho.
- Toda análise aponta para arquivo, versão da configuração e versão do motor.
- Um resultado mostra score, faixa, cobertura e contribuições.
- Resultados com cobertura menor que 40% não entram na priorização automática.
- Um template incompatível não executa silenciosamente.
- Uma nova configuração não altera resultados históricos.
- O painel Globalsys opera a plataforma sem revelar dados brutos por padrão.
- O frontend chama o resultado de índice, não probabilidade.
- Tracking e planilha utilizam o mesmo contrato final, mesmo tendo ingestões diferentes.

## 20. Conclusão

A solução mais simples e sólida para o hackathon é manter o motor Python como uma unidade de cálculo batch, cercá-lo por persistência e segurança no Supabase e expor ao React um contrato estável e explicável.

O valor inovador não depende de prometer uma IA que prevê o futuro. Ele está em permitir que cada empresa defina o que significa risco no próprio contexto, combine fontes diferentes, acompanhe cobertura e entenda exatamente por que um cliente ou produto recebeu determinado índice.

O próximo passo técnico deve ser a Fase 0: unificar as faixas e o vocabulário, fechar o contrato JSON e só então criar o schema Supabase e o worker.
