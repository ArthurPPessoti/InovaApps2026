# Plano completo de churn preditivo e dados externos — INOVAAPPS 2026

> Plano de produto, dados, modelo e integração visual. Não implementa o modelo nesta etapa.
>
> Base analisada: `INOVAAPPS_base_de_dados.xlsx`
> Data: 19/09/2026

## 1. Decisão de produto

Adicionar um modelo de churn complementa a solução, desde que o produto mantenha separados quatro conceitos:

| Resultado | Pergunta respondida | Origem |
|---|---|---|
| Índice de risco | O que está ruim agora e por quê? | Motor configurável existente |
| Probabilidade de churn | Qual a chance de cancelar em um horizonte definido? | Modelo treinado com histórico e desfecho |
| Receita esperada em risco | Qual o impacto financeiro esperado? | Probabilidade × receita recorrente |
| Prioridade de atuação | Em quem o time deve agir primeiro? | Probabilidade, receita, criticidade, prazo e capacidade operacional |

O índice de risco não deve ser convertido em probabilidade. Um índice 82/100 não significa 82% de chance de cancelamento.

## 2. Proposta final da solução

```text
Planilhas, CRM, suporte, financeiro, NPS e tracking
                         │
                         ▼
              Qualidade e cobertura dos dados
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      Motor de risco          Modelo de churn
      Índice atual             P(churn em 90 dias)
      Explicação por regra     Previsão com versão
              └──────────┬──────────┘
                         ▼
              Impacto financeiro esperado
                         ▼
               Priorização e gestão de ações
                         ▼
              Resultado real e novo aprendizado
```

O motor de risco funciona mesmo sem histórico de cancelamentos. O modelo de churn só é habilitado quando a empresa possui dados históricos suficientes e um desfecho confiável.

## 3. Unidade de análise

### 3.1 Empresa geral

A unidade padrão será o cliente da empresa:

```text
Organização usuária → cliente analisado → observações ao longo do tempo
```

### 3.2 Empresa tecnológica

A unidade recomendada será o produto contratado:

```text
Organização usuária
└── empresa cliente
    ├── produto contratado A
    └── produto contratado B
```

O churn de um produto não significa automaticamente o cancelamento de toda a empresa. O modelo deve prever o cancelamento por contrato/produto quando os dados permitirem.

### 3.3 Limite da base do hackathon

A planilha fornecida possui clientes, mas não possui uma dimensão de produtos contratados. O primeiro modelo real poderá ser validado no nível de cliente. Um modelo por produto precisará de outra base contendo `customer_product_id` ou equivalente.

## 4. Definição do churn

Antes de treinar, cada organização deve definir:

- qual evento caracteriza cancelamento;
- se redução de plano conta como churn total, parcial ou não conta;
- se o cancelamento é considerado na solicitação, no encerramento ou no fim do faturamento;
- qual horizonte será previsto;
- quais contratos entram na população elegível;
- como tratar pausas, inadimplência, reativação e migração de produto.

### 4.1 Definição para o hackathon

```text
Unidade: cliente
Data de observação: fechamento de cada mês
Desfecho positivo: cancelamento em um dos três meses seguintes
Horizonte: 90 dias
Exemplo: dados disponíveis até março → prever cancelamento entre abril e junho
```

O mês em que o cliente já cancelou não entra como exemplo de previsão. Linhas posteriores também não existem e não devem ser reconstruídas.

## 5. Diagnóstico da base fornecida

### 5.1 Estrutura encontrada

| Aba | Conteúdo | Volume |
|---|---|---:|
| `clientes` | Cadastro, segmento, porte, plano, receita, SLA e início do contrato | 80 clientes |
| `atendimento_mensal` | Suporte, SLA, uso, pagamento e reuniões | 1.295 linhas |
| `pesquisas_nps` | Pesquisa trimestral e não resposta | 422 linhas |
| `situacao_clientes` | Situação final e mês de cancelamento | 80 clientes |

Período observado: janeiro de 2025 a junho de 2026.

Desfechos:

- 58 clientes ativos ao final do período;
- 22 clientes cancelados;
- cancelamentos distribuídos entre maio de 2025 e junho de 2026.

### 5.2 Elegibilidade

A base é suficiente para um **piloto real de hackathon**, porque contém:

- histórico mensal;
- identificador estável;
- data do desfecho;
- clientes que cancelaram e que permaneceram;
- variáveis comportamentais anteriores ao cancelamento;
- ausência intencional documentada no NPS.

Ela ainda não sustenta uma afirmação de desempenho produtivo porque existem somente 22 eventos independentes de churn. Várias linhas mensais do mesmo cliente não criam novos cancelamentos independentes.

### 5.3 Conjunto supervisionado planejado

Usando três meses para formar histórico e três meses para observar o desfecho:

| Divisão temporal | Meses de referência | Registros cliente-mês | Positivos no horizonte | Clientes positivos distintos |
|---|---|---:|---:|---:|
| Treino inicial | abr/2025 a set/2025 | 458 | 21 | 10 |
| Validação | out/2025 a dez/2025 | 213 | 12 | 7 |
| Teste temporal | jan/2026 a mar/2026 | 201 | 18 | 11 |

São 872 fotografias mensais e 51 rótulos positivos, mas apenas 22 cancelamentos reais na base completa. O mesmo cancelamento pode ser positivo em mais de uma fotografia anterior.

## 6. Empresas externas trazendo dados

### 6.1 Entrada de dados

A área Dados deve oferecer três caminhos:

1. **Modelo de planilha INOVAAPPS:** empresa baixa um template e preenche campos conhecidos.
2. **Minha própria planilha:** assistente perfila abas e orienta o mapeamento.
3. **Integração contínua:** API, tracking ou conector para fontes recorrentes.

### 6.2 Assistente de mapeamento

```text
Enviar arquivo
  → identificar abas e período
  → escolher unidade de análise
  → mapear identificador
  → mapear data de referência
  → definir cancelamento e data do evento
  → mapear receita e produto
  → classificar indicadores
  → validar relações e duplicidades
  → avaliar elegibilidade preditiva
  → configurar índice de risco
  → processar
```

O sistema pode sugerir mapeamentos, mas o usuário precisa confirmar o significado. Colunas com nomes semelhantes podem possuir conceitos diferentes.

### 6.3 Campos mínimos por capacidade

#### Para índice de risco

- identificador da entidade;
- pelo menos um indicador configurável;
- regra de interpretação do indicador;
- peso;
- política para ausência.

#### Para probabilidade de churn

- identificador estável;
- data ou período de cada observação;
- situação conhecida;
- data ou período de cancelamento;
- histórico anterior ao desfecho;
- exemplos de clientes que não cancelaram;
- janela futura totalmente observada para treino e teste.

#### Para impacto financeiro

- receita recorrente por cliente ou contrato;
- moeda;
- período da receita;
- regra para receita variável, quando aplicável.

### 6.4 Portão de elegibilidade

| Estado | Critério indicativo | Produto liberado |
|---|---|---|
| Diagnóstico | Sem desfecho ou sem histórico temporal | Índice de risco e explicações |
| Coleta | Estrutura válida, mas janela futura incompleta | Índice e acompanhamento até formar histórico |
| Piloto preditivo | Pelo menos 12 meses e cerca de 15 a 49 eventos | Probabilidade experimental com aviso |
| Candidato a produção | Cerca de 50 ou mais eventos, períodos estáveis e teste temporal satisfatório | Probabilidade publicada após aprovação |

Esses números são uma política inicial, não uma garantia estatística. A elegibilidade final também depende da variedade, qualidade, taxa de churn e estabilidade temporal.

### 6.5 Empresa sem histórico de cancelamento

Ela não recebe uma probabilidade artificial. A plataforma deve:

- calcular o índice explicável;
- começar a armazenar fotografias periódicas;
- registrar cancelamentos futuros;
- informar quanto histórico falta;
- oferecer cenários demonstrativos claramente rotulados, se desejado.

Um modelo compartilhado entre empresas só deve existir depois, com consentimento, anonimização, compatibilidade de domínio e validação por segmento.

## 7. Preparação dos dados do hackathon

### 7.1 Fotografias mensais

Gerar uma linha por cliente e mês de referência. Todas as variáveis precisam estar disponíveis até aquele mês.

```text
cliente_id | mes_ref | variáveis atuais | variáveis históricas | churn_90d
```

### 7.2 Variáveis cadastrais

- segmento;
- porte;
- plano;
- valor mensal;
- SLA contratado;
- tempo de contrato até a data da fotografia.

### 7.3 Variáveis do mês atual

- chamados abertos;
- chamados críticos;
- chamados reabertos;
- percentual de SLA cumprido;
- tempo médio de resolução;
- reclamações formais;
- uso da plataforma;
- atraso de pagamento;
- reunião prevista;
- reunião realizada;
- última nota e classificação de NPS conhecidas;
- resposta ou não resposta à pesquisa.

### 7.4 Variáveis históricas

Para os principais indicadores:

- média dos últimos três meses;
- último valor conhecido;
- variação entre mês atual e três meses atrás;
- inclinação simples dos últimos três meses;
- quantidade de meses consecutivos piorando;
- quantidade acumulada de reclamações;
- taxa de reuniões realizadas quando previstas;
- meses desde o último NPS respondido;
- frequência recente de não resposta.

Não é necessário criar dezenas de janelas no primeiro modelo. Três meses, último valor e variação já cobrem a hipótese principal com menor risco de sobreajuste.

### 7.5 Ausências

- `pct_sla_cumprido` vazio quando não houve chamado não deve virar zero.
- NPS vazio com `respondeu = 0` representa não resposta, não erro de coleta.
- Criar indicador binário de ausência quando ela possui significado.
- Imputação deve ser aprendida somente no treino.

### 7.6 Prevenção de vazamento

Nunca usar como variável:

- situação final do cliente;
- mês de cancelamento;
- qualquer dado posterior à fotografia;
- quantidade total de meses existentes na planilha;
- ausência de linhas posteriores como indicador direto;
- resposta de pesquisa recebida depois do período previsto.

O pipeline precisa usar junções “as of”: para uma fotografia de março, somente NPS e eventos disponíveis até março.

## 8. Modelo recomendado

### 8.1 Baseline principal

Usar uma regressão logística regularizada em um pipeline único:

```text
Numéricos
  → imputação pela mediana do treino
  → padronização

Categóricos
  → imputação por categoria ausente
  → one-hot encoding com categorias desconhecidas ignoradas

Tudo
  → LogisticRegression regularizada
  → probabilidade de churn em 90 dias
```

Motivos:

- produz probabilidade;
- é adequada para uma base pequena;
- reduz risco de sobreajuste;
- facilita explicação;
- não exige infraestrutura adicional;
- permite um baseline reproduzível.

Não adicionar redes neurais, AutoML ou múltiplos modelos no hackathon. Um challenger só deve ser criado quando o baseline estiver corretamente validado.

### 8.2 Desbalanceamento

A taxa positiva por fotografia varia aproximadamente de 4% a 11%. O modelo deve priorizar probabilidades úteis, então o primeiro experimento não deve aplicar balanceamento agressivo sem recalibração.

O limiar operacional é escolhido depois do treino conforme a capacidade do time:

```text
“O time consegue abordar 10 clientes por semana.”
→ selecionar o ponto de corte que entrega os melhores 10 casos, não assumir 50%.
```

### 8.3 Calibração

Uma probabilidade de 30% deve significar que grupos semelhantes cancelam perto de 30% das vezes. Avaliar:

- curva de calibração;
- Brier score;
- log loss;
- diferença entre probabilidade média e taxa observada.

Com apenas 22 cancelamentos, uma calibragem adicional pode ficar instável. Ela só deve ser aplicada se melhorar o teste temporal. Caso contrário, a interface deve marcar o modelo como piloto.

### 8.4 Explicação individual

Para cada previsão, guardar:

- probabilidade;
- horizonte;
- data da fotografia;
- versão do modelo;
- cobertura das variáveis;
- três a cinco fatores que elevaram o risco;
- fatores que reduziram o risco;
- comparação com o histórico do próprio cliente.

A contribuição da regressão logística pode ser calculada no espaço de log-odds. A interface traduz isso para frases curtas, sem afirmar causalidade.

Exemplo:

```text
Probabilidade em 90 dias: 64%

Fatores associados ao aumento:
• Uso caiu 23 pontos em três meses.
• Dois chamados críticos foram reabertos.
• A última pesquisa não foi respondida.

Fator de proteção:
• Pagamentos permaneceram em dia.
```

## 9. Validação

### 9.1 Divisão temporal

Não usar divisão aleatória simples. O modelo deve aprender no passado e ser testado em meses posteriores.

```text
Treino → meses antigos
Validação → meses intermediários
Teste final → meses mais recentes com horizonte completo
```

Após a avaliação, refazer o modelo com todas as fotografias cujo horizonte já foi observado e gerar as probabilidades de junho de 2026 para os 58 clientes ativos. Essas previsões representam julho a setembro de 2026, período cujo resultado ainda não existe na planilha.

### 9.2 Métricas

| Métrica | Finalidade |
|---|---|
| PR-AUC | Desempenho quando churn é raro |
| ROC-AUC | Capacidade geral de ordenação |
| Brier score | Qualidade numérica da probabilidade |
| Log loss | Penalização de probabilidades excessivamente confiantes |
| Precision@K | Quantos dos primeiros casos realmente cancelaram |
| Recall@K | Quantos cancelamentos foram encontrados dentro da capacidade do time |
| Lift@K | Ganho sobre abordar clientes ao acaso |
| Receita capturada@K | Receita dos cancelamentos encontrados no topo |

Não escolher modelo apenas por acurácia. Prever todo mundo como ativo já teria alta acurácia e seria inútil.

### 9.3 Critérios para publicar

- superar um baseline simples baseado na taxa histórica;
- apresentar lift útil no grupo que o time consegue abordar;
- não apresentar degradação grave entre validação e teste;
- possuir calibração compreensível;
- ter todas as variáveis disponíveis no momento real da previsão;
- registrar limitações e versão;
- ser aprovado por Gestor ou Administrador.

Se falhar, manter o índice de risco e mostrar que a probabilidade ainda está em validação.

## 10. Resultados derivados

### 10.1 Receita mensal esperada em risco

Para cada contrato:

```text
MRR esperado em risco = probabilidade de churn em 90 dias × MRR
```

Para a carteira:

```text
MRR esperado em risco da carteira = soma do MRR esperado em risco
```

Isso é valor esperado, não uma previsão de perda exata.

### 10.2 Cenário sem ação

Usar as probabilidades publicadas para estimar receita esperada no horizonte coberto pelo modelo.

Um modelo de 90 dias só deve alimentar uma projeção real de 90 dias. Um gráfico de seis meses exige um modelo separado de 180 dias ou deve continuar identificado como cenário demonstrativo.

### 10.3 Cenário com ação

O modelo observacional não prova quanto uma intervenção salva. Enquanto não houver histórico de ações e grupo de comparação, o cenário “com ação” usa uma taxa de recuperação escolhida pelo usuário.

```text
Receita preservada simulada = MRR esperado em risco × taxa de recuperação assumida
```

A tela deve chamar esse resultado de simulação, não de previsão do modelo.

### 10.4 Priorização operacional

Manter a fórmula visível:

```text
impacto esperado = probabilidade × receita mensal

prioridade operacional =
impacto esperado
× fator de criticidade
× fator de proximidade da renovação
```

O índice de risco entra como evidência e explicação. Ele não precisa ser multiplicado novamente pela probabilidade, pois isso pode contar os mesmos sinais duas vezes.

## 11. Aplicação nas telas

### 11.1 Visão geral

Indicadores:

- clientes ou produtos analisados;
- clientes com índice alto ou crítico;
- clientes com probabilidade elevada em 90 dias;
- MRR nominal associado a esses clientes;
- MRR esperado em risco;
- cobertura média;
- situação do modelo: indisponível, coleta, piloto ou publicado.

Gráficos:

1. **Receita recorrente em 90 dias:** observado e valor esperado sem ação.
2. **Matriz probabilidade × impacto:** eixo X probabilidade, eixo Y MRR, tamanho criticidade.
3. **Índice atual × probabilidade futura:** quatro quadrantes para separar problema atual de risco futuro.
4. **Simulador de intervenção:** mantém taxa de recuperação explicitamente assumida.
5. **Ranking:** ordenação por impacto esperado ou prioridade operacional.

Evitar colocar todas as análises na página inicial. Ela responde “qual é o impacto e onde agir agora?”.

### 11.2 Previsões

Cabeçalho:

```text
Horizonte: 90 dias
Data-base: 30/06/2026
Modelo: churn-90d v1
Situação: piloto
Última validação: teste temporal jan–mar/2026
```

Blocos:

- distribuição das probabilidades;
- evolução da probabilidade por cliente ao longo das fotografias;
- receita esperada em risco por mês do horizonte;
- concentração por segmento, plano e responsável;
- entrada e saída de clientes acima do limiar;
- tabela das previsões com cobertura e fatores;
- cartão de qualidade do modelo com PR-AUC, Brier, lift e tamanho da amostra;
- limitações do modelo.

Remover ou manter como demonstração qualquer gráfico que apresente “dias até cancelar” sem um modelo de sobrevivência validado.

### 11.3 Clientes

Colunas recomendadas:

| Coluna | Conteúdo |
|---|---|
| Cliente/produto | Unidade principal e empresa como contexto |
| Índice atual | 0 a 100, faixa e cobertura |
| Churn 90 dias | Probabilidade e situação do modelo |
| MRR | Receita mensal |
| MRR esperado em risco | Probabilidade × MRR |
| Mudança | Variação da probabilidade desde o mês anterior |
| Principal evidência | Fator explicável |
| Ação | Abrir detalhe ou criar ação |

Filtros:

- índice;
- probabilidade;
- cobertura;
- receita;
- segmento;
- produto;
- responsável;
- modelo piloto/publicado;
- com ou sem ação em andamento.

### 11.4 Detalhe do cliente ou produto

```text
┌──────────────────────────────────────────────────────────────┐
│ Sistema de Pesagem                           Atlas Logística │
│ Índice atual 82/100  | Churn 90d 64% | Cobertura 91%        │
│ MRR R$ 18 mil        | MRR esperado em risco R$ 11,5 mil    │
├──────────────────────────────┬───────────────────────────────┤
│ O que está acontecendo       │ O que pode acontecer         │
│ Contribuições do índice      │ Probabilidade e trajetória   │
│ Sinais e dados observados    │ Versão e horizonte           │
├──────────────────────────────┴───────────────────────────────┤
│ Fatores que elevaram/reduziram a previsão                   │
├──────────────────────────────────────────────────────────────┤
│ Histórico: índice, probabilidade, cobertura, ações e eventos │
├──────────────────────────────────────────────────────────────┤
│ [Criar ação] [Delegar] [Registrar contato]                   │
└──────────────────────────────────────────────────────────────┘
```

### 11.5 Empresa consolidada

- mostrar os produtos separadamente;
- somar o MRR esperado em risco dos produtos;
- não somar probabilidades;
- para “chance de perder algum produto”, usar fórmula própria somente se a dependência entre produtos tiver sido estudada;
- destacar empresa saudável com produto crítico oculto;
- manter relacionamento geral como uma dimensão separada.

### 11.6 Sinais

Continuar focada em evidências observadas:

- quedas de uso;
- problemas de SLA;
- chamados e reaberturas;
- pagamento;
- satisfação;
- relacionamento;
- tracking de funcionalidades.

Cada sinal pode mostrar se também contribuiu para a previsão, mas a aba não deve virar uma segunda página de previsões.

### 11.7 Gestão

- ordenar casos por impacto esperado;
- mostrar probabilidade na criação da ação;
- registrar responsável, data, etapa, ação aplicada e resultado;
- separar cliente recuperado, renovado, cancelado e ainda observado;
- comparar abordagem e resultado;
- alimentar o histórico de intervenções.

O resultado de uma ação não deve ser automaticamente atribuído à ação como causalidade.

### 11.8 Cancelados e pesquisas

- cancelamento confirmado vira desfecho do modelo;
- guardar produto, data e motivo;
- resposta da pesquisa pode enriquecer análises futuras;
- não usar uma resposta recebida depois do cancelamento para prever aquele mesmo cancelamento;
- motivos ajudam a segmentar causas, mas não substituem o rótulo binário.

### 11.9 Dados

Nova seção “Prontidão preditiva”:

```text
Histórico encontrado: 18 meses
Entidades: 80
Cancelamentos: 22
Data do cancelamento: disponível
Janela completa para teste: sim
Situação: piloto preditivo

[Revisar mapeamento] [Configurar churn] [Treinar piloto]
```

Exibir problemas antes do processamento:

- chave duplicada;
- períodos ausentes;
- cancelamento sem data;
- datas posteriores ao cancelamento;
- classes muito raras;
- colunas constantes;
- mudança de tipo;
- entidades novas sem histórico.

### 11.10 Configuração do modelo

Administrador ou Gestor escolhe:

- unidade de análise;
- definição de churn;
- horizonte;
- receita usada no impacto;
- população elegível;
- capacidade operacional para definição do limiar;
- campos proibidos;
- aprovação da versão.

O algoritmo, a separação temporal e as regras contra vazamento não devem ser controles livres para usuários comuns.

### 11.11 Painel Globalsys

Mostrar somente informações operacionais e agregadas por padrão:

- organização;
- estado de elegibilidade;
- quantidade de entidades e eventos;
- versões do modelo;
- tempo de treino e inferência;
- falhas de schema;
- PR-AUC, Brier e lift agregados;
- drift;
- última previsão;
- modelo suspenso ou publicado.

Não exibir linhas da planilha, clientes individuais ou contribuições sem autorização temporária e auditada.

## 12. Contrato de previsão

```json
{
  "schemaVersion": "1.0",
  "predictionRun": {
    "id": "predrun_01K...",
    "organizationId": "org_01K...",
    "modelVersionId": "modelv_01K...",
    "subjectType": "customer",
    "asOfDate": "2026-06-30",
    "horizonDays": 90,
    "status": "completed"
  },
  "model": {
    "name": "Churn 90 dias",
    "version": 1,
    "stage": "pilot",
    "trainedUntil": "2026-03-31",
    "independentChurnEvents": 22,
    "metrics": {
      "prAuc": 0.0,
      "rocAuc": 0.0,
      "brierScore": 0.0,
      "liftAt10": 0.0
    }
  },
  "predictions": [
    {
      "subjectId": "customer_uuid",
      "externalId": "C001",
      "probability": 0.64,
      "probabilityBand": "HIGH",
      "dataCoverage": 0.91,
      "expectedMonthlyRevenueAtRisk": {
        "value": 11520,
        "currency": "BRL"
      },
      "topFactors": [
        {
          "feature": "usageChange3m",
          "direction": "increases_risk",
          "observedValue": -23.1,
          "contribution": 0.48
        }
      ]
    }
  ]
}
```

Os valores de métricas permanecem vazios ou reais. Nunca preencher com números ilustrativos em uma execução marcada como real.

## 13. Modelo de dados adicional

### `churn_definitions`

- `organization_id`;
- unidade de análise;
- evento e data de churn;
- horizonte;
- população elegível;
- versão e estado.

### `feature_snapshots`

- organização;
- entidade;
- data-base;
- versão do conjunto de variáveis;
- valores preparados;
- cobertura;
- referência à importação.

### `model_versions`

- organização;
- definição de churn;
- algoritmo e parâmetros;
- período de treino;
- schema de variáveis;
- métricas;
- estágio `draft`, `pilot`, `published`, `suspended`;
- artefato do modelo em Storage privado;
- criador, aprovador e data.

### `prediction_runs`

- versão do modelo;
- data-base;
- horizonte;
- importação usada;
- estado;
- resumo e erros.

### `churn_predictions`

- run;
- entidade;
- probabilidade;
- faixa;
- cobertura;
- receita esperada em risco;
- fatores explicativos.

### `observed_outcomes`

- entidade;
- data do churn ou confirmação de permanência até uma data;
- origem;
- motivo, quando disponível.

### `retention_interventions`

- entidade;
- ação;
- responsável;
- datas de início e conclusão;
- resultado observado;
- custo;
- versão da previsão existente no momento da ação.

Todas as tabelas seguem `organization_id`, RLS e auditoria definidos no documento de arquitetura principal.

## 14. Execução técnica

### 14.1 Pipeline de treino

```text
Importação aprovada
  → materializar fotografias
  → gerar rótulo com horizonte completo
  → validar vazamento
  → dividir por tempo
  → treinar pipeline
  → avaliar
  → gerar relatório
  → revisão humana
  → publicar ou manter como piloto
```

### 14.2 Pipeline de previsão

```text
Nova fotografia
  → validar schema
  → aplicar exatamente o pipeline da versão
  → gerar probabilidades
  → calcular impacto esperado
  → persistir explicações
  → atualizar telas
```

### 14.3 Artefatos por versão

- modelo serializado;
- lista e tipos das variáveis;
- transformações;
- definição do rótulo;
- janela de treino;
- métricas de validação e teste;
- curva de calibração;
- limiar operacional;
- dependências e versão do código;
- relatório de limitações.

## 15. Monitoramento

### 15.1 Dados

- cobertura por variável;
- alteração de tipos;
- categorias desconhecidas;
- mudança de distribuição;
- entidades sem histórico;
- atraso da fonte;
- duplicidade.

### 15.2 Modelo

- taxa prevista versus taxa observada;
- Brier por período;
- PR-AUC e lift quando os desfechos amadurecerem;
- calibração por faixa;
- concentração de previsões;
- estabilidade dos principais fatores;
- desempenho por segmento, porte e plano.

### 15.3 Política de suspensão

Suspender novas previsões e manter somente o índice quando:

- faltar uma fonte obrigatória;
- ocorrer mudança incompatível de schema;
- a cobertura cair abaixo do limite definido;
- o modelo apresentar degradação material;
- a definição de churn mudar;
- a versão não puder ser reproduzida.

## 16. Segurança e isolamento

- Um modelo por organização é o padrão.
- Dados brutos e artefatos permanecem em caminhos privados do tenant.
- A `service_role` fica somente no worker.
- Nenhum dado de outra empresa entra no treino sem autorização explícita.
- Explicações não devem revelar dados de outros clientes.
- Arquivos brutos seguem a retenção definida pela organização.
- Logs não armazenam linhas, nomes, e-mails ou tokens.
- Toda publicação, suspensão e alteração da definição de churn entra na auditoria.

## 17. Papéis

| Ação | Admin | Gestor | Analista | Integrador | CS |
|---|:---:|:---:|:---:|:---:|:---:|
| Definir churn e horizonte | Sim | Sim | Rascunho | Não | Não |
| Mapear dados | Sim | Revisar | Sim | Sim | Não |
| Treinar piloto | Sim | Sim | Sim | Não | Não |
| Publicar modelo | Sim | Sim | Não | Não | Não |
| Ver métricas técnicas | Sim | Sim | Sim | Limitado | Resumo |
| Ver previsões da carteira | Sim | Sim | Sim | Não | Sim |
| Criar e executar ações | Sim | Sim | Leitura | Não | Sim |

## 18. Entrega em etapas

### Etapa 1 — cálculo real isolado

- criar pipeline reproduzível para a planilha do hackathon;
- gerar fotografias sem vazamento;
- treinar regressão logística;
- realizar teste temporal;
- gerar probabilidades de junho de 2026 para os 58 ativos;
- produzir relatório de métricas e limitações;
- comparar índice atual e probabilidade.

Saídas:

- `model_metrics.json`;
- `predictions_2026-06.csv`;
- `feature_dictionary.json`;
- `model_report.md`;
- modelo versionado.

### Etapa 2 — integração visual

- adicionar tipos e contrato de previsão;
- substituir mocks dos gráficos compatíveis;
- adicionar situação do modelo e horizonte;
- atualizar Visão geral, Previsões, Clientes e detalhes;
- preservar cenários simulados com rótulo próprio.

### Etapa 3 — fluxo de dados externos

- prontidão preditiva;
- mapeamento de rótulo, entidade e tempo;
- perfil de qualidade;
- templates por organização;
- treino assíncrono;
- aprovação e publicação.

### Etapa 4 — tracking tecnológico

- agregar eventos por produto e janela;
- formar fotografias mensais;
- incluir suporte, receita e relacionamento;
- treinar modelo por produto quando houver cancelamentos suficientes.

### Etapa 5 — ciclo operacional

- conectar previsões a ações;
- registrar resultados;
- monitorar maturação do desfecho;
- retreinar versões aprovadas;
- avaliar efeito de intervenções sem alegar causalidade prematuramente.

## 19. Testes e critérios de aceite

### Dados

- nenhuma fotografia contém informação posterior à data-base;
- cancelados não possuem fotografias após a saída;
- NPS usa somente a última observação disponível até a data-base;
- ausência sem chamado não vira SLA zero;
- chaves e junções reconciliam com as quatro abas;
- as contagens 80, 22 e 58 são preservadas.

### Modelo

- divisão temporal reproduzível;
- pipeline ajustado somente com treino;
- probabilidades entre 0 e 1;
- métricas calculadas no teste ainda não visto;
- comparação com baseline;
- artefato e previsão reproduzíveis pela versão;
- nenhum valor demonstrativo misturado com resultado real.

### Produto

- índice e probabilidade aparecem separados;
- horizonte, data-base e versão estão visíveis;
- baixa cobertura recebe aviso;
- MRR esperado reconcilia com probabilidade × MRR;
- gráficos não extrapolam além do horizonte real;
- cenário com ação exibe a taxa assumida;
- empresas sem modelo continuam usando o índice;
- usuários veem somente seu tenant;
- painel Globalsys mostra agregados por padrão.

## 20. Decisões que precisam ser fechadas

1. Churn será previsto por cliente, contrato ou produto em cada perfil?
2. O horizonte oficial será 90 dias ou haverá modelos separados de 30, 60 e 180 dias?
3. Qual capacidade semanal do time define o topo do ranking?
4. Qual cobertura mínima permite publicar uma probabilidade?
5. Gestor poderá publicar sozinho ou precisará de aprovação do Administrador?
6. Dados poderão participar de modelos compartilhados entre organizações?
7. Qual prazo de retenção vale para arquivos, fotografias e artefatos?
8. Downgrade e cancelamento parcial serão modelos diferentes?
9. Qual regra define receita recorrente quando o valor varia por mês?
10. Como registrar intervenções para não confundir atendimento com causa da retenção?

## 21. Recomendação final

Implementar primeiro um modelo real de churn em 90 dias usando a base do hackathon, mantendo-o como **piloto**. A regressão logística é o ponto de partida mais seguro para 80 clientes e 22 cancelamentos.

O diferencial apresentado será:

```text
Índice explicável para funcionar desde o primeiro dado
+
Probabilidade real quando existe histórico suficiente
+
Impacto financeiro e gestão das ações
+
Aprendizado contínuo com os resultados observados
```

Depois de validar o cálculo isolado, a integração deve substituir apenas os pontos atualmente demonstrativos compatíveis com o horizonte de 90 dias. Os demais cenários continuam disponíveis, mas claramente identificados como simulação.
