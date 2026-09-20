const buttons = document.querySelectorAll("[data-action]");
const counters = document.querySelectorAll("[data-event-counter]");
const activityTitle = document.querySelector("#activity-title");
const activityDetail = document.querySelector("#activity-detail");

function counterFor(eventName) {
  return [...counters].find((counter) => counter.dataset.eventCounter === eventName);
}

async function loadUsage() {
  const response = await fetch("/api/usage", { headers: { Accept: "application/json" } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar os contadores.");

  counters.forEach((counter) => {
    const feature = result.features.find((candidate) => candidate.eventName === counter.dataset.eventCounter);
    counter.textContent = feature ? feature.usageCount.toLocaleString("pt-BR") : "0";
  });

  return result;
}

async function executeAction(button) {
  const action = button.dataset.action;
  const originalLabel = button.textContent;
  const previousCounters = new Map(
    [...counters].map((counter) => [counter.dataset.eventCounter, counter.textContent]),
  );
  button.disabled = true;
  button.textContent = "Executando...";
  activityTitle.textContent = "Enviando evento...";
  activityDetail.textContent = "A funcionalidade foi executada e o backend está acionando o tracker.";

  try {
    const response = await fetch(`/api/actions/${action}`, { method: "POST" });
    const result = await response.json();
    if (!response.ok || result.success !== true) {
      throw new Error(result.error ?? "A operação não foi confirmada.");
    }

    await loadUsage();
    const updatedCounter = counterFor(result.event.event);
    const previousValue = previousCounters.get(result.event.event) ?? "—";
    const currentValue = updatedCounter?.textContent ?? "—";
    updatedCounter?.classList.add("usage-metric-updated");
    window.setTimeout(() => updatedCounter?.classList.remove("usage-metric-updated"), 900);

    activityTitle.textContent = `${result.message} Uso atualizado: ${previousValue} → ${currentValue}`;
    activityDetail.textContent = `${result.event.event} · ${result.event.user_id ?? "sem usuário"} · ${new Date(result.event.received_at).toLocaleString("pt-BR")}`;
  } catch (error) {
    activityTitle.textContent = "Falha ao enviar evento";
    activityDetail.textContent = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

buttons.forEach((button) => {
  button.addEventListener("click", () => void executeAction(button));
});

loadUsage().catch((error) => {
  activityTitle.textContent = "Telemetria indisponível";
  activityDetail.textContent = error instanceof Error ? error.message : "Não foi possível consultar os contadores.";
});
