const buttons = document.querySelectorAll("[data-action]");
const activityTitle = document.querySelector("#activity-title");
const activityDetail = document.querySelector("#activity-detail");

async function executeAction(button) {
  const action = button.dataset.action;
  const originalLabel = button.textContent;
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

    activityTitle.textContent = result.message;
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
