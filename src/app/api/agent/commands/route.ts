import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_COMMAND_NAMES } from "@/application/commands/asset-commands";
import { AiCommandDispatcher } from "@/application/commands/ai-command-dispatcher";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";

const schema = z.object({
  command: z.enum(AI_COMMAND_NAMES),
  idempotencyKey: z.string().trim().min(8).max(200),
  payload: z.unknown(),
});
const dispatcher = new AiCommandDispatcher();

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const result = await dispatcher.dispatch(
      schema.parse(await request.json()),
      session.profile,
      request,
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMAND_FAILED",
          message: error instanceof Error ? error.message : "Command failed.",
        },
      },
      { status: 400 },
    );
  }
}
