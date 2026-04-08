//lib/Minio.ts
import * as Minio from "minio";
import { config } from "./config";

declare global {
  var __minioClient: Minio.Client | undefined;
}

function createMinioClient(): Minio.Client {
  return new Minio.Client({
    endPoint: config.minio.endpoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });
}

if (!global.__minioClient) {
  global.__minioClient = createMinioClient();
}

if (!global.__minioClient) {
  global.__minioClient = createMinioClient();
}

export const minioClient: Minio.Client = global.__minioClient;

/**
 * Sanitize a filename to prevent path traversal.
 * Rejects any name containing path separators or null bytes.
 * Returns the sanitized name or throws ValidationError.
 */
export function sanitizeObjectName(raw: string): string {
  // Decode percent-encoding first
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    throw new Error("Invalid filename encoding");
  }

  // Reject path traversal patterns
  if (
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.startsWith(".")
  ) {
    throw new Error(`Invalid filename: "${raw}"`);
  }

  // Only allow safe characters: alphanumeric, dash, underscore, dot, space
  if (!/^[\w\s\-.]+$/.test(name)) {
    throw new Error(`Filename contains disallowed characters: "${raw}"`);
  }

  return name;
}