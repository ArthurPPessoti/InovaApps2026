export const TRACKER_CREDENTIAL_PLACEHOLDER = "<SUA_CREDENCIAL>";

export interface TrackerTestCommand {
  command: string;
  ready: boolean;
}

export function buildTrackerTestCommand(
  applicationId: string,
  credential?: string,
): TrackerTestCommand {
  const normalizedCredential = credential?.trim();
  const ready = Boolean(normalizedCredential);
  return {
    ready,
    command: `$env:TRACKER_APPLICATION_ID = "${applicationId}"
$env:TRACKER_CREDENTIAL = "${normalizedCredential || TRACKER_CREDENTIAL_PLACEHOLDER}"
$env:TRACKER_EVENT = "tracker_test_event"
$env:TRACKER_USER_ID = "user_001"
npm run test:tracker:real`,
  };
}

export function trackerTestCommandButtonLabel(command: TrackerTestCommand, copied: boolean) {
  if (copied) return command.ready ? "Comando copiado" : "Modelo copiado";
  return command.ready ? "Copiar comando pronto" : "Copiar modelo de comando";
}
