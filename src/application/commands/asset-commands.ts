export const AI_COMMAND_NAMES = [
  "CreateRepairTicket",
  "AssignTechnician",
  "CompletePM",
  "TransferAsset",
  "SellAsset",
] as const;

export type AiCommandName = (typeof AI_COMMAND_NAMES)[number];

export interface AiCommandEnvelope {
  readonly command: AiCommandName;
  readonly idempotencyKey: string;
  readonly payload: unknown;
}

export interface AiCommandResult {
  readonly commandId: string;
  readonly command: AiCommandName;
  readonly entityId: string;
  readonly status: "completed";
}
