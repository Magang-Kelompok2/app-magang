// src/lib/errors.ts
import { NextResponse } from "next/server";
import { isProduction } from "../lib/config";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly userMessage: string,
    public readonly internalMessage?: string
  ) {
    super(internalMessage ?? userMessage);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, "Authentication required");
  }
}

interface ErrorResponse {
  error: string;
  code?: string;
  // Only included in development
  detail?: string;
}

export function errorResponse(
  err: unknown,
  fallbackStatus = 500
): NextResponse<ErrorResponse> {
  if (err instanceof AppError) {
    const body: ErrorResponse = { error: err.userMessage };
    if (!isProduction() && err.internalMessage) {
      body.detail = err.internalMessage;
    }
    return NextResponse.json(body, { status: err.statusCode });
  }

  // Unknown error — never expose internals in production
  const internalMsg = err instanceof Error ? err.message : String(err);
  console.error("[API Error]", internalMsg);

  const body: ErrorResponse = { error: "An internal server error occurred." };
  if (!isProduction()) {
    body.detail = internalMsg;
  }

  return NextResponse.json(body, { status: fallbackStatus });
}