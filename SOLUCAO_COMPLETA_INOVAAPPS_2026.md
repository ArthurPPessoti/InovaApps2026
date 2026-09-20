# INOVAAPPS 2026

## Plataforma adaptativa de predição, retenção e gestão de clientes

**Documento completo da solução para o Desafio INOVAAPPS 2026**  
**Versão:** 1.0  
**Data:** 20 de setembro de 2026

> O INOVAAPPS não é apenas um dashboard. É uma plataforma de inteligência de clientes que conecta dados, identifica antecipadamente riscos de perda de valor, explica cada alerta e transforma a previsão em trabalho organizado para a equipe.

---

## Aviso sobre o conteúdo jurídico

Este documento apresenta uma proposta técnica e de governança baseada na legislação brasileira vigente e em orientações oficiais da Autoridade Nacional de Proteção de Dados. Ele não substitui parecer jurídico. Antes da operação comercial, contratos, avisos de privacidade, bases legais e fluxos de dados devem ser revisados por profissionais jurídicos e de proteção de dados considerando o contexto concreto de cada empresa.

---

## Sumário

1. Resumo executivo
2. O problema do desafio
3. A tese da solução
4. Por que não é somente um dashboard
5. Quem utiliza a plataforma
6. Os dois modos de entrada
7. Jornada completa do usuário
8. Ingestão adaptativa de Excel e CSV
9. Assistente de inteligência artificial
10. Configuração e pesos de negócio
11. Motor matemático adaptativo
12. Modelo preditivo aplicado à base do hackathon
13. Explicabilidade e contexto individual
14. Empresa, produto, contrato e funcionalidade
15. Dashboard executivo e previsões
16. Gestão operacional e atuação humana
17. Cancelados, pesquisa e aprendizado
18. Conexões e tracking por HTTP
19. Privacidade sem sensação de vigilância
20. LGPD e validade jurídica das integrações
21. Estrutura contratual recomendada
22. Arquitetura técnica para produção
23. Segurança, isolamento e auditoria
24. Monitoramento e governança dos modelos
25. Produto, escalabilidade e modelo de negócio
26. Demonstração para o hackathon
27. Estado atual, simulações e evolução
28. Roadmap de implementação
29. Indicadores de sucesso
30. Riscos e medidas de mitigação
31. Conclusão
32. Glossário
33. Apêndices técnicos

---

# 1. Resumo executivo

O desafio apresentado pela Globalsys pergunta como identificar, entre os clientes ainda ativos, quais estão próximos de cancelar ou sofrendo degradação antes que eles avisem, explicando a evidência que sustenta o alerta e indicando o que deve ser feito.

O INOVAAPPS resolve esse problema por meio de um ciclo completo:

```text
Dados da empresa
      ↓
Entendimento automático da fonte
      ↓
Configuração confirmada pelo negócio
      ↓
Score de risco ou probabilidade preditiva
      ↓
Explicação individual e impacto financeiro
      ↓
Priorização, delegação e contato humano
      ↓
Registro do resultado e aprendizado contínuo
```

A plataforma atende duas realidades:

- **Empresa tecnológica:** combina base de clientes, contrato, suporte, financeiro, relacionamento e eventos de uso enviados pelas aplicações conectadas.
- **Empresa geral:** recebe Excel ou CSV, entende a estrutura da base e adapta a análise ao comportamento que a empresa deseja antecipar, como cancelamento, não retorno, inadimplência, não renovação ou abandono.

Quando existe histórico suficiente e um desfecho confiável, a plataforma pode calcular uma **probabilidade estatística para um horizonte definido**. Quando os dados não sustentam essa afirmação, ela apresenta um **Score de Risco explicável**, baseado nas métricas e pesos confirmados pelo usuário. O sistema não transforma automaticamente um score em probabilidade.

O resultado não termina em um número. O produto mostra:

- quem merece atenção;
- por que merece atenção;
- quanto valor está exposto;
- o que pode acontecer no horizonte analisado;
- como abordar o cliente sem expor monitoramento interno;
- quem da equipe é responsável;
- qual ação foi executada;
- qual foi o resultado da intervenção;
- o que os cancelamentos anteriores ensinam sobre a carteira ativa.

Essa integração entre **predição, explicabilidade, gestão e conexão contínua de dados** é o núcleo do produto.

---

# 2. O problema do desafio

## 2.1 Situação apresentada

A carteira fornecida contém 80 clientes, histórico mensal de janeiro de 2025 a junho de 2026 e 22 cancelamentos. Permanecem 58 clientes ativos. Os dados incluem contrato, receita, atendimento, SLA, uso, reuniões, pagamentos e satisfação.

O problema não é simplesmente falta de informação. Os sinais existem, mas estão distribuídos em relatórios diferentes e costumam ser analisados somente depois que o cliente já decidiu sair.

Os principais efeitos do modelo reativo são:

- perda de receita recorrente que poderia ser protegida;
- descoberta tardia da insatisfação;
- atenção concentrada apenas em quem reclama;
- clientes silenciosos e em deterioração ignorados;
- contratos de valores diferentes tratados com a mesma prioridade;
- conhecimento dependente da memória de cada responsável;
- ausência de aprendizado estruturado a partir dos cancelamentos.

## 2.2 Perguntas que a solução precisa responder

A pessoa responsável pela carteira deve conseguir responder rapidamente:

1. Com quais clientes falar?
2. Por que cada cliente foi priorizado?
3. Em que ordem a equipe deve atuar?
4. Quanto de receita está exposto?
5. Qual sinal apareceu e com quanta antecedência?
6. O sinal separa bem quem cancela de quem permanece?
7. Qual ação é coerente com a evidência observada?
8. O time está realmente tratando os casos identificados?

## 2.3 O erro que a solução evita

Um cliente pode parecer saudável no agregado e, ao mesmo tempo, estar abandonando uma funcionalidade essencial. Da mesma forma, um cliente pode acessar o sistema regularmente, mas enfrentar SLA ruim, chamados críticos ou redução de valor percebido.

Por isso, o INOVAAPPS não usa uma única métrica e não interpreta login como sinônimo de satisfação. A leitura combina comportamento, atendimento, relacionamento, contrato, financeiro e contexto.

---

# 3. A tese da solução

## 3.1 Da previsão à ação

Uma previsão sem ação é apenas um relatório. Uma ação sem evidência depende de intuição. O produto combina as duas partes:

```text
INTELIGÊNCIA
detectar + estimar + explicar

            ↓

GESTÃO
priorizar + delegar + abordar + acompanhar

            ↓

APRENDIZADO
registrar resultado + comparar + recalibrar
```

## 3.2 Proposta de valor

> Antecipar perda de valor e transformar sinais dispersos em uma fila explicável de atuação humana.

O sistema ajuda empresas a:

- reduzir descoberta tardia de cancelamentos;
- proteger receita recorrente;
- identificar riscos silenciosos;
- concentrar a equipe onde existe maior impacto esperado;
- padronizar o acompanhamento sem eliminar o julgamento humano;
- adaptar a análise a bases diferentes;
- registrar o resultado das intervenções;
- aprender com clientes que cancelaram;
- conectar produtos digitais diretamente à inteligência de retenção.

## 3.3 Unidade central: valor percebido

O cancelamento é uma consequência. Antes dele, costuma ocorrer perda de valor percebido. Essa perda pode aparecer como:

- redução de uso;
- abandono de uma função crítica;
- piora no atendimento;
- chamados reincidentes;
- reuniões não realizadas;
- queda ou ausência de satisfação;
- atrasos financeiros;
- falhas de integração;
- redução de frequência de compra ou retorno;
- menor engajamento com um serviço.

O produto procura esses sinais antes que a decisão se torne irreversível.

---

# 4. Por que não é somente um dashboard

Um dashboard apenas exibe informações. O INOVAAPPS forma uma cadeia operacional completa.

| Camada | Função |
|---|---|
| Entrada | Receber planilhas, APIs, eventos de aplicações e outras fontes |
| Interpretação | Entender entidades, colunas, períodos, relações e qualidade |
| Configuração | Confirmar objetivo, pesos, regras, horizonte e população |
| Matemática | Escolher entre score explicável e probabilidade preditiva |
| Explicação | Mostrar fatores de risco, proteção, cobertura e limitações |
| Previsão | Projetar comportamento e impacto financeiro dentro do suporte dos dados |
| Gestão | Criar, delegar e acompanhar ações de retenção |
| Comunicação | Preparar abordagem e mensagem para revisão humana |
| Aprendizado | Coletar feedback de cancelados e resultados das intervenções |
| Governança | Versionar fontes, configurações, modelos, acessos e decisões |

A interface é a parte visível. O produto real é o ciclo que conecta dados, decisão e execução.

---

# 5. Quem utiliza a plataforma

## 5.1 Organização usuária

Cada empresa que contrata a plataforma possui um ambiente isolado, chamado tenant. Os dados de uma organização não podem ser acessados por outra.

## 5.2 Entidade analisada

A entidade analisada não precisa ser sempre uma “empresa cliente”. Ela pode ser:

- cliente contratual;
- conta;
- consumidor;
- aluno;
- paciente;
- assinante;
- loja;
- contrato;
- produto contratado;
- unidade operacional.

O usuário confirma essa definição durante a configuração.

## 5.3 Perfis de usuário

| Perfil | Responsabilidade principal |
|---|---|
| Administrador | Organização, usuários, segurança, fontes e configurações publicadas |
| Gestor | Carteira, prioridades, responsáveis, ações e resultados |
| Customer Success/Relacionamento | Casos atribuídos, evidências, contato e acompanhamento |
| Analista | Dados, configuração, qualidade, modelos e relatórios |
| Integrador | Aplicações, credenciais, eventos e saúde das conexões |
| Leitor/Executivo | Indicadores consolidados sem permissão de alteração |

## 5.4 Quem acessa Conexões

Na conta tecnológica, o acesso recomendado é:

- Administrador: configuração completa;
- Integrador: aplicações, credenciais e eventos;
- Gestor: status e resultados agregados;
- Analista: qualidade e metadados;
- Customer Success: sinais relacionados aos clientes, sem visualizar segredos;
- Executivo: apenas indicadores consolidados.

Credenciais nunca devem ser exibidas novamente depois da criação. O navegador não deve receber a credencial usada por uma aplicação externa.

---

# 6. Os dois modos de entrada

## 6.1 Conta tecnológica

A conta tecnológica utiliza os clientes reais da fonte principal e pode acrescentar telemetria de aplicações conectadas.

Fontes possíveis:

- planilha ou banco de clientes;
- contratos e receita;
- CRM;
- atendimento e SLA;
- NPS e pesquisas;
- financeiro;
- eventos de uso de produto;
- status de integrações;
- reuniões e atividades de relacionamento.

No ambiente demonstrativo, a base real do desafio é enriquecida com eventos simulados como se as aplicações já estivessem conectadas. Isso permite demonstrar o ganho futuro sem afirmar que a Globalsys já coleta esses eventos em produção.

## 6.2 Conta geral

A conta geral utiliza somente os dados enviados pela empresa. A plataforma não presume que exista software próprio nem mostra tracking se essa capacidade não estiver presente.

Exemplos de objetivos:

- prever consumidores que não retornarão em 60 dias;
- identificar alunos com risco de não renovar;
- estimar clientes que podem ficar inadimplentes;
- priorizar contratos com risco de encerramento;
- detectar pacientes que deixaram de frequentar;
- identificar redução de recorrência em uma loja.

## 6.3 Uma plataforma, dois níveis de enriquecimento

```text
CONTA GERAL
dados próprios → análise adaptativa → gestão

CONTA TECNOLÓGICA
dados próprios + suporte + financeiro + telemetria → análise enriquecida → gestão
```

O tracking é um diferencial importante, mas não é a única fonte de verdade.

---

# 7. Jornada completa do usuário

## 7.1 Acesso e onboarding

1. Usuário entra ou cria uma conta.
2. Assistente pergunta segmento, produto, objetivo e fontes disponíveis.
3. A conta é classificada como geral ou tecnológica.
4. A navegação e os módulos são adaptados ao perfil.

## 7.2 Preparação da análise

1. Usuário envia Excel ou CSV.
2. Sistema lê todas as abas e perfila as colunas.
3. Relações entre abas são sugeridas.
4. Assistente propõe objetivos possíveis.
5. Usuário confirma entidade, comportamento e horizonte.
6. IA sugere papéis, métricas e importância.
7. Usuário ajusta por conversa, pills ou editor completo.
8. Configuração é validada.
9. Motor seleciona o método matemático adequado.

## 7.3 Uso diário

1. Dashboard apresenta impacto e prioridades.
2. Previsões mostram o que pode acontecer.
3. Cliente ou produto é aberto para explicação.
4. Gestor cria ou delega uma ação.
5. Responsável revisa uma abordagem sugerida.
6. Contato é realizado fora ou a partir do sistema.
7. Resultado é registrado.

## 7.4 Aprendizado

1. Novos dados são importados ou recebidos por API.
2. Configuração anterior é reaplicada.
3. Mudanças de estrutura são destacadas.
4. Resultado novo cria uma versão, sem apagar a anterior.
5. Desfechos reais permitem avaliar e atualizar o modelo.

---

# 8. Ingestão adaptativa de Excel e CSV

## 8.1 Problema resolvido

Empresas diferentes não usam os mesmos nomes, abas ou campos. Exigir uma planilha rígida reduziria o produto a um template específico do hackathon.

O perfilador genérico transforma uma fonte livre em uma descrição estruturada:

- arquivo e abas;
- quantidade de linhas e período;
- tipos físicos e semânticos;
- cardinalidade e valores ausentes;
- possíveis identificadores;
- possíveis datas e desfechos;
- chaves equivalentes entre abas;
- valor de negócio, segmento, responsável e contato;
- qualidade, cobertura e alertas de privacidade.

## 8.2 Papéis semânticos

| Papel | Uso |
|---|---|
| `ENTITY_ID` | Identifica a entidade acompanhada |
| `TIME` | Ordena o histórico |
| `TARGET` | Define o desfecho que será previsto |
| `METRIC` | Participa da análise |
| `CONTEXT` | Explica e segmenta sem alterar o cálculo |
| `BUSINESS_VALUE` | Receita, ticket ou valor estratégico |
| `STATUS_FILTER` | Define a população analisada |
| `OWNER` | Responsável pela conta ou caso |
| `CONTACT` | Canal autorizado de contato |
| `IGNORE` | Campo não utilizado |

## 8.3 Relações entre abas

As chaves são sugeridas por:

- semelhança do nome;
- compatibilidade de tipo;
- sobreposição de valores;
- unicidade.

A sugestão precisa ser confirmada quando houver ambiguidade.

Cada aba é agregada para uma linha por entidade antes da junção. Essa regra evita multiplicação acidental de registros em relações muitos-para-muitos.

## 8.4 Reimportação

Ao receber uma nova versão da base, o sistema compara a assinatura estrutural e identifica:

- colunas novas;
- colunas removidas;
- nomes alterados;
- tipos alterados;
- perda da entidade ou alvo;
- redução de cobertura;
- novas relações possíveis.

A configuração anterior é reaplicada quando compatível. Mudanças críticas exigem confirmação.

---

# 9. Assistente de inteligência artificial

## 9.1 Papel correto da IA

A IA interpreta e conversa; ela não executa o cálculo final de forma livre.

```text
IA ou editor manual
        ↓
AnalysisConfig estruturado
        ↓
Validação determinística
        ↓
Motor matemático
```

Essa separação reduz alucinações e mantém o resultado reproduzível.

## 9.2 O que o assistente faz

- resume a estrutura da base;
- sugere até três objetivos possíveis;
- pergunta o comportamento que a empresa quer antecipar;
- explica quais colunas parecem relevantes;
- sugere significado, papel e importância;
- identifica possíveis métricas derivadas;
- alerta sobre redundância e vazamento do alvo;
- aponta divergência entre relevância histórica e importância declarada;
- ajuda a resolver relações entre abas;
- apresenta a configuração para aprovação.

## 9.3 Controle do usuário

O usuário pode:

- conversar em linguagem natural;
- selecionar a importância por pills;
- abrir o editor completo;
- incluir ou excluir métricas;
- alterar tipo de risco e agregação;
- usar importância qualitativa ou peso numérico;
- confirmar objetivo e horizonte;
- revisar tudo antes da execução.

## 9.4 Uso de Gemini

O protótipo possui integração de servidor com Gemini e fallback determinístico. A chave permanece no servidor. Respostas da IA precisam obedecer a um esquema estruturado; respostas inválidas são rejeitadas.

Amostras reais só devem ser enviadas após base legal, transparência e configuração contratual adequadas. Quando amostras forem necessárias, a política recomendada é:

- no máximo cinco linhas;
- mascarar e-mail, telefone, CPF/CNPJ e identificadores;
- preferir estatísticas e exemplos sintéticos;
- registrar finalidade e provedor;
- avaliar transferência internacional;
- permitir operação manual sem IA externa.

---

# 10. Configuração e pesos de negócio

## 10.1 AnalysisConfig

A configuração versionada registra:

- objetivo e comportamento-alvo;
- entidade e nome de exibição;
- horizonte;
- relações entre abas;
- filtros populacionais;
- métricas originais e derivadas;
- papel e significado das colunas;
- tipo de risco;
- agregação;
- escala;
- tratamento de ausentes;
- importância declarada;
- cobertura mínima;
- método selecionado;
- consentimentos e versão.

## 10.2 Importância simples

| Nível | Peso relativo |
|---|---:|
| Muito baixa | 1 |
| Baixa | 2 |
| Média | 4 |
| Alta | 7 |
| Crítica | 10 |

Os valores não precisam somar 100. Eles são normalizados internamente.

## 10.3 Peso de negócio não é probabilidade

Os pesos:

- afetam diretamente o Score de Risco;
- ajudam a selecionar e destacar métricas;
- podem alterar prioridade e recomendações;
- não alteram arbitrariamente uma probabilidade aprendida pelo histórico.

Quando existe modelo estatístico, a plataforma deve mostrar lado a lado:

- relevância aprendida pelos dados;
- importância declarada pelo negócio;
- possíveis divergências.

---

# 11. Motor matemático adaptativo

## 11.1 Escolha automática do método

O sistema utiliza o método mais rigoroso que os dados sustentam.

```text
Existe desfecho confiável, tempo, volume e teste superior ao baseline?
       ├── Sim → probabilidade preditiva
       └── Não → Score de Risco explicável
```

## 11.2 Score de Risco

Usado quando:

- não há histórico de desfecho;
- existe apenas uma fotografia atual;
- há poucos eventos positivos ou negativos;
- não é possível fazer validação temporal;
- o modelo não supera o baseline;
- a probabilidade não pode ser calibrada com segurança.

Tipos de métrica:

| Tipo | Interpretação |
|---|---|
| `HIGH_IS_RISK` | Quanto maior, maior o risco |
| `LOW_IS_RISK` | Quanto menor, maior o risco |
| `TARGET_RANGE` | Risco cresce fora da faixa saudável |
| `BINARY_RISK` | Cada estado recebe risco explícito |
| `CATEGORICAL_RISK` | Cada categoria recebe risco explícito |
| `TREND_RISK` | A direção recente define o risco |
| `INFORMATIONAL` | Contexto sem pontuação |

Fórmula:

```text
peso_normalizado_i = peso_i / soma dos pesos disponíveis

score = 100 × soma(risco_i × peso_i) / soma(pesos disponíveis)
```

Cada risco individual é limitado ao intervalo de 0 a 1.

## 11.3 Cobertura

```text
cobertura = soma dos pesos com dado observado / soma dos pesos configurados
```

Cobertura não é confiança estatística. Ela informa quanto da configuração pôde ser observado.

Valores imputados podem participar do cálculo, mas não aumentam artificialmente a cobertura.

Política recomendada:

| Cobertura | Tratamento |
|---|---|
| 70% a 100% | Uso normal |
| 40% a 69,99% | Exibir aviso de cobertura parcial |
| Abaixo de 40% | Marcar como Dados insuficientes e retirar da priorização automática |

## 11.4 Probabilidade preditiva

Requisitos recomendados:

- entidade e alvo confirmados;
- horizonte definido;
- pelo menos 50 entidades;
- no mínimo 20 eventos positivos e 20 negativos;
- dimensão temporal;
- validação e teste com exemplos das duas classes;
- Brier Score melhor que o baseline;
- discriminação mínima aceitável;
- ausência de vazamento temporal.

O método-base é regressão logística regularizada porque oferece:

- bom desempenho em amostras menores;
- interpretação dos fatores;
- estabilidade superior a modelos muito complexos em bases pequenas;
- probabilidade utilizável após validação e, quando necessário, calibração.

## 11.5 Probabilidade ao longo do tempo

Quando existem séries temporais e data do evento, uma evolução futura pode usar regressão logística em tempo discreto para estimar risco em 30, 60 ou 90 dias e uma curva de permanência.

Essa abordagem evita tratar todo cliente ainda ativo como negativo definitivo.

## 11.6 Impacto financeiro

Quando existe valor de negócio:

```text
impacto esperado = probabilidade × valor mensal
```

Para score não probabilístico, o produto deve usar a expressão “valor associado ao risco” ou “impacto relativo”, nunca “perda esperada” sem fundamentação estatística.

---

# 12. Modelo preditivo aplicado à base do hackathon

## 12.1 Dados utilizados

| Item | Valor |
|---|---:|
| Período observado | jan/2025 a jun/2026 |
| Clientes | 80 |
| Cancelados | 22 |
| Ativos analisados | 58 |
| Fotografias de treinamento | 952 |
| Horizonte | 90 dias |

## 12.2 Construção das fotografias mensais

Para cada cliente e mês, o pipeline reúne apenas informações conhecidas até aquela data:

- contrato, segmento, porte e plano;
- valor mensal e tempo de contrato;
- uso atual;
- chamados abertos, críticos e reabertos;
- SLA e tempo de resolução;
- reclamações formais;
- reuniões previstas e realizadas;
- atraso de pagamento;
- última resposta de NPS disponível até o mês;
- médias recentes e variações de três meses.

O alvo é marcado quando o cancelamento ocorre nos três meses seguintes à fotografia.

## 12.3 Prevenção de vazamento

- NPS posterior ao mês da fotografia não é utilizado.
- Cancelamentos posteriores definem o alvo, não uma variável explicativa.
- Clientes cancelados não geram fotografias após a saída.
- A separação de treino, validação e teste respeita o tempo.
- Pré-processamento é ajustado somente nos dados de treino correspondentes.

## 12.4 Pipeline atual

```text
numéricos → imputação por mediana + indicador de ausência + padronização
categóricos → imputação + one-hot encoding
modelo → regressão logística regularizada
seleção de C → janela de validação
avaliação → janela temporal independente
```

O hiperparâmetro selecionado na execução atual foi `C = 0,05`.

## 12.5 Divisão temporal

- Treino: até setembro de 2025.
- Validação: outubro a dezembro de 2025.
- Teste: janeiro a março de 2026.
- Predição atual: clientes ativos observados até junho de 2026.

## 12.6 Resultado da execução atual

| Métrica | Resultado |
|---|---:|
| ROC AUC | 0,9359 |
| PR AUC | 0,7106 |
| Brier Score | 0,0464 |
| Precisão no Top 10 | 80,0% |
| Recall no Top 10 | 72,7% |
| Lift no Top 10 | 5,02× |
| Receita de positivos capturada no Top 10 | 74,6% |

Esses resultados pertencem ao recorte temporal interno da base entregue. Eles demonstram viabilidade técnica, mas não são garantia de desempenho em outra empresa ou em produção. O modelo precisa ser monitorado, revalidado e comparado a baselines em novas bases.

## 12.7 Carteira ativa calculada

| Indicador | Resultado atual |
|---|---:|
| Clientes analisados | 58 |
| Receita mensal total | R$ 707.998 |
| MRR esperado em risco | R$ 38.159,06 |
| Risco alto | 3 clientes |
| Atenção | 3 clientes |
| Baixo | 52 clientes |

As previsões são geradas pelo pipeline a partir da planilha, não digitadas manualmente no dashboard.

## 12.8 Interpretação responsável

Uma probabilidade de 25,4% em 90 dias significa que, segundo o modelo e os padrões históricos disponíveis, o caso recebeu essa estimativa para o horizonte informado. Não significa certeza, causa comprovada ou autorização para uma decisão automática prejudicial.

---

# 13. Explicabilidade e contexto individual

Cada cliente ou produto possui uma página explicável com:

- comportamento previsto e horizonte;
- método utilizado;
- probabilidade ou score;
- faixa operacional;
- receita e impacto esperado, quando disponíveis;
- cobertura dos dados;
- fatores que aumentaram o risco;
- fatores de proteção;
- valores observados;
- comparação com carteira e pares;
- evolução temporal;
- sinais contraditórios;
- dados ausentes;
- origem da informação;
- limitações;
- ações coerentes com as evidências;
- estratégia de contato.

## 13.1 Contribuições locais

Na regressão logística, o sistema transforma os dados na mesma representação usada pelo modelo e calcula a contribuição local de cada variável. Isso permite mostrar por que o resultado daquele cliente é diferente, sem depender somente de uma importância global.

## 13.2 Linguagem simples

Os gráficos são organizados por perguntas:

- Este cliente está mais em risco que os demais?
- Quais dados mais pesaram?
- O uso está caindo?
- O que está faltando na fonte?
- O que pode acontecer?
- Existem casos historicamente parecidos?

## 13.3 O que dizer e o que não dizer

O sistema pode orientar o responsável a mencionar fatos verificáveis:

- redução de uso;
- SLA observado;
- chamado crítico;
- reunião não realizada;
- queda de frequência;
- atraso registrado.

Não deve orientar frases como:

> “Você tem 25,4% de chance de cancelar.”

Nem deve revelar monitoramento individual ou apresentar correlação como causalidade.

---

# 14. Empresa, produto, contrato e funcionalidade

## 14.1 Hierarquia

```text
Organização usuária
└── Cliente/empresa analisada
    ├── Produto ou contrato A
    │   ├── Funcionalidade 1
    │   └── Funcionalidade 2
    └── Produto ou contrato B
        └── Funcionalidade 3
```

Essa estrutura evita duplicar a empresa quando ela possui mais de um produto.

## 14.2 Visão por produto

Mostra:

- produto como título;
- empresa como contexto;
- receita do contrato;
- risco individual;
- criticidade;
- usuários ativos;
- funcionalidades e sinais.

## 14.3 Visão por empresa

Consolida:

- receita total;
- relacionamento geral;
- quantidade de produtos;
- produtos em risco;
- contribuição de cada produto;
- alerta de risco oculto.

## 14.4 Risco silencioso

Uma empresa pode parecer saudável porque um produto permanece estável, enquanto outro produto crítico sofre queda intensa. O sistema preserva essa informação e impede que a média esconda um risco relevante.

Cancelar um produto não significa automaticamente perder toda a empresa. Essa distinção é essencial para expansão, cross-sell e retenção parcial.

---

# 15. Dashboard executivo e previsões

## 15.1 Visão geral

Responde: **qual é o impacto e onde agir agora?**

- clientes analisados;
- clientes em atenção;
- risco alto ou crítico;
- receita exposta;
- distribuição do resultado;
- concentração por segmento;
- projeção financeira;
- matriz risco × valor;
- simulador de intervenção;
- ranking explicável.

## 15.2 Previsões

Responde: **se o comportamento continuar, o que pode acontecer?**

- receita recorrente projetada;
- cenários sem ação, esperado e com intervenção;
- migração prevista entre faixas;
- trajetória de risco;
- deterioração de indicadores;
- horizonte e limitações;
- qualidade do método.

Cenários com ação são simulações condicionais. Eles devem explicitar a taxa de recuperação assumida e não podem ser apresentados como efeito causal comprovado.

## 15.3 Composição adaptativa

Os componentes aparecem somente quando a fonte oferece capacidade suficiente:

| Capacidade | Módulo liberado |
|---|---|
| Valor financeiro | Impacto e receita exposta |
| Tempo | Evolução e tendências |
| Segmentos | Comparação por grupo |
| Desfecho histórico | Probabilidade e qualidade do modelo |
| Datas de evento | Curva por horizonte |
| Responsáveis | Carteira e delegação |
| Telemetria | Uso e funcionalidades |
| Contatos | Estratégia de canal |
| Baixa cobertura | Painel de dados faltantes |

Sem receita, o sistema não inventa MRR. Sem tempo, não mostra tendência. Sem desfecho, mostra score, não probabilidade.

---

# 16. Gestão operacional e atuação humana

## 16.1 Duas perguntas de gestão

A área de Gestão separa:

1. **Onde concentrar a atuação?**
2. **O time está agindo sobre os riscos?**

## 16.2 Fila de atuação

O ranking pode ser ordenado por:

- probabilidade;
- score;
- impacto financeiro;
- importância do negócio.

Não existe um composto oculto. A regra de prioridade deve ser visível.

## 16.3 Caso de retenção

Cada caso registra:

- cliente, empresa, produto ou contrato;
- responsável;
- título;
- prazo;
- etapa;
- observação;
- evidência de origem;
- histórico de alterações;
- resultado.

Etapas possíveis:

```text
detectado → contatado → ação em andamento → recuperado
```

## 16.4 Gráficos operacionais

- funil de retenção;
- carteira por responsável;
- mapa de calor empresa × produto;
- movimentação financeira mensal;
- saúde da carteira;
- renovações em 30, 60 e 90 dias;
- ações atrasadas, sem responsável ou sem plano.

## 16.5 Fechamento do ciclo

Registrar a intervenção é indispensável para distinguir:

- risco detectado;
- ação executada;
- desfecho observado;
- eventual recuperação;
- ausência de resposta.

Sem esse registro, o sistema prevê, mas não aprende se a operação funcionou.

---

# 17. Cancelados, pesquisa e aprendizado

## 17.1 Objetivo

Clientes cancelados não devem desaparecer da plataforma. Eles formam uma fonte de aprendizado para melhorar produto, serviço e modelo.

## 17.2 Experiência

A área reúne:

- data e motivo do cancelamento;
- receita perdida;
- produto ou contrato encerrado;
- sinais anteriores;
- histórico de relacionamento;
- status da pesquisa;
- resposta recebida;
- possibilidade de retorno;
- benefício oferecido.

## 17.3 Pesquisa de saída

Perguntas principais:

1. Qual foi o principal motivo?
2. O que estava faltando?
3. O que poderia ter evitado o cancelamento?
4. Existe possibilidade de voltar?
5. Deseja acrescentar algo?

A participação deve ser opcional, a finalidade precisa ser explicada e a resposta associada ao cliente somente sob fundamento jurídico adequado e transparência.

## 17.4 Benefício

Pode ser oferecido por participação, independentemente de a avaliação ser positiva ou negativa:

- consultoria gratuita;
- diagnóstico;
- crédito;
- benefício personalizado;
- nenhum benefício.

O benefício não deve condicionar o conteúdo da resposta.

## 17.5 Envio

O fluxo atual prepara assunto, mensagem e link, abre o Gmail ou usa `mailto:` e exige envio manual. Em produção, um serviço de e-mail poderia registrar entrega, abertura e resposta, desde que autorizado e contratado.

## 17.6 Aprendizado cruzado

Exemplo de insight:

> Dois cancelados citaram baixo valor percebido. Cinco clientes ativos apresentam sinais semelhantes.

Essa associação deve apresentar evidência e nunca afirmar causalidade sem validação.

---

# 18. Conexões e tracking por HTTP

## 18.1 Diferencial central

Para empresas tecnológicas, o produto pode receber sinais diretamente das aplicações. Assim, não depende somente de uma planilha atualizada no fim do mês.

Exemplos:

- login realizado;
- relatório gerado;
- pesagem concluída;
- integração sincronizada;
- consulta de estoque;
- automação executada;
- erro em fluxo crítico;
- configuração abandonada.

## 18.2 Fluxo técnico

```text
Aplicação do cliente
      ↓ POST HTTPS /api/events
Gateway autenticado
      ↓ validação e aceite
Armazenamento de eventos
      ↓ agregação por janela
Métricas de produto
      ↓ combinação com contrato, suporte e financeiro
Motor de análise
      ↓
Dashboard, sinais, previsões e gestão
```

## 18.3 Contrato mínimo do evento

```json
{
  "application_id": "app_123",
  "event": "relatorio_gerado",
  "user_id": "usr_pseudonimo_456",
  "client_id": "cliente_071",
  "product_id": "produto_analytics",
  "occurred_at": "2026-09-20T12:00:00Z",
  "schema_version": "1.0"
}
```

O protótipo atual aceita `application_id`, `event` e `user_id` opcional. A arquitetura de produção deve acrescentar identificação canônica do cliente/produto, data de ocorrência, versão, idempotência e contexto permitido.

## 18.4 Tracker server-side

O tracker implementado:

- valida endpoint HTTP/HTTPS;
- envia `POST` com JSON;
- utiliza credencial Bearer;
- trata falhas de rede e HTTP;
- exige confirmação de aceite;
- limita o nome do evento;
- mantém a credencial fora do navegador na aplicação demonstrativa.

Em produção, deve aceitar somente HTTPS.

## 18.5 Recursos necessários em produção

- credenciais por aplicação;
- hash ou cofre de segredos;
- rotação e revogação;
- rate limit;
- chave de idempotência;
- assinatura HMAC opcional;
- fila para absorver picos;
- dead-letter queue;
- monitoramento de atraso e perda;
- catálogo versionado de eventos;
- ambiente de teste;
- endpoint regional quando necessário;
- política de retenção;
- trilha de auditoria.

## 18.6 Do evento à métrica

Eventos brutos não devem entrar diretamente no modelo. Eles são agregados por cliente, produto, funcionalidade e janela:

- contagem em 7, 30 e 90 dias;
- dias ativos;
- usuários únicos pseudonimizados;
- recência;
- frequência;
- variação entre janelas;
- taxa de sucesso e erro;
- adoção de funcionalidades;
- abandono de função crítica.

## 18.7 Tracking não substitui contexto

Queda de uso pode significar insatisfação, sazonalidade, férias, mudança de processo, conclusão natural de uma etapa ou problema técnico. O sistema usa o sinal para iniciar uma investigação, não para concluir sozinho.

---

# 19. Privacidade sem sensação de vigilância

## 19.1 Princípio

O produto deve observar a saúde do relacionamento, não vigiar pessoas.

## 19.2 Medidas de desenho

- analisar prioritariamente empresa, contrato, produto e funcionalidade;
- evitar nomes de usuários quando não forem necessários;
- usar identificadores pseudonimizados;
- agregar eventos em janelas;
- limitar acesso a eventos brutos;
- separar análise interna de comunicação externa;
- não revelar score ou tracking no contato com o cliente;
- apresentar fatos de serviço em linguagem natural;
- exigir revisão humana;
- permitir auditoria do motivo de cada acesso.

## 19.3 Comunicação recomendada

Em vez de:

> “Percebemos que o usuário João não clicou na função X há 19 dias.”

Usar:

> “Queremos entender se o fluxo de relatórios continua atendendo à operação e se existe alguma dificuldade ou necessidade ainda não coberta.”

A primeira formulação expõe monitoramento individual. A segunda abre uma conversa sobre valor e experiência.

---

# 20. LGPD e validade jurídica das integrações

## 20.1 A chamada HTTP não é ilegal por natureza

HTTP ou HTTPS é apenas o meio técnico. A licitude depende da finalidade, da base legal, da necessidade, da transparência, dos agentes envolvidos, da segurança e do respeito aos direitos dos titulares.

A LGPD exige boa-fé e princípios como finalidade, adequação, necessidade, transparência, segurança, prevenção, não discriminação e responsabilização. Esses princípios estão no art. 6º da [Lei nº 13.709/2018 - LGPD](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

## 20.2 Quando o evento é dado pessoal

Um evento pode ser dado pessoal quando estiver associado a uma pessoa natural identificada ou identificável, direta ou indiretamente. Um `user_id`, e-mail, IP, dispositivo ou combinação de atributos pode tornar o evento pessoal.

Dados puramente agregados por empresa podem reduzir esse risco, mas pseudonimização não é anonimização absoluta. O contexto precisa ser avaliado.

## 20.3 Controlador e operador

Em uma configuração típica:

- a empresa cliente define por que seus dados serão analisados e atua como **controladora**;
- a plataforma processa os dados segundo as instruções contratadas e atua como **operadora**;
- provedores de nuvem, e-mail ou IA podem atuar como **suboperadores**;
- em finalidades próprias, a plataforma pode assumir responsabilidade de controladora independente para aquela operação específica.

A função depende das decisões efetivas, não apenas do nome escrito no contrato. A ANPD explica esses papéis em seu [Guia de Agentes de Tratamento e Encarregado](https://www.gov.br/anpd/pt-br/assuntos/noticias/nova-versao-do-guia-dos-agentes-de-tratamento).

O operador deve seguir as instruções do controlador, conforme art. 39 da LGPD.

## 20.4 Base legal

Não existe uma base legal única para todos os clientes. A empresa deve documentar a hipótese adequada para cada finalidade.

Possibilidades que podem ser avaliadas no caso concreto:

- execução de contrato ou procedimentos relacionados;
- cumprimento de obrigação legal ou regulatória;
- exercício regular de direitos;
- legítimo interesse, quando aplicável;
- consentimento específico, quando a operação realmente depender dele.

Consentimento não deve ser usado como solução automática. Se legítimo interesse for adotado, é necessário avaliar finalidade, necessidade, legítima expectativa, impactos e salvaguardas. A ANPD propõe teste de balanceamento em três fases — finalidade, necessidade e balanceamento/salvaguardas — no [Guia Orientativo sobre Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse).

Legítimo interesse não se aplica a dados pessoais sensíveis.

## 20.5 Transparência

O titular precisa receber informações claras sobre:

- finalidade;
- forma e duração do tratamento;
- identidade e contato do controlador;
- uso compartilhado;
- responsabilidades dos agentes;
- direitos e canais de atendimento.

Esses deveres aparecem nos arts. 9º e 18 da LGPD.

## 20.6 Decisões automatizadas

O art. 20 da LGPD garante o direito de solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado que afetem interesses, além de informações claras sobre critérios e procedimentos.

O desenho recomendado mantém **humano no circuito**:

- o modelo sugere prioridade;
- a pessoa revisa evidências;
- nenhuma sanção, cancelamento, bloqueio ou tratamento prejudicial é executado automaticamente;
- o contato é revisado;
- contestação e correção são possíveis;
- critérios, versão e fontes são registrados.

## 20.7 Registro e Relatório de Impacto

Controlador e operador devem manter registro das operações, especialmente quando baseadas em legítimo interesse, conforme art. 37.

Quando o tratamento puder gerar alto risco, a elaboração de um Relatório de Impacto à Proteção de Dados Pessoais é recomendada. A ANPD descreve finalidade, conteúdo e responsabilidade do controlador em sua página sobre [RIPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd).

## 20.8 Segurança e incidentes

O art. 46 exige medidas técnicas e administrativas desde a concepção do produto. Em incidentes que possam acarretar risco ou dano relevante, a [Resolução CD/ANPD nº 15/2024](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis) estabelece comunicação à ANPD e aos titulares em três dias úteis, salvo prazo específico.

O contrato deve exigir que o operador comunique o controlador em prazo menor, por exemplo 24 horas após confirmação, para permitir avaliação e cumprimento do prazo legal.

## 20.9 Transferência internacional e IA

Se dados pessoais forem enviados a provedor localizado ou tratado no exterior, devem ser observados os mecanismos de transferência internacional da LGPD e da [Resolução CD/ANPD nº 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).

As cláusulas-padrão da ANPD podem integrar um contrato maior ou termo aditivo, sem alteração do texto obrigatório. Também são exigidas informações transparentes sobre país de destino, finalidade, compartilhamento, responsabilidades, segurança e direitos.

## 20.10 Validade de contratos eletrônicos

Contratos e aditivos podem ser celebrados eletronicamente. O § 2º do art. 10 da [Medida Provisória nº 2.200-2/2001](https://planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm) admite outros meios de comprovação de autoria e integridade, além de certificado ICP-Brasil, quando aceitos pelas partes. A [Lei nº 14.063/2020](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm) disciplina categorias de assinaturas eletrônicas em seu escopo.

Na prática, o processo deve preservar:

- identificação dos signatários;
- integridade do documento;
- data e hora;
- versão aceita;
- evidência de aceite;
- trilha de auditoria;
- cópia acessível às partes.

---

# 21. Estrutura contratual recomendada

## 21.1 Novos contratos

Novos contratos devem incluir, desde a assinatura:

1. contrato comercial ou Termos de Serviço;
2. Anexo de Tratamento de Dados Pessoais, ou DPA;
3. descrição técnica das integrações;
4. política de segurança;
5. lista ou política de suboperadores;
6. cláusulas de transferência internacional, quando aplicáveis;
7. níveis de serviço;
8. política de retenção e encerramento;
9. regras de uso aceitável de IA e predição.

## 21.2 Contratos existentes

Para clientes atuais:

1. mapear o contrato e a finalidade original;
2. verificar se análise preditiva e tracking são compatíveis;
3. produzir registro da operação e avaliação de base legal;
4. assinar termo aditivo quando a finalidade, compartilhamento ou risco não estiver coberto;
5. atualizar aviso de privacidade e documentação interna;
6. somente então ativar a conexão.

## 21.3 Cláusulas mínimas do DPA

- objeto e duração;
- natureza e finalidade;
- categorias de dados;
- categorias de titulares;
- papéis das partes;
- instruções documentadas;
- base legal sob responsabilidade do controlador;
- confidencialidade;
- medidas de segurança;
- controle de acesso e segregação;
- suboperadores;
- transferência internacional;
- retenção, devolução e eliminação;
- atendimento aos direitos dos titulares;
- cooperação em RIPD;
- comunicação de incidentes;
- auditoria e evidências;
- portabilidade e saída;
- responsabilidade;
- proibição de uso para finalidade própria não autorizada.

## 21.4 Anexo técnico de tracking

Deve especificar:

- aplicações conectadas;
- catálogo de eventos;
- campos permitidos e proibidos;
- identificadores e pseudonimização;
- frequência e volume;
- finalidade de cada evento;
- retenção do evento bruto e do agregado;
- responsáveis por implementar o tracker;
- credenciais e rotação;
- ambientes;
- SLA de ingestão;
- tratamento de falhas;
- desligamento e exclusão.

## 21.5 Campos proibidos por padrão

- senha;
- token de sessão;
- conteúdo livre de mensagens;
- documento pessoal sem necessidade;
- dado sensível;
- informação médica;
- geolocalização precisa;
- conteúdo de tela;
- payload completo de formulários;
- credencial de integração.

Exceções exigem justificativa, revisão jurídica, segurança reforçada e configuração específica.

---

# 22. Arquitetura técnica para produção

## 22.1 Visão geral

```text
Frontend React
   │
   ├── Autenticação e autorização
   ├── Dashboards e gestão
   └── Configuração assistida
          │
          ▼
API de aplicação
   ├── organizações e usuários
   ├── fontes e configurações
   ├── clientes, produtos e casos
   ├── pesquisas e campanhas
   └── resultados e auditoria
          │
          ├── Banco relacional com isolamento por tenant
          ├── Storage privado
          ├── Fila de processamento
          ├── Serviço de eventos
          └── Worker Python de análise
                    │
                    ├── perfilamento
                    ├── validação
                    ├── score
                    ├── treino e teste
                    └── previsões versionadas
```

## 22.2 Stack atual do protótipo

- React 19;
- Vite;
- TypeScript;
- React Router;
- Recharts;
- Phosphor Icons;
- Node.js para APIs locais;
- SQLite local para conexões e eventos;
- Python, pandas, openpyxl e scikit-learn;
- Gemini com fallback determinístico;
- armazenamento local para sessões e partes demonstrativas.

## 22.3 Arquitetura comercial recomendada

- frontend em CDN;
- autenticação gerenciada;
- PostgreSQL com isolamento por organização;
- Row Level Security quando suportada;
- storage privado e URLs assinadas;
- worker Python em container;
- fila gerenciada;
- API de eventos escalável;
- cofre de segredos;
- observabilidade central;
- backups e recuperação;
- ambientes separados.

## 22.4 Processamento de planilhas

1. upload privado;
2. validação de extensão, tamanho e assinatura;
3. verificação de malware;
4. token temporário;
5. perfilamento;
6. configuração;
7. trabalho assíncrono;
8. resultado imutável;
9. expiração ou exclusão do arquivo bruto;
10. preservação do hash, configuração e metadados necessários.

---

# 23. Segurança, isolamento e auditoria

## 23.1 Multiempresa

Toda tabela deve conter `organization_id`. Consultas, arquivos, eventos e resultados precisam ser filtrados no servidor, não somente no frontend.

## 23.2 Controles principais

- menor privilégio;
- MFA para perfis críticos;
- RBAC;
- segregação por tenant;
- TLS em trânsito;
- criptografia em repouso;
- gestão e rotação de segredos;
- logs sem dados desnecessários;
- backups testados;
- varredura de dependências;
- proteção contra upload malicioso;
- rate limit;
- trilhas imutáveis de auditoria;
- revisão periódica de acessos.

## 23.3 Auditoria

Registrar:

- quem importou a fonte;
- quem alterou pesos;
- quem publicou a configuração;
- versão da fonte;
- versão do modelo;
- execução que gerou a previsão;
- quem consultou dados sensíveis;
- quem criou ou alterou uma ação;
- quem abriu um rascunho de contato;
- quando uma integração foi ativada ou revogada.

## 23.4 Retenção

Definir prazos separados para:

- arquivo bruto;
- eventos brutos;
- agregados;
- previsões;
- histórico de ações;
- respostas de pesquisa;
- logs de segurança;
- auditoria contratual.

O término da finalidade deve acionar eliminação, anonimização ou retenção somente nas hipóteses legalmente admitidas.

---

# 24. Monitoramento e governança dos modelos

## 24.1 Versionamento

Cada previsão deve estar ligada a:

- organização;
- fonte e hash;
- data-base;
- configuração;
- conjunto de variáveis;
- versão do pipeline;
- versão do modelo;
- métricas de validação;
- data de geração.

## 24.2 Monitoramento de dados

- colunas ausentes;
- mudança de tipo;
- cobertura;
- distribuição;
- categorias novas;
- atraso da fonte;
- volume inesperado;
- perda de relacionamento entre abas.

## 24.3 Monitoramento do modelo

- taxa observada por faixa;
- Brier Score;
- PR AUC;
- precisão e recall do topo;
- estabilidade de calibração;
- drift;
- desigualdade entre segmentos;
- taxa de alertas falsos;
- valor capturado pela fila.

## 24.4 Política de suspensão

A probabilidade deve ser suspensa e substituída por score ou “análise indisponível” quando:

- cobertura cair abaixo do mínimo;
- alvo mudar de significado;
- houver vazamento;
- desempenho não superar baseline;
- distribuição mudar intensamente;
- dados deixarem de representar a população;
- auditoria encontrar risco discriminatório.

## 24.5 Intervenção e causalidade

Se clientes de maior risco recebem mais atenção, o resultado posterior mistura risco original e efeito da intervenção. Portanto, recuperação não prova automaticamente que o modelo “estava certo” nem que a ação foi a causa.

O histórico deve registrar a intervenção para permitir análises futuras mais corretas.

---

# 25. Produto, escalabilidade e modelo de negócio

## 25.1 Produto horizontal com especialização tecnológica

A solução é horizontal porque aceita objetivos e dados diferentes. Ao mesmo tempo, possui uma vantagem vertical forte para empresas de tecnologia: telemetria de produto conectada ao risco de relacionamento.

## 25.2 Possíveis planos

| Plano | Capacidades |
|---|---|
| Dados | Importação, score, dashboard e explicações |
| Preditivo | Treino, validação, probabilidade e monitoramento |
| Gestão | Casos, responsáveis, SLA e funil de retenção |
| Conectado | API de eventos, telemetria e integrações |
| Enterprise | SSO, ambientes, auditoria, residência de dados e SLA dedicado |

## 25.3 Elementos de escala

- templates por segmento;
- configuração reaproveitável;
- catálogo seguro de módulos;
- API padronizada de eventos;
- pipeline matemático único;
- separação entre interpretação e cálculo;
- arquitetura multiempresa;
- versões imutáveis;
- cobrança por entidades, fontes, eventos ou execuções.

## 25.4 Moat do produto

O diferencial acumulativo surge da combinação de:

- dados multiorigem;
- telemetria de funcionalidades;
- contexto operacional;
- explicações locais;
- resultados das intervenções;
- feedback de cancelados;
- templates aprovados;
- histórico de desempenho por organização.

---

# 26. Demonstração para o hackathon

## 26.1 Cena 1 - O impacto

Abrir a Visão geral e mostrar:

- 58 clientes ativos analisados;
- clientes em atenção;
- receita mensal esperada em risco;
- ranking calculado pela base.

Mensagem:

> “Hoje a empresa não precisa esperar o cancelamento. Ela consegue enxergar onde existe risco e quanto valor está exposto.”

## 26.2 Cena 2 - A explicação

Abrir um cliente de alto risco e mostrar:

- probabilidade em 90 dias;
- uso, SLA, chamados e NPS;
- fatores de risco e proteção;
- comparação com a carteira;
- dados complementares;
- limitações.

Mensagem:

> “O número nunca aparece sozinho. Toda classificação possui rastreabilidade.”

## 26.3 Cena 3 - O risco silencioso

Mostrar um caso com acesso ainda regular, mas deterioração em função crítica ou atendimento.

Mensagem:

> “Saúde geral pode esconder perda de valor em uma parte essencial do produto.”

## 26.4 Cena 4 - A conexão real

Executar uma função no sistema externo demonstrativo e mostrar o evento chegando à plataforma.

Mensagem:

> “A plataforma não depende apenas de uma planilha. Uma aplicação pode enviar eventos por HTTP conforme o uso acontece.”

## 26.5 Cena 5 - A ação

Abrir Gestão e mostrar:

- prioridade;
- responsável;
- prazo;
- abordagem recomendada;
- rascunho editável;
- progressão do caso.

Mensagem:

> “A predição vira trabalho executável, não mais um gráfico esquecido.”

## 26.6 Cena 6 - A adaptação

Abrir Dados, enviar outra planilha e mostrar:

- perfil automático;
- objetivos sugeridos;
- pesos por pills;
- editor manual;
- dashboard modular.

Mensagem:

> “A base do hackathon não é uma limitação do produto. É uma das configurações possíveis.”

## 26.7 Cena 7 - O aprendizado

Abrir Cancelados, preparar pesquisa e mostrar o aprendizado ligado a clientes ativos.

Mensagem:

> “O cancelamento deixa de ser apenas perda e passa a alimentar prevenção.”

## 26.8 Encerramento

> “O INOVAAPPS conecta o que aconteceu, o que pode acontecer e o que o time fará agora.”

---

# 27. Estado atual, simulações e evolução

## 27.1 Implementado no protótipo

- login e onboarding por perfil;
- conta tecnológica e conta geral;
- upload e perfilamento de Excel/CSV;
- configuração assistida e manual;
- pesos por pills e editor completo;
- execução real do modelo da base do hackathon;
- dashboard conectado à execução;
- previsões e impacto financeiro;
- detalhe explicável;
- gestão e fila de atuação;
- clientes ativos, em atenção e cancelados;
- pesquisa pública e composição por Gmail;
- cadastro de aplicações;
- API de eventos;
- tracker server-side;
- eventos e analytics de produto;
- identidade visual Globalsys.

## 27.2 Demonstrativo ou local

- autenticação simplificada;
- persistência parcial em navegador;
- SQLite local;
- telemetria simulada para parte da conta tecnológica;
- cenários de recuperação;
- algumas séries gerenciais;
- envio manual por Gmail;
- sem sincronização real entre dispositivos em módulos locais.

## 27.3 Necessário para produção

- autenticação real e MFA;
- banco multiempresa;
- RLS ou isolamento equivalente;
- storage privado;
- fila e workers escaláveis;
- envio de e-mail transacional;
- gestão de segredos;
- observabilidade;
- política jurídica e contratual;
- monitoramento de modelos;
- operação de direitos dos titulares;
- plano de incidentes;
- testes de segurança;
- disponibilidade e suporte.

Essa separação protege a credibilidade: o protótipo demonstra a solução completa, enquanto a arquitetura descreve o caminho responsável para o produto real.

---

# 28. Roadmap de implementação

## Fase 1 - Produto confiável

- autenticação real;
- tenancy;
- banco relacional;
- fontes e resultados persistidos;
- RBAC;
- auditoria;
- contratos e governança de privacidade.

## Fase 2 - Dados adaptativos

- processamento assíncrono;
- storage privado;
- reimportação e comparação de esquema;
- templates versionados;
- catálogo modular completo;
- fallback manual integral.

## Fase 3 - Predição em produção

- registro de modelos;
- baselines;
- calibração quando necessária;
- monitoramento de drift;
- políticas de suspensão;
- explicações versionadas;
- revisão de viés.

## Fase 4 - Conexões

- gateway de eventos;
- credenciais rotativas;
- idempotência;
- filas;
- SDKs;
- webhooks;
- conectores de CRM, suporte e financeiro;
- monitoramento da ingestão.

## Fase 5 - Gestão e aprendizado

- notificações;
- SLA de casos;
- e-mail transacional;
- pesquisas sincronizadas;
- outcomes;
- avaliação de intervenções;
- retraining governado.

## Fase 6 - Escala enterprise

- SSO/SAML;
- APIs públicas versionadas;
- residência e regionalização;
- exportações e BI;
- permissões customizadas;
- alta disponibilidade;
- certificações e programa formal de segurança.

---

# 29. Indicadores de sucesso

## 29.1 Produto

- tempo até a primeira análise;
- percentual de fontes configuradas sem suporte;
- cobertura média;
- frequência de atualização;
- usuários ativos por perfil;
- tempo para entender uma classificação.

## 29.2 Modelo

- PR AUC;
- Brier Score;
- precisão e recall no topo da fila;
- lift;
- taxa observada por faixa;
- estabilidade temporal;
- alertas falsos;
- clientes com dados insuficientes.

## 29.3 Operação

- tempo entre alerta e primeiro contato;
- casos sem responsável;
- ações atrasadas;
- taxa de contato;
- taxa de recuperação;
- receita preservada;
- receita perdida;
- tempo entre primeiro sinal e cancelamento.

## 29.4 Negócio

- redução de churn;
- expansão de receita;
- renovação;
- custo por conta acompanhada;
- adoção de integrações;
- conversão do trial;
- retenção da própria plataforma.

---

# 30. Riscos e medidas de mitigação

| Risco | Mitigação |
|---|---|
| Falsa precisão | Score quando probabilidade não for sustentável |
| Poucos dados | Cobertura, dados insuficientes e fallback determinístico |
| Vazamento temporal | Fotografias por data-base e teste temporal |
| Alarmes falsos | Validação, ranking por capacidade e monitoramento |
| Correlação tratada como causa | Linguagem responsável e revisão humana |
| Sensação de vigilância | Agregação, pseudonimização e comunicação por fatos de serviço |
| Uso excessivo de dados | Minimização e catálogo permitido |
| Exposição entre empresas | Isolamento por tenant e políticas no servidor |
| Chave de integração vazada | Segredo server-side, hash, rotação e revogação |
| IA interpretando incorretamente | Saída estruturada, validação e confirmação humana |
| Mudança da planilha | Versionamento e diff de esquema |
| Modelo degradado | Monitoramento e política de suspensão |
| Decisão discriminatória | Auditoria, análise por segmentos e proibição de decisão prejudicial automática |
| Contrato insuficiente | DPA, anexo técnico e aditivo antes da ativação |

---

# 31. Conclusão

O INOVAAPPS responde diretamente ao desafio da Globalsys: identificar clientes ativos em risco, explicar a evidência e indicar a ordem de atuação.

Ao mesmo tempo, a solução ultrapassa o formato de um dashboard porque cria uma infraestrutura reutilizável para:

- receber dados heterogêneos;
- entender o objetivo de cada empresa;
- selecionar um método matemático adequado;
- calcular risco ou probabilidade com transparência;
- conectar aplicações por HTTP;
- detectar perda silenciosa de valor;
- transformar previsões em ações delegáveis;
- apoiar um contato humano responsável;
- aprender com cancelamentos e intervenções;
- operar com segurança, contratos e governança.

O principal diferencial pode ser resumido em uma frase:

> **Dados mostram o sinal; o modelo organiza a incerteza; a explicação cria confiança; e a gestão transforma a previsão em resultado.**

---

# 32. Glossário

| Termo | Definição |
|---|---|
| Churn | Encerramento, saída ou não continuidade no horizonte definido |
| Score de Risco | Índice de 0 a 100 baseado em regras e pesos; não é probabilidade |
| Probabilidade | Estimativa estatística vinculada a alvo, horizonte e validação |
| Cobertura | Percentual do peso configurado sustentado por dados observados |
| Entidade | Unidade analisada: cliente, contrato, consumidor, aluno etc. |
| Snapshot | Fotografia dos dados conhecidos em uma data-base |
| Target | Desfecho histórico que o modelo tenta antecipar |
| Feature | Variável utilizada no modelo |
| Tracking | Envio estruturado de eventos de uma aplicação |
| Telemetria | Métricas agregadas sobre uso e funcionamento |
| Tenant | Organização isolada dentro da plataforma multiempresa |
| Controlador | Quem decide finalidade e elementos essenciais do tratamento |
| Operador | Quem trata dados em nome do controlador |
| DPA | Anexo contratual de tratamento de dados |
| RIPD | Relatório de Impacto à Proteção de Dados Pessoais |
| Drift | Mudança na distribuição ou desempenho ao longo do tempo |
| Brier Score | Erro quadrático das probabilidades; menor é melhor |
| PR AUC | Qualidade de ordenação com foco na classe positiva |
| Lift | Ganho do ranking em relação à seleção aleatória |

---

# 33. Apêndices técnicos

## A. APIs do fluxo adaptativo

| Endpoint | Responsabilidade |
|---|---|
| `POST /api/analysis/sources` | Receber e perfilar Excel/CSV |
| `POST /api/analysis/assistant` | Conversa e alterações estruturadas |
| `POST /api/analysis/validate` | Validar configuração |
| `POST /api/analysis/runs` | Executar análise |
| `POST /api/analysis/contact-draft` | Preparar estratégia e mensagem |

## B. APIs de conexões

| Endpoint | Responsabilidade |
|---|---|
| `POST /api/connections/applications` | Cadastrar aplicação |
| `POST /api/connections/applications/:id/features` | Cadastrar funcionalidade |
| `GET /api/connections/applications/:id/events` | Consultar eventos |
| `POST /api/events` | Receber evento da aplicação |
| `GET /api/product-analytics/applications/:id/summary` | Analytics da aplicação |
| `GET /api/product-analytics/clients/:id/summary` | Analytics do cliente |
| `GET /api/clients/:id/telemetry` | Telemetria consolidada do cliente |

## C. Regras do score genérico

```text
HIGH_IS_RISK:
risco = clamp((x - mínimo) / (máximo - mínimo), 0, 1)

LOW_IS_RISK:
risco = 1 - clamp((x - mínimo) / (máximo - mínimo), 0, 1)

PESO NORMALIZADO:
peso_i / soma dos pesos disponíveis

SCORE:
100 × soma(risco_i × peso_i) / soma dos pesos disponíveis

COBERTURA:
100 × soma dos pesos observados / soma dos pesos configurados
```

## D. Checklist antes de ativar tracking

- [ ] Finalidade documentada.
- [ ] Base legal avaliada.
- [ ] Contrato ou aditivo assinado.
- [ ] DPA vigente.
- [ ] Anexo técnico aprovado.
- [ ] Aviso de privacidade atualizado.
- [ ] Catálogo de eventos revisado.
- [ ] Dados proibidos bloqueados.
- [ ] Identificadores pseudonimizados.
- [ ] Retenção definida.
- [ ] Credencial armazenada em cofre.
- [ ] HTTPS obrigatório.
- [ ] Rate limit e idempotência ativos.
- [ ] Suboperadores registrados.
- [ ] Transferência internacional avaliada.
- [ ] RIPD avaliado.
- [ ] Plano de incidente testado.
- [ ] Canal de direitos disponível.
- [ ] Acessos auditáveis.

## E. Critérios de aceite para produção

### Dados

- [ ] Nenhum dado futuro entra nas fotografias históricas.
- [ ] Junções preservam uma linha por entidade.
- [ ] Cobertura considera somente dados observados.
- [ ] Alteração de esquema bloqueia execução incompatível.
- [ ] Arquivos de tenants diferentes permanecem isolados.

### Modelo

- [ ] Teste temporal independente.
- [ ] Comparação com baseline.
- [ ] Probabilidades avaliadas por calibração.
- [ ] Score e probabilidade nunca são confundidos.
- [ ] Contribuições reconciliam com o resultado.
- [ ] Política de suspensão ativa.

### Produto

- [ ] Todas as telas usam a mesma execução ativa.
- [ ] Módulos incompatíveis com a fonte não aparecem.
- [ ] Detalhe reconcilia resultado, fatores e cobertura.
- [ ] Contato exige revisão humana.
- [ ] Nenhuma decisão prejudicial é automática.
- [ ] Gestão registra responsável, prazo e resultado.

### Segurança e privacidade

- [ ] RBAC e isolamento por tenant testados.
- [ ] Credenciais não retornam ao navegador.
- [ ] Logs evitam dados pessoais desnecessários.
- [ ] Exclusão e portabilidade testadas.
- [ ] Incidentes possuem fluxo e prazo.
- [ ] Contratos e avisos correspondem à arquitetura real.

## F. Referências

### Materiais do desafio e do projeto

- Globalsys. **Desafio INOVAAPPS 2026**. Documento fornecido aos participantes.
- `INOVAAPPS_base_de_dados.xlsx`. Base fornecida para o desafio.
- `Relatorio_Algoritmo_Generico_Risco_Cancelamento_V3.md`. Especificação técnica do score genérico.
- Código-fonte e artefato `churn-model.json` do protótipo INOVAAPPS 2026.

### Referências jurídicas oficiais

- [Lei nº 13.709/2018 - Lei Geral de Proteção de Dados Pessoais](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).
- [ANPD - Guia de Agentes de Tratamento e Encarregado](https://www.gov.br/anpd/pt-br/assuntos/noticias/nova-versao-do-guia-dos-agentes-de-tratamento).
- [ANPD - Guia Orientativo sobre Legítimo Interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse).
- [ANPD - Relatório de Impacto à Proteção de Dados Pessoais](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd).
- [Resolução CD/ANPD nº 15/2024 - Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis).
- [Resolução CD/ANPD nº 19/2024 - Transferência Internacional de Dados](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).
- [Medida Provisória nº 2.200-2/2001](https://planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm).
- [Lei nº 14.063/2020 - Assinaturas eletrônicas](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm).

---

**Fim do documento.**
