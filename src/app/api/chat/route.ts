// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../lib/config";
import { errorResponse, ValidationError } from "../../../lib/errors";

interface ChatRequestBody {
  message: string;
  session_id?: string;
}

function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && /^[\w-]{1,64}$/.test(id);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON");
    }

    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body must be a JSON object");
    }

    const { message, session_id } = body as Partial<ChatRequestBody>;

    if (!message || typeof message !== "string") {
      throw new ValidationError("Field 'message' is required and must be a string");
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      throw new ValidationError("Message cannot be empty");
    }
    if (trimmedMessage.length > 2000) {
      throw new ValidationError("Message too long (max 2000 characters)");
    }

    // Validate session_id format to prevent injection
    const validatedSessionId =
      session_id && isValidSessionId(session_id) ? session_id : "default";

    const payload: ChatRequestBody = {
      message: trimmedMessage,
      session_id: validatedSessionId,
    };

    const res = await fetch(`${config.server.fastapiUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300_000), // 5 min timeout
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown upstream error");
      // Log the internal error, return generic message to client
      console.error(`[Chat API] FastAPI returned ${res.status}: ${errText}`);
      throw new Error(`Upstream error (${res.status})`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "The AI service took too long to respond. Please try again." },
        { status: 504 }
      );
    }
    return errorResponse(err);
  }
}