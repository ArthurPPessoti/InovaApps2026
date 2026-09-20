// Gera linhas de exemplo sintéticas para enviar à IA: preserva formato e contexto, nunca o dado real.
// Booleanos e categorias (poucos valores distintos) são preservados porque carregam significado e não identificam ninguém.

const PERSON_NAMES = ["Ana Prado", "Bruno Salles", "Carla Meireles", "Diego Fontes", "Elisa Ramos"];
const COMPANY_NAMES = ["Alfa Comércio", "Beta Serviços", "Gama Indústria", "Delta Logística", "Ômega Varejo"];
const CATEGORY_LIMIT = 15;

function seededRandom(seed) {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) state = (state * 31 + seed.charCodeAt(index)) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

const text = (value) => String(value ?? "");
const hasPattern = (examples, pattern) => examples.some((value) => pattern.test(text(value)));

export function detectKind(column) {
  const name = text(column?.name).toLocaleLowerCase("pt-BR");
  const examples = Array.isArray(column?.examples) ? column.examples : [];
  const type = column?.physicalType;

  if (type === "boolean") return "boolean";
  if (/e-?mail/.test(name) || hasPattern(examples, /^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return "email";
  if (/cnpj/.test(name) || hasPattern(examples, /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/)) return "cnpj";
  if (/cpf/.test(name) || hasPattern(examples, /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)) return "cpf";
  if (/telefone|celular|whatsapp|fone/.test(name)) return "phone";
  // Identificador vem antes de empresa/pessoa: "cliente_id" é chave, não nome.
  if (column?.semanticRole === "ENTITY_ID" || /(^|[_\s])id($|[_\s])|c[oó]digo|matr[ií]cula|protocolo/.test(name)) return "id";
  if (/raz[aã]o[_\s]?social|empresa|cliente|conta|organiza|fornecedor/.test(name) && type === "text") return "company";
  if (/nome|respons[aá]vel|contato|titular|vendedor|gerente|owner/.test(name) && type === "text") return "person";
  if (type === "date") return "date";
  if (type === "number") return /valor|receita|pre[cç]o|fatur|ticket|mrr|custo|sal[aá]rio|r\$/.test(name) ? "money" : "number";
  if (type === "text" && Number(column?.uniqueCount ?? 0) > 0 && Number(column.uniqueCount) <= CATEGORY_LIMIT && !column?.possiblePersonalData) return "category";
  return "text";
}

// Mantém o formato do original trocando dígitos e letras: "CLI-2024/07" vira "QNZ-8391/22".
function reshape(sample, random) {
  const digits = "0123456789";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return text(sample).replace(/[0-9A-Za-zÀ-ÿ]/g, (character) => {
    if (/[0-9]/.test(character)) return digits[Math.floor(random() * 10)];
    const replacement = letters[Math.floor(random() * letters.length)];
    return character === character.toLocaleLowerCase("pt-BR") ? replacement.toLocaleLowerCase("pt-BR") : replacement;
  });
}

function fakeNumber(column, random) {
  const min = Number(column?.statistics?.min);
  const max = Number(column?.statistics?.max);
  if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
    const value = min + random() * (max - min);
    const decimals = text(column?.examples?.[0]).split(/[.,]/)[1]?.length ?? 0;
    return Number(value.toFixed(Math.min(decimals, 2)));
  }
  const reference = Number(column?.examples?.find((value) => Number.isFinite(Number(value)))) || 1000;
  return Math.round(Math.abs(reference) * (0.6 + random() * 0.8));
}

function fakeDate(sample, random) {
  const base = new Date(Date.UTC(2026, 0, 1) - Math.floor(random() * 330) * 86400000);
  const iso = base.toISOString().slice(0, 10);
  return /^\d{2}\/\d{2}\/\d{4}/.test(text(sample)) ? iso.split("-").reverse().join("/") : iso;
}

export function sanitizeValue(kind, sample, random, column, index) {
  switch (kind) {
    case "boolean":
    case "category":
      return sample;
    case "email":
      return `contato${index + 1}@exemplo.com.br`;
    case "cpf":
      return `${100 + Math.floor(random() * 800)}.${100 + Math.floor(random() * 800)}.${100 + Math.floor(random() * 800)}-${10 + Math.floor(random() * 80)}`;
    case "cnpj":
      return `${10 + Math.floor(random() * 80)}.${100 + Math.floor(random() * 800)}.${100 + Math.floor(random() * 800)}/0001-${10 + Math.floor(random() * 80)}`;
    case "phone":
      return `(11) 9${1000 + Math.floor(random() * 8000)}-${1000 + Math.floor(random() * 8000)}`;
    case "person":
      return PERSON_NAMES[index % PERSON_NAMES.length];
    case "company":
      return COMPANY_NAMES[index % COMPANY_NAMES.length];
    case "money":
    case "number":
      return fakeNumber(column, random);
    case "date":
      return fakeDate(sample, random);
    case "id":
      return reshape(sample || `ID${index + 1}`, random);
    default:
      return sample === null || sample === undefined || sample === "" ? sample : `Exemplo ${index + 1}`;
  }
}

export function sanitizeColumn(column, limit = 5) {
  const kind = detectKind(column);
  const random = seededRandom(`${column?.name ?? ""}:${kind}`);
  const examples = (Array.isArray(column?.examples) ? column.examples : []).slice(0, limit);
  return examples.map((sample, index) => sanitizeValue(kind, sample, random, column, index));
}

export function sanitizeProfile(profile, limit = 5) {
  return {
    ...profile,
    sheets: (profile?.sheets ?? []).map((sheet) => ({
      ...sheet,
      columns: (sheet.columns ?? []).map((column) => ({ ...column, examples: sanitizeColumn(column, limit) })),
    })),
  };
}
