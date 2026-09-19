import { createTracker } from "../tracker/createTracker.mjs";

const applicationId = process.env.TRACKER_APPLICATION_ID;
const credential = process.env.TRACKER_CREDENTIAL;
const endpoint = process.env.TRACKER_ENDPOINT ?? "http://127.0.0.1:5173/api/events";
const event = process.env.TRACKER_EVENT ?? "tracker_test_event";
const userId = process.env.TRACKER_USER_ID;

if (!applicationId || !credential) {
  console.error([
    "Informe as variáveis de ambiente necessárias:",
    "  TRACKER_APPLICATION_ID=app_xxxxx",
    "  TRACKER_CREDENTIAL=conn_sk_xxxxx",
  ].join("\n"));
  process.exitCode = 1;
} else {
  const tracker = createTracker({ applicationId, credential, endpoint });

  try {
    const storedEvent = await tracker.track(event, userId ? { userId } : undefined);
    console.log(JSON.stringify({ accepted: true, event: storedEvent }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      accepted: false,
      error: error.message,
      status: error.status,
    }, null, 2));
    process.exitCode = 1;
  }
}
