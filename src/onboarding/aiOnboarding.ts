import type { CompanyProfile } from "../types";

export interface OnboardingMessage {
  role: "assistant" | "user";
  text: string;
}

export interface OnboardingDecision {
  profile: CompanyProfile;
  segment: string;
  goal: string;
  dataSource: string;
  firstStep: "conexoes" | "dados";
  rationale: string;
}

export interface OnboardingTurn {
  engine: "gemini" | "simulado";
  reply: string;
  quickReplies: string[];
  done: boolean;
  decision: OnboardingDecision | null;
}

export const firstOnboardingQuestion =
  "Para começar: o que a sua empresa faz e quem são os clientes que você quer acompanhar?";

export const onboardingStarters = [
  "Quero acompanhar os clientes da minha empresa",
  "Quero acompanhar empresas que contratam um produto meu",
];

export async function fetchOnboardingEngine(): Promise<OnboardingTurn["engine"]> {
  try {
    const response = await fetch("/api/onboarding/status");
    if (!response.ok) return "simulado";
    return ((await response.json()) as { engine: OnboardingTurn["engine"] }).engine;
  } catch {
    return "simulado";
  }
}

export async function sendOnboardingMessage(messages: OnboardingMessage[], company: string): Promise<OnboardingTurn> {
  const response = await fetch("/api/onboarding/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, company }),
  });
  if (!response.ok) throw new Error("O assistente não respondeu. Tente de novo.");
  return (await response.json()) as OnboardingTurn;
}
