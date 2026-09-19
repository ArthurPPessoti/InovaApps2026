# Plataforma Adaptativa de Inteligência de Risco e Valor

## Identificação antecipada de perda de valor, risco de saída e impacto financeiro

**Documento conceitual para o INOVAAPPS 2026**

**Versão:** 1.0  
**Data:** setembro de 2026  
**Status:** proposta para protótipo e apresentação

> A empresa não precisa adaptar seus dados ao sistema. O sistema entende como ela trabalha, identifica onde o valor está sendo perdido e mostra onde agir antes que o problema se transforme em cancelamento, evasão, desistência ou abandono.

<div style="page-break-after: always;"></div>

## Sumário

1. Resumo executivo
2. Problema
3. Proposta de valor
4. Visão geral da solução
5. Tecnologia como núcleo inovador
6. Modo adaptativo para outros segmentos
7. Jornada de configuração assistida pela IA
8. Modelo universal de dados e métricas
9. Motor de análise
10. Saúde geral, saúde por dimensão e sinais emergentes
11. Impacto financeiro
12. Dashboard executivo
13. Detalhamento individual
14. Recomendações e acompanhamento humano
15. Privacidade, transparência e governança
16. Templates reutilizáveis
17. Arquitetura conceitual
18. Escopo do MVP
19. Demonstração para o hackathon
20. Diferenciais da proposta
21. Limitações e evolução futura
22. Conclusão

---

## 1. Resumo executivo

Empresas normalmente descobrem a insatisfação quando o cliente reclama, reduz o contrato ou solicita o cancelamento. Indicadores tradicionais podem mostrar uma conta como saudável mesmo quando uma funcionalidade importante deixou de ser utilizada e parte do valor contratado já não está sendo percebida.

A proposta é construir uma plataforma web adaptativa capaz de combinar dados empresariais, históricos e comportamentais para identificar sinais de perda de valor antes do evento de saída. A solução apresenta quem ou o que precisa de atenção, quais evidências sustentam o alerta e qual receita pode estar associada ao problema.

Para empresas de tecnologia, a plataforma possui uma experiência contínua e aprofundada. Ela conecta o tracking de funcionalidades aos dados de contrato, receita, suporte, satisfação, relacionamento e financeiro. Isso permite descobrir riscos silenciosos: clientes que continuam acessando e pagando, mas abandonaram uma função crítica do produto.

Para outros segmentos, a empresa envia uma planilha em Excel ou CSV. A inteligência artificial interpreta a estrutura, conversa com o usuário para entender o contexto, confirma quais métricas são importantes e transforma os dados em uma configuração reutilizável.

A inteligência artificial não inventa o risco. Ela entende, organiza e explica. Um motor analítico separado calcula tendências, deteriorações, anomalias e, quando houver histórico suficiente, padrões anteriores às saídas.

---

## 2. Problema

Cada organização registra seu relacionamento com clientes, usuários, alunos, assinantes, contratos ou unidades de maneira diferente. Os nomes das colunas, os períodos, as métricas e até o significado de risco variam.

Uma empresa de software pode acompanhar:

- utilização de funcionalidades;
- NPS e satisfação;
- chamados e cumprimento de SLA;
- reuniões de acompanhamento;
- pagamentos e renovação contratual.

Uma instituição de ensino pode acompanhar:

- frequência;
- acessos ao ambiente virtual;
- notas;
- participação;
- situação financeira.

Uma indústria pode acompanhar:

- produção;
- falhas;
- paradas;
- manutenção;
- utilização de equipamentos.

Uma solução fixa, construída somente para um conjunto de colunas, possui pouca utilidade fora de seu cenário original. Ao mesmo tempo, uma análise genérica demais pode ignorar o conhecimento de negócio que define o que realmente representa perda de valor.

O desafio é construir uma plataforma capaz de compreender os dados de cada empresa sem perder explicabilidade, consistência e controle humano.

---

## 3. Proposta de valor

A plataforma responde quatro perguntas principais:

1. **Quem ou o que precisa de atenção?**
2. **Quais sinais justificam essa atenção?**
3. **Onde o valor está deixando de ser percebido?**
4. **Qual impacto financeiro pode estar associado ao problema?**

Sua proposta pode ser resumida da seguinte forma:

> Identificar sinais visíveis e silenciosos de perda de valor, explicar suas causas e transformar dados diferentes em decisões de acompanhamento.

A solução não se limita a cancelamento. O evento relevante pode representar:

- churn;
- evasão;
- desistência;
- não renovação;
- abandono;
- encerramento de contrato;
- inatividade;
- parada operacional;
- qualquer outro evento definido pela organização.

---

## 4. Visão geral da solução

```text
                           EMPRESA
                              |
                 Qual é o objetivo da análise?
                              |
          +-------------------+--------------------+
          |                                        |
  EMPRESA DE TECNOLOGIA                    OUTROS SEGMENTOS
  Modo contínuo                            Modo adaptativo
          |                                        |
  Tracking de funcionalidades              Upload de Excel ou CSV
  CRM, suporte e financeiro                Interpretação pela IA
  Satisfação e relacionamento              Confirmação das métricas
  Histórico de cancelamento                Templates reutilizáveis
          |                                        |
          +-------------------+--------------------+
                              |
                   MODELO UNIVERSAL DE DADOS
                              |
                     MOTOR DE ANÁLISE
                              |
          Saúde + sinais + evidências + impacto
                              |
             Dashboard + explicação + ação humana
```

Os dois modos compartilham o mesmo modelo conceitual. O que muda é a forma como os dados entram e a frequência de atualização.

---

## 5. Tecnologia como núcleo inovador

Empresas de tecnologia representam o principal caso de uso e o diferencial mais inovador da proposta.

### 5.1 Tracking não é suficiente sozinho

O sistema não considera apenas login ou quantidade de acessos. Ele combina:

- eventos de utilização;
- funções acessadas;
- processos iniciados, concluídos ou abandonados;
- erros e falhas de integração;
- contrato, plano e receita;
- chamados e SLA;
- NPS, CSAT e comentários;
- reuniões e relacionamento;
- atrasos e situação financeira;
- proximidade da renovação;
- histórico de cancelamentos.

### 5.2 Perda silenciosa de valor

O principal diferencial é identificar um problema localizado antes que ele afete a saúde geral da conta.

```text
Cliente continua acessando
          +
Contrato e pagamentos normais
          +
Indicadores gerais aparentemente saudáveis
          +
Abandono de uma funcionalidade crítica
          |
          v
Perda silenciosa de valor
          |
          v
Oportunidade de acompanhamento antes do cancelamento
```

### 5.3 Exemplo

> A Atlas Logística continua acessando o sistema, utilizando relatórios e pagando normalmente. Entretanto, as pesagens concluídas caíram 68% em quatro semanas e duas unidades estão sem atividade. Como a pesagem é uma funcionalidade central do contrato, existe um sinal emergente que merece investigação.

Esse caso não deve ser apresentado imediatamente como cancelamento provável. A classificação mais adequada é:

> **Risco emergente em funcionalidade crítica.**

### 5.4 Eventos mínimos

Cada ativação relevante pode enviar um evento funcional:

```json
{
  "empresaId": "atlas-logistica",
  "produtoId": "gestao-logistica",
  "unidadeId": "campinas",
  "funcionalidade": "pesagem",
  "evento": "processo_concluido",
  "data": "2026-09-19T14:30:00Z"
}
```

Eventos possíveis:

- funcionalidade visualizada;
- processo iniciado;
- processo concluído;
- processo abandonado;
- erro encontrado;
- integração executada;
- relatório gerado;
- configuração ativada.

O objetivo não é registrar todos os cliques. O tracking deve capturar apenas eventos que representem entrega ou perda de valor.

---

## 6. Modo adaptativo para outros segmentos

Quando a empresa não possui um produto digital instrumentado, a principal entrada pode ser uma planilha.

```text
Upload dos dados
       |
IA identifica colunas, tipos e períodos
       |
IA apresenta sua interpretação
       |
Usuário confirma ou corrige
       |
Sistema cria a configuração
       |
Motor executa a análise
       |
Dashboard, explicações e relatório
       |
Configuração é salva como template
```

Exemplos de adaptação:

| Segmento | Entidade analisada | Possíveis dados | Evento relevante |
|---|---|---|---|
| Tecnologia | Cliente ou conta | Uso, NPS, chamados, receita | Cancelamento |
| Educação | Aluno | Frequência, acessos, notas, financeiro | Evasão |
| Academia | Aluno | Check-ins, plano, pagamentos | Não renovação |
| Indústria | Máquina ou unidade | Produção, falhas, manutenção | Parada |
| Serviços | Contrato | Entregas, reuniões, reclamações | Encerramento |
| Plataforma digital | Usuário ou conta | Sessões, uso, engajamento | Inatividade |

---

## 7. Jornada de configuração assistida pela IA

A inteligência artificial funciona como uma consultora de dados e negócio.

### 7.1 Perguntas iniciais

- Qual é o segmento da empresa?
- Qual entidade será analisada?
- O que a empresa deseja evitar ou antecipar?
- Qual evento representa saída ou perda de valor?
- Quais fontes de dados estão disponíveis?
- Quais métricas são consideradas importantes?
- Existem períodos sazonais ou exceções?

### 7.2 Interpretação das colunas

Ao encontrar uma coluna chamada `NPS`, a IA pode sugerir que se trata de satisfação e que valores maiores normalmente são melhores.

Ao encontrar `dias_em_atraso`, pode sugerir que valores menores são melhores.

Ao encontrar `qtd_pesagens`, pode perguntar:

> “Uma redução nessa métrica representa perda de valor, sazonalidade ou mudança operacional?”

### 7.3 Confirmação

Antes de qualquer análise, o sistema apresenta uma configuração compreensível:

```text
Entidade monitorada: Cliente
Objetivo: Identificar perda de valor e risco de cancelamento

Indicadores principais:
[x] Utilização geral
[x] Funcionalidades críticas
[x] Chamados e SLA
[x] Satisfação
[x] Receita mensal
[x] Proximidade da renovação

Exceções:
[x] Operação reduzida em dezembro
[x] Algumas funcionalidades são opcionais
```

O usuário pode confirmar, corrigir ou ignorar uma métrica.

---

## 8. Modelo universal de dados e métricas

Depois do entendimento, cada coluna ou evento é convertido em uma descrição padronizada.

```json
{
  "nome": "pesagens_concluidas",
  "categoria": "utilizacao",
  "comportamento": "queda_representa_atencao",
  "importancia": "critica",
  "periodicidade": "mensal",
  "entidade": "cliente",
  "origem": "tracking",
  "unidade": "quantidade"
}
```

### 8.1 Tipos de comportamento

| Comportamento | Exemplo |
|---|---|
| Quanto maior, melhor | Satisfação ou entregas no prazo |
| Quanto menor, melhor | Dias de atraso ou falhas |
| Queda representa atenção | Uso, acessos ou frequência |
| Aumento representa atenção | Reclamações ou inadimplência |
| Faixa saudável | Valores extremos podem ser prejudiciais |
| Ausência representa atenção | Falta de reunião ou atividade esperada |
| Aprender pelo histórico | Relação ainda desconhecida pela empresa |

### 8.2 Entidades conceituais

- `Empresa`
- `EntidadeMonitorada`
- `Produto`
- `Funcionalidade`
- `EventoDeUso`
- `MetricaDeNegocio`
- `ConfiguracaoDeAnalise`
- `SinalDeAtencao`
- `Evidencia`
- `ImpactoFinanceiro`
- `AcaoSugerida`
- `Template`

---

## 9. Motor de análise

A inteligência artificial entende e explica. O motor analítico calcula.

### 9.1 Com histórico de saída

Quando existem registros de cancelamento, evasão ou não renovação, o sistema pode comparar clientes que permaneceram com clientes que saíram.

O motor observa padrões anteriores ao evento e procura sinais semelhantes nas entidades atuais.

Uma probabilidade só deve ser exibida quando o modelo possuir dados suficientes, validação e qualidade adequadas.

### 9.2 Sem histórico de saída

Quando não existe histórico, a plataforma continua útil por meio da detecção de:

- deterioração;
- anomalias;
- quedas consecutivas;
- crescimento de problemas;
- mudança brusca de comportamento;
- afastamento do padrão habitual;
- ausência de atividade esperada;
- abandono de dimensão importante.

Nesse cenário, o resultado é apresentado como **indicador de atenção ou saúde**, e não como probabilidade de cancelamento.

### 9.3 Evidências

Cada sinal deve registrar:

- o que mudou;
- quando mudou;
- intensidade da mudança;
- comparação utilizada;
- dimensão afetada;
- relevância definida pela empresa;
- dados que sustentam a conclusão;
- limitações da análise.

---

## 10. Saúde geral, saúde por dimensão e sinais emergentes

A solução separa três conceitos que não devem ser confundidos.

### 10.1 Saúde geral

Representa a situação consolidada da entidade:

- saudável;
- atenção;
- risco elevado.

### 10.2 Saúde por dimensão

```text
Atlas Logística
|
+-- Financeiro: saudável
+-- Relacionamento: saudável
+-- Atendimento: atenção
+-- Utilização geral: saudável
+-- Funcionalidades
    +-- Login: saudável
    +-- Relatórios: saudável
    +-- Integração ERP: atenção
    +-- Pesagem: crítico
```

### 10.3 Sinais emergentes

Um sinal emergente é relevante, mas ainda não deteriorou a saúde geral.

Exemplo:

> “A conta permanece saudável, porém uma funcionalidade crítica perdeu 68% de utilização nas últimas quatro semanas.”

Essa separação impede que uma média geral esconda um problema localizado.

---

## 11. Impacto financeiro

O dashboard deve traduzir sinais operacionais em linguagem executiva.

### 11.1 Indicadores

- clientes ou entidades exigindo atenção;
- receita mensal associada aos sinais;
- receita anual associada;
- receita vinculada a sinais críticos;
- receita de clientes saudáveis com riscos emergentes;
- receita distribuída por produto, função ou causa.

Exemplo demonstrativo:

```text
8 clientes exigindo atenção
R$ 208,5 mil de receita mensal potencialmente exposta
R$ 2,5 milhões de receita anual associada
R$ 68 mil vinculados a clientes saudáveis com sinais emergentes
```

### 11.2 Terminologia

Utilizar:

- receita potencialmente exposta;
- faturamento associado aos sinais;
- impacto financeiro possível;
- cenário simulado;
- oportunidade de retenção.

Evitar:

- receita que será perdida;
- cliente que certamente cancelará;
- valor garantido de recuperação;
- previsão de perda sem modelo validado.

### 11.3 Cenários simulados

| Cenário | Parcela da receita exposta | Impacto mensal demonstrativo |
|---|---:|---:|
| Moderado | 20% | R$ 41,7 mil |
| Relevante | 50% | R$ 104,2 mil |
| Exposição máxima | 100% | R$ 208,5 mil |

Os percentuais são hipóteses de simulação e devem ser identificados claramente como tal.

---

## 12. Dashboard executivo

A primeira tela deve responder:

> **Onde estamos deixando de entregar valor e qual pode ser o impacto?**

### 12.1 Indicadores superiores

- entidades analisadas;
- casos exigindo atenção;
- sinais críticos;
- riscos silenciosos;
- receita potencialmente exposta;
- qualidade dos dados.

### 12.2 Visualizações

- evolução da saúde da carteira;
- receita exposta ao longo do tempo;
- distribuição dos sinais por categoria;
- funcionalidades com maior perda de utilização;
- impacto por produto ou segmento;
- qualidade e completude dos dados;
- eventos recentes relevantes.

### 12.3 Ranking explicável

| Entidade | Saúde geral | Sinal principal | Dimensão | Impacto | Evidência |
|---|---|---|---|---:|---|
| Atlas Logística | Saudável | Crítico | Pesagem | R$ 32 mil | Queda de 68% |
| Indústria Orion | Risco | Recorrente | Integração ERP | R$ 42 mil | Sete falhas |
| Varejo Nova | Atenção | Moderado | Dashboards | R$ 18,5 mil | 21 dias sem uso |

O ranking não deve mostrar somente uma posição ou um score. Cada item precisa apresentar sua principal evidência.

---

## 13. Detalhamento individual

Ao abrir uma entidade, o usuário encontra:

- identificação e contexto;
- saúde geral;
- saúde por dimensão;
- receita mensal e anual;
- resumo explicável;
- evolução das métricas;
- funcionalidades monitoradas;
- eventos relevantes;
- histórico de sinais;
- qualidade dos dados;
- impacto financeiro associado;
- ações sugeridas;
- exceções registradas.

Exemplo de resumo:

> Atlas permanece saudável no uso geral e no financeiro. Entretanto, as pesagens concluídas caíram 68% em quatro semanas e duas unidades estão sem atividade. Como a pesagem é considerada crítica para o contrato, recomenda-se investigar mudança operacional, dificuldade técnica ou necessidade ainda não atendida.

O usuário pode conversar com a IA:

- Por que esta entidade aparece no ranking?
- Qual indicador mais influenciou o alerta?
- O que mudou nos últimos três meses?
- O que aconteceria se uma métrica fosse ignorada?
- Qual receita está associada ao sinal?
- Qual abordagem seria mais adequada?

---

## 14. Recomendações e acompanhamento humano

O sistema não deve contatar automaticamente uma pessoa apenas porque detectou uma queda.

```text
Sinal identificado
       |
Sistema apresenta evidências e contexto
       |
Responsável valida a situação
       |
Decide se deve agir
       |
Realiza contato consultivo
       |
Registra o resultado
```

Uma abordagem inadequada seria:

> “Percebemos que vocês pararam de usar a funcionalidade.”

Uma abordagem consultiva seria:

> “Gostaríamos de entender se a funcionalidade de pesagem continua atendendo ao processo de vocês. Houve alguma mudança operacional ou existe algo que poderíamos melhorar?”

Possíveis resultados do acompanhamento:

- sazonalidade confirmada;
- mudança no processo;
- dificuldade técnica;
- necessidade de treinamento;
- funcionalidade insuficiente;
- dado incorreto;
- oportunidade resolvida;
- acompanhamento futuro.

Esse retorno pode melhorar as configurações e análises posteriores.

---

## 15. Privacidade, transparência e governança

O objetivo é monitorar a entrega de valor, não vigiar pessoas.

Priorizar:

```text
Empresa -> Unidade -> Produto -> Funcionalidade -> Evento
```

Evitar, quando não for necessário:

```text
Funcionário -> Todos os cliques -> Comportamento individual
```

### 15.1 Princípios

- coletar somente dados necessários;
- declarar a finalidade da coleta;
- utilizar informações agregadas sempre que possível;
- evitar textos digitados, gravações de tela e conteúdo desnecessário;
- controlar acesso por perfil;
- definir prazo de retenção;
- registrar alterações e consultas relevantes;
- separar os dados de cada organização;
- permitir anonimização ou pseudonimização;
- manter participação humana nas decisões.

### 15.2 Transparência

A organização deve conseguir informar:

- quais eventos são coletados;
- por que são coletados;
- como são utilizados;
- quem pode visualizá-los;
- por quanto tempo são mantidos;
- quais mecanismos de controle estão disponíveis.

A implementação real deve ser validada pelo responsável jurídico ou encarregado de proteção de dados da organização.

---

## 16. Templates reutilizáveis

Após a primeira configuração, o usuário pode salvar um template.

```text
Primeira análise
       |
Configuração confirmada
       |
Salvar template e versão
       |
Novo período ou nova planilha
       |
Validar compatibilidade
       |
Reutilizar configuração
```

O template armazena:

- entidade monitorada;
- coluna identificadora;
- coluna de data ou período;
- evento de saída;
- significado das métricas;
- comportamento esperado;
- importância das métricas;
- funcionalidades críticas;
- regras e exceções;
- configurações da análise;
- versão utilizada.

Em novos envios, a plataforma verifica:

- colunas novas;
- colunas ausentes;
- tipos incompatíveis;
- mudanças de período;
- alterações relevantes na estrutura;
- perda de qualidade dos dados.

---

## 17. Arquitetura conceitual

```text
Tracking de produto ----+
CRM --------------------|
Suporte ----------------|
Financeiro -------------+----> Camada de ingestão
NPS --------------------|              |
Planilhas --------------+              v
                                  Validação dos dados
                                         |
                                         v
                              Interpretação e configuração
                                         |
                                         v
                               Modelo universal de métricas
                                         |
                                         v
                                  Motor de análise
                              +----------+-----------+
                              |                      |
                       Com histórico          Sem histórico
                       Padrões de saída        Anomalias e deterioração
                              |                      |
                              +----------+-----------+
                                         |
                                         v
                           Sinais + evidências + impacto
                                         |
                                         v
                              Dashboard + assistente IA
```

### 17.1 Componentes principais

1. **Camada de ingestão:** recebe eventos, integrações e arquivos.
2. **Validação:** verifica estrutura, tipos, períodos e qualidade.
3. **Camada de IA:** interpreta colunas, conversa e produz configuração.
4. **Modelo universal:** padroniza entidades, métricas e comportamentos.
5. **Motor de análise:** identifica mudanças e padrões.
6. **Camada explicativa:** transforma resultados em evidências compreensíveis.
7. **Camada financeira:** relaciona sinais e receita.
8. **Dashboard:** apresenta visão executiva e detalhamento.
9. **Governança:** controla acesso, versões e rastreabilidade.

---

## 18. Escopo do MVP

O protótipo do hackathon deve provar a proposta sem tentar construir toda a infraestrutura de produção.

### 18.1 Funcionalidades do MVP

- onboarding com escolha do segmento;
- experiência principal para empresa de tecnologia;
- upload demonstrativo de planilha;
- conversa guiada com IA ou fluxo simulado;
- confirmação das métricas;
- dashboard com dados demonstrativos;
- saúde geral e saúde por funcionalidade;
- sinais emergentes;
- receita potencialmente exposta;
- ranking explicável;
- detalhamento da Atlas Logística;
- exemplo de template salvo;
- indicação clara de dados e scores demonstrativos.

### 18.2 Fora do MVP

- ingestão real em alta escala;
- treinamento automático de modelos por cliente;
- envio automático de mensagens;
- cobrança e gestão de planos;
- integrações completas com todos os CRMs;
- decisões automatizadas sem validação humana;
- alegação de probabilidade real sem validação.

---

## 19. Demonstração para o hackathon

### Cena 1 - Impacto executivo

O dashboard mostra:

> “Existem oito clientes exigindo atenção, associados a R$ 208,5 mil de receita mensal.”

### Cena 2 - Risco silencioso

O apresentador abre a Atlas Logística, considerada saudável na visão geral.

O sistema revela:

> “As pesagens concluídas caíram 68% e duas unidades estão sem atividade.”

### Cena 3 - Explicação

A IA explica que login, pagamentos e relatórios permanecem estáveis, mas uma funcionalidade crítica perdeu utilização.

### Cena 4 - Ação humana

O sistema sugere investigar mudança operacional, dificuldade técnica, necessidade de treinamento ou lacuna de produto.

### Cena 5 - Adaptação

O apresentador retorna ao onboarding e envia uma planilha de outro segmento.

A IA interpreta as colunas, pergunta o significado de uma métrica, recebe a confirmação e gera uma nova configuração.

### Cena 6 - Reutilização

A configuração é salva como template para o próximo período.

### Encerramento

> “Nossa plataforma não espera o cliente cancelar para descobrir que ele deixou de perceber valor. Ela entende os dados de cada empresa, identifica sinais visíveis e silenciosos e mostra onde agir e quanto da receita pode estar exposto.”

---

## 20. Diferenciais da proposta

### 20.1 Tecnologia como protagonista

Une dados empresariais ao uso detalhado das funcionalidades.

### 20.2 Detecção de perda silenciosa

Encontra problemas localizados mesmo quando a conta ainda parece saudável.

### 20.3 Adaptação ao contexto

A plataforma aprende como cada organização trabalha, em vez de exigir as mesmas métricas de todas.

### 20.4 Separação entre IA e cálculo

A IA entende e explica; o motor analítico calcula.

### 20.5 Explicabilidade

Cada alerta apresenta evidências, contexto e limitações.

### 20.6 Impacto financeiro

Traduz sinais técnicos e operacionais em receita potencialmente exposta.

### 20.7 Utilidade sem histórico

Funciona inicialmente com anomalias e deteriorações, evoluindo quando houver dados de saída suficientes.

### 20.8 Privacidade por padrão

Prioriza organizações, unidades e funções, evitando vigilância individual desnecessária.

---

## 21. Limitações e evolução futura

### Limitações iniciais

- análises dependem da qualidade dos dados;
- correlação não significa causalidade;
- sinais exigem validação de contexto;
- sazonalidade pode produzir alertas indevidos;
- simulações financeiras não representam perdas garantidas;
- scores demonstrativos não devem ser apresentados como modelos validados.

### Evoluções futuras

- conectores com CRM, suporte e financeiro;
- SDK de tracking para produtos digitais;
- aprendizado com resultados dos acompanhamentos;
- calibração dos modelos por segmento;
- monitoramento de mudança na distribuição dos dados;
- comparação entre versões dos templates;
- alertas configuráveis;
- relatórios executivos recorrentes;
- avaliação de qualidade e confiança do modelo;
- experimentos para medir recuperação de utilização.

---

## 22. Conclusão

A solução consolidada combina dois pontos fortes.

O primeiro é a análise contínua e aprofundada para empresas de tecnologia, capaz de relacionar dados de negócio ao uso de cada funcionalidade e revelar perda silenciosa de valor.

O segundo é uma camada adaptativa que interpreta planilhas e métricas de diferentes organizações, permitindo aplicar o mesmo conceito a cancelamento, evasão, desistência, não renovação, abandono ou outros eventos relevantes.

O resultado não é apenas um preditor de churn. É uma plataforma de inteligência de risco e valor que:

- entende o contexto da empresa;
- transforma dados diferentes em uma configuração padronizada;
- identifica sinais visíveis e emergentes;
- explica por que cada alerta foi criado;
- relaciona os sinais ao impacto financeiro;
- preserva a decisão humana;
- adapta-se a diferentes setores.

> **A plataforma identifica onde o valor está desaparecendo antes que o relacionamento termine.**

---

## Referências conceituais

- Autoridade Nacional de Proteção de Dados. *Guia Orientativo: Hipóteses Legais de Tratamento de Dados Pessoais - Legítimo Interesse*. Disponível em: <https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse>.
- Lei nº 13.709/2018 - Lei Geral de Proteção de Dados Pessoais.
- Documento-base: *Plataforma Genérica de Análise de Risco - Documento Conceitual*.

