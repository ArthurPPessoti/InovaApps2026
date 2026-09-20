# Sistema de Estoque — aplicação externa de demonstração

Esta aplicação simula um sistema externo instrumentado pelo tracker server-side.
O navegador nunca recebe a credencial da integração.

## Configuração automática recomendada

Na raiz do projeto, execute:

```powershell
npm run setup:telemetry-demo
```

O comando cria ou reutiliza seis clientes demonstrativos, cadastra as
funcionalidades, gera o histórico temporal e configura automaticamente o
arquivo local `demo-app/.env` para o projeto externo do `C067`. Ele pode ser
executado novamente sem duplicar conexões ou eventos.

## Configuração manual alternativa

1. Na plataforma, cadastre uma aplicação chamada `Sistema de Estoque`.
2. Na aba Integração, copie o Application ID, a credencial e o endpoint.
3. Copie `demo-app/.env.example` para `demo-app/.env`.
4. Preencha as variáveis no arquivo `.env`.

```dotenv
DEMO_APPLICATION_ID=app_xxxxx
DEMO_CREDENTIAL=conn_sk_xxxxx
DEMO_PLATFORM_ENDPOINT=http://127.0.0.1:5173/api/events
DEMO_PORT=4174
```

O arquivo `demo-app/.env` é ignorado pelo Git e não deve ser versionado.

## Execução

Em um terminal, inicie a plataforma:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

Em outro terminal, inicie a aplicação externa:

```powershell
npm run demo:start
```

Abra `http://127.0.0.1:4174` e execute uma das funcionalidades. Cada cartão
mostra a contagem retornada pela própria plataforma e é atualizado depois do
evento ser aceito. Depois volte à plataforma, abra a mesma aplicação em
Conexões e consulte a aba Eventos ou a análise temporal do produto vinculado.
