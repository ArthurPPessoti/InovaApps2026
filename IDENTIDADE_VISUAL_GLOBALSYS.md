# Identidade visual inspirada na Globalsys

> Guia de referência elaborado a partir da análise pública do site [globalsys.com.br](https://www.globalsys.com.br/), consultado em 19 de setembro de 2026.

## 1. Objetivo

Este documento descreve o sistema visual observado no site institucional da Globalsys e o traduz em regras práticas para interfaces digitais. A intenção é permitir a criação de páginas com a mesma direção estética: tecnologia corporativa, confiança, movimento, inovação e alto contraste.

Este não é um manual oficial da marca. Logotipo, fotografias, ilustrações, textos e demais ativos proprietários devem ser usados apenas com autorização. Para um projeto independente, preserve a linguagem visual geral, mas utilize nome, símbolo, conteúdo e imagens próprios.

## 2. Essência da identidade

### Posicionamento percebido

- Empresa B2B de tecnologia e transformação digital.
- Comunicação segura, direta e orientada a resultados.
- Equilíbrio entre solidez corporativa e linguagem de inovação.
- Forte uso de prova social: clientes, cases, depoimentos, certificações e números.

### Personalidade

| Atributo | Expressão visual |
|---|---|
| Tecnologia | Azuis elétricos, ciano, grafismos luminosos e movimento |
| Confiança | Azul-marinho profundo, grid organizado e tipografia robusta |
| Inovação | Gradientes, recortes diagonais, elementos orbitais e brilho sutil |
| Proximidade | Fotografias de pessoas, textos conversacionais e cantos arredondados |
| Performance | Hierarquia forte, CTAs claros e blocos de dados/cases |

### Palavras-chave

`tecnologia` · `conexão` · `dados` · `escala` · `inteligência` · `transformação` · `confiança` · `futuro`

## 3. Paleta cromática

### Cores principais

| Token | Hex | RGB | Uso recomendado |
|---|---:|---:|---|
| `navy-950` | `#000A1E` | `0, 10, 30` | Fundo principal escuro, rodapé, overlays |
| `navy-900` | `#041833` | `4, 24, 51` | Superfícies elevadas e início de gradientes |
| `blue-800` | `#0000AA` | `0, 0, 170` | Azul institucional e áreas de destaque |
| `blue-700` | `#0F0FC3` | `15, 15, 195` | Gradientes e estados ativos |
| `blue-600` | `#1D1DDB` | `29, 29, 219` | Brilho intermediário |
| `blue-500` | `#0156FC` | `1, 86, 252` | Links, CTAs e gradientes intensos |
| `cyan-400` | `#00F3FF` | `0, 243, 255` | Linhas, ícones e efeitos tecnológicos |
| `green-400` | `#00FF91` | `0, 255, 145` | Acento de alta atenção e sucesso |
| `white` | `#FFFFFF` | `255, 255, 255` | Texto sobre fundo escuro |

### Cores de apoio

| Token | Hex | Uso recomendado |
|---|---:|---|
| `gray-200` | `#E0E0E0` | Bordas e fundos suaves |
| `gray-300` | `#D6D6D6` | Divisores e elementos inativos |
| `gray-400` | `#B9B9B9` | Texto secundário em fundo escuro |
| `orange-500` | `#F77308` | Destaques ocasionais e categorias |
| `red-500` | `#FF2828` | Erros e alertas |

### Opacidades recorrentes

- Branco a 75%: `#FFFFFFBF` — texto secundário.
- Branco a 50%: `#FFFFFF80` — bordas, ícones e elementos decorativos.
- Branco a 25%: `#FFFFFF40` — divisores discretos.
- Branco a 20%: `#FFFFFF33` — fundos translúcidos.
- Ciano a 50%: `#00F3FF80` — brilhos e halos.
- Azul a 20%: `#0000AA33` — fundos e bordas de seleção.

### Gradientes característicos

```css
/* CTA e destaque linear */
background: linear-gradient(90deg, #0000AA 0%, #0156FC 100%);

/* Superfície tecnológica profunda */
background: linear-gradient(
  112.61deg,
  #041833 0%,
  #0000AA 24%,
  #1D1DDB 62%,
  #0F0FC3 81%,
  #00083D 100%
);

/* Overlay para fotografia ou vídeo */
background: linear-gradient(
  180.53deg,
  rgba(0, 0, 0, 0) 24.97%,
  #000A1E 70.72%
);
```

### Proporção de uso

- 55% azul-marinho e superfícies escuras.
- 25% branco e áreas de respiro.
- 15% azuis elétricos e gradientes.
- 5% ciano, verde e cores semânticas.

O verde e o ciano devem funcionar como energia visual, não como fundos dominantes.

## 4. Tipografia

### Famílias

- **Space Grotesk**: títulos, números, chamadas e elementos de maior personalidade.
- **Montserrat**: corpo de texto, navegação, labels e informações funcionais.
- Fallback recomendado: `Arial, Helvetica, sans-serif`.

### Importação

```css
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap");
```

### Escala sugerida

| Estilo | Desktop | Mobile | Peso | Entrelinha |
|---|---:|---:|---:|---:|
| Display XL | `84px` | `48px` | 500–600 | 0.95–1.0 |
| Display | `64px` | `40px` | 500–600 | 1.0 |
| H1 | `56px` | `36px` | 600 | 1.05 |
| H2 | `48px` | `32px` | 600 | 1.1 |
| H3 | `32px` | `24px` | 600 | 1.15 |
| H4 | `24px` | `20px` | 600 | 1.2 |
| Corpo grande | `18px` | `17px` | 400 | 1.6 |
| Corpo | `16px` | `16px` | 400 | 1.6 |
| Pequeno/label | `14px` | `14px` | 500–600 | 1.4 |
| Microtexto | `12px` | `12px` | 500 | 1.4 |

### Regras tipográficas

- Títulos curtos, com quebras intencionais e largura controlada.
- Destaques podem receber ciano, verde ou azul vivo.
- Evitar texto corrido em caixa alta.
- Labels e categorias podem usar caixa alta com tracking entre `0.06em` e `0.12em`.
- Corpo de texto ideal entre 55 e 75 caracteres por linha.

## 5. Layout e composição

### Container

- Largura máxima observada/sugerida: `1597px`.
- Para uso geral: `min(100% - 48px, 1440px)`.
- Em mobile: margens laterais de `20px` a `24px`.
- Seções amplas com grande respiro vertical: `96px` a `160px` no desktop.

### Grid

- Grid principal de 12 colunas no desktop.
- Cards em 3 ou 4 colunas para soluções, setores e cases.
- Blocos institucionais em composição 5/7 ou 6/6.
- Em tablet, reduzir para 2 colunas; em mobile, 1 coluna.
- Preferir assimetria controlada: conteúdo editorial de um lado e visual imersivo do outro.

### Ritmo de espaçamento

Use uma base de 4px:

`4` · `8` · `12` · `16` · `24` · `32` · `40` · `48` · `64` · `80` · `96` · `128` · `160`

### Alternância de seções

1. Hero escuro e imersivo.
2. Faixa branca de logos/prova social.
3. Seção de soluções com azul e cards.
4. Produtos em cards de alta ênfase.
5. Depoimentos e cases com fotografia.
6. Conteúdo/setores com alternância claro-escuro.
7. CTA final direto.
8. Rodapé azul-marinho extenso.

## 6. Formas, bordas e profundidade

### Raios

| Aplicação | Raio |
|---|---:|
| Cards principais | `20px` |
| Cards editoriais | `24px`–`30px` |
| Botões pill | `50px` ou `999px` |
| Campos | `10px`–`15px` |
| Avatares e ícones circulares | `50%` |

### Bordas

```css
border: 1px solid rgba(255, 255, 255, 0.20);
```

Em fundos claros:

```css
border: 1px solid rgba(0, 10, 30, 0.10);
```

### Sombras

O visual depende mais de contraste, gradiente e glow do que de sombras pesadas.

```css
box-shadow: 0 20px 60px rgba(0, 10, 30, 0.18);
```

Para acento tecnológico:

```css
box-shadow: 0 0 40px rgba(0, 243, 255, 0.18);
```

## 7. Componentes

### Cabeçalho

- Logo à esquerda.
- Navegação horizontal com menus de soluções e produtos.
- CTA secundário para área do cliente.
- Aparência limpa, com alto contraste sobre hero.
- Em scroll, pode receber fundo `navy-950` com leve transparência e blur.

### Botão primário

```css
.button-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 28px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(90deg, #0000AA 0%, #0156FC 100%);
  font: 600 14px/1 "Montserrat", sans-serif;
  transition: transform 300ms ease, filter 300ms ease;
}

.button-primary:hover {
  transform: translateY(-2px);
  filter: brightness(1.12);
}
```

### Botão secundário

- Fundo transparente.
- Borda branca ou azul.
- Ícone de seta circular.
- Hover com preenchimento gradual ou inversão de cores.

### Cards de solução

- Fundo branco ou azul-marinho.
- Título curto, descrição e lista de links.
- Raio de `20px` a `30px`.
- Área clicável ampla.
- Hover com deslocamento vertical de `4px`, borda azul/ciano e leve glow.

### Cards de case

- Fotografia cobrindo o card.
- Overlay escuro ascendente.
- Conteúdo ancorado na parte inferior.
- Categoria pequena acima do título.
- Link “Leia mais” com seta.

### Logos de clientes

- Carrossel horizontal contínuo.
- Logos preferencialmente monocromáticos ou normalizados.
- Espaçamento generoso e fundo claro.
- Movimento lento, sem competir com o conteúdo.

### Depoimentos

- Foto ou avatar circular.
- Nome e cargo com hierarquia clara.
- Texto curto, legível e com aspas discretas.
- Controle de carrossel mínimo.

### CTA final

- Pergunta curta: estrutura “Vamos conversar?”.
- Uma frase de apoio.
- Um único botão de alta prioridade.
- Grande área de respiro e contraste.

### Rodapé

- Fundo `#000A1E`.
- Múltiplas colunas para institucional, soluções, produtos e contato.
- Texto secundário em cinza/branco translúcido.
- Selos e certificações separados da navegação principal.
- Grafismo decorativo abstrato, sem comprometer legibilidade.

## 8. Imagens e direção de arte

### Fotografia

- Pessoas reais em ambientes profissionais e colaborativos.
- Enquadramentos amplos, com espaço negativo para texto.
- Contraste moderado a alto.
- Temperatura neutra ou levemente fria.
- Aplicar overlay azul-marinho em imagens que receberem texto.

### Grafismos

- Linhas luminosas, partículas e redes de conexão.
- Formas orbitais ou curvas que sugerem fluxo de dados.
- Recortes geométricos diagonais.
- Gradientes azuis com pequenos acentos ciano/verde.
- Uso contido de blur para criar profundidade.

### Ícones

- Traço simples e consistente.
- Geometria arredondada.
- Branco, azul vivo, ciano ou verde.
- Tamanho recomendado entre `20px` e `32px`.

## 9. Movimento e interação

O tema analisado utiliza uma transição-base de aproximadamente `300ms ease-in-out`.

### Princípios

- Movimento funcional, curto e previsível.
- Cards sobem levemente no hover.
- Links e botões animam cor, seta ou fundo.
- Carrosséis contínuos para logos e conteúdos relacionados.
- Entradas de seção com fade e deslocamento vertical discreto.
- Evitar parallax excessivo e animações simultâneas demais.

### Duração sugerida

| Interação | Duração |
|---|---:|
| Hover | `200–300ms` |
| Menu/dropdown | `250–350ms` |
| Entrada de seção | `500–800ms` |
| Carrossel | `500–700ms` |

### Acessibilidade de movimento

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 10. Responsividade

Breakpoints observados no tema incluem `430`, `600`, `660`, `700`, `768`, `800`, `1024`, `1120`, `1200`, `1280`, `1366` e `1600px`. Para uma implementação nova, simplifique:

```css
/* Mobile: padrão */
/* Tablet */
@media (min-width: 768px) { }
/* Desktop */
@media (min-width: 1024px) { }
/* Wide */
@media (min-width: 1366px) { }
```

### Comportamento mobile

- Menu vira drawer ou painel de tela cheia.
- Títulos reduzem sem perder impacto.
- Grids colapsam para uma coluna.
- Cards mantêm ao menos `16px` de padding interno.
- Botões importantes podem ocupar 100% da largura.
- Carrosséis exibem parte do próximo card para indicar continuidade.
- Áreas clicáveis devem ter no mínimo `44 × 44px`.

## 11. Tom de voz

### Características

- Direto, profissional e otimista.
- Orientado a transformação e resultado.
- Técnico sem ser excessivamente complexo.
- Verbos de ação: conectar, transformar, acelerar, impulsionar, integrar, escalar.

### Estrutura de mensagem

1. Apresente o desafio do negócio.
2. Mostre a solução com clareza.
3. Explique o impacto mensurável.
4. Reforce confiança com case ou prova social.
5. Termine com uma ação simples.

### Exemplos originais

- “Tecnologia que conecta dados, pessoas e resultados.”
- “Transforme complexidade em decisões mais inteligentes.”
- “Soluções digitais preparadas para o próximo estágio do seu negócio.”

## 12. Tokens CSS recomendados

```css
:root {
  --color-navy-950: #000A1E;
  --color-navy-900: #041833;
  --color-blue-800: #0000AA;
  --color-blue-700: #0F0FC3;
  --color-blue-600: #1D1DDB;
  --color-blue-500: #0156FC;
  --color-cyan-400: #00F3FF;
  --color-green-400: #00FF91;
  --color-white: #FFFFFF;
  --color-gray-200: #E0E0E0;
  --color-gray-300: #D6D6D6;
  --color-gray-400: #B9B9B9;

  --font-display: "Space Grotesk", Arial, sans-serif;
  --font-body: "Montserrat", Arial, sans-serif;

  --radius-sm: 10px;
  --radius-md: 20px;
  --radius-lg: 30px;
  --radius-pill: 999px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --space-32: 128px;

  --transition-base: 300ms ease-in-out;
  --shadow-card: 0 20px 60px rgba(0, 10, 30, 0.18);
  --shadow-glow: 0 0 40px rgba(0, 243, 255, 0.18);
}
```

## 13. Estrutura sugerida para uma landing page

1. **Header:** logo, navegação, área do cliente e CTA.
2. **Hero:** promessa principal, apoio, CTA e composição tecnológica.
3. **Prova social:** faixa de logos de clientes.
4. **Soluções:** quatro pilares em cards.
5. **Produtos:** dois cards de alta ênfase.
6. **Depoimentos:** carrossel com nome, cargo e empresa.
7. **Cases:** cards com imagem, resumo e resultado.
8. **Programa/cultura:** bloco institucional ou de talentos.
9. **Setores:** saúde, logística, varejo e indústria.
10. **Conteúdo:** artigos recentes.
11. **CTA final:** contato com especialistas.
12. **Footer:** mapa do site, contatos, unidades e certificações.

## 14. Acessibilidade

- Contraste mínimo WCAG AA: `4.5:1` para texto comum e `3:1` para texto grande.
- Não usar apenas cor para indicar estado.
- Foco visível em todos os elementos interativos.
- Textos alternativos descritivos em imagens relevantes.
- Pausa ou controle para carrosséis automáticos.
- Ordem de tabulação coerente.
- Hierarquia semântica de títulos sem saltos.
- Vídeos com legendas e controle de reprodução.

Exemplo de foco:

```css
:focus-visible {
  outline: 3px solid #00F3FF;
  outline-offset: 3px;
}
```

## 15. Faça e evite

### Faça

- Use azul-marinho como base de confiança.
- Reserve ciano e verde para momentos de ênfase.
- Crie títulos fortes com bastante espaço ao redor.
- Combine conteúdo institucional com prova concreta.
- Use movimento suave e funcional.
- Mantenha cards e CTAs consistentes.

### Evite

- Aplicar todos os acentos simultaneamente.
- Usar neon em grandes áreas de texto.
- Exagerar em sombras, blur e glassmorphism.
- Criar muitos estilos de botão.
- Usar parágrafos longos no hero.
- Copiar o logotipo, fotografias, textos ou ilustrações proprietárias sem autorização.

## 16. Checklist de implementação

- [ ] Fontes carregadas com fallback.
- [ ] Paleta definida em tokens.
- [ ] Contrastes validados.
- [ ] Container e grid consistentes.
- [ ] Escala tipográfica responsiva.
- [ ] Estados hover, focus, active e disabled.
- [ ] Navegação mobile acessível.
- [ ] Carrosséis controláveis.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Imagens otimizadas em WebP/AVIF.
- [ ] Conteúdo e ativos autorais/licenciados.
- [ ] Testes em 360px, 768px, 1024px e 1440px.

## 17. Fonte da análise

- Site institucional: [Globalsys](https://www.globalsys.com.br/).
- CSS público do tema consultado para identificar fontes, cores, gradientes, raios, breakpoints e transições.
- Conteúdo e estrutura da homepage consultados para mapear hierarquia, componentes e tom de voz.

---

**Status:** referência visual não oficial, pronta para orientar design e desenvolvimento.
