export class TrackerHttpError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "TrackerHttpError";
    this.status = status;
    this.details = details;
  }
}

export class TrackerNetworkError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "TrackerNetworkError";
  }
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${fieldName} deve ser uma string não vazia.`);
  }
  return value.trim();
}

function validateEndpoint(value) {
  const endpoint = requireString(value, "endpoint");
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new TypeError("endpoint deve ser uma URL absoluta válida.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("endpoint deve utilizar HTTP ou HTTPS.");
  }
  return parsed.toString();
}

async function readResponseBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createTracker({ applicationId, credential, endpoint, fetchImplementation = globalThis.fetch }) {
  const normalizedApplicationId = requireString(applicationId, "applicationId");
  const normalizedCredential = requireString(credential, "credential");
  const normalizedEndpoint = validateEndpoint(endpoint);

  if (typeof fetchImplementation !== "function") {
    throw new TypeError("Uma implementação de fetch é necessária.");
  }

  return Object.freeze({
    async track(event, options = {}) {
      const normalizedEvent = requireString(event, "event");
      if (normalizedEvent.length > 128) {
        throw new TypeError("event deve ter até 128 caracteres.");
      }

      const userId = options.userId;
      if (userId !== undefined && typeof userId !== "string") {
        throw new TypeError("userId deve ser uma string quando informado.");
      }

      const payload = {
        application_id: normalizedApplicationId,
        event: normalizedEvent,
        ...(userId?.trim() ? { user_id: userId.trim() } : {}),
      };

      let response;
      try {
        response = await fetchImplementation(normalizedEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${normalizedCredential}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch (cause) {
        throw new TrackerNetworkError("Não foi possível acessar a API de eventos.", cause);
      }

      const responseBody = await readResponseBody(response);
      if (!response.ok) {
        throw new TrackerHttpError(
          responseBody?.error ?? `A API recusou o evento com status ${response.status}.`,
          response.status,
          responseBody,
        );
      }
      if (responseBody?.accepted !== true || !responseBody.event) {
        throw new TrackerHttpError("A API não confirmou o recebimento do evento.", response.status, responseBody);
      }

      return responseBody.event;
    },
  });
}
