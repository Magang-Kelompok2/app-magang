// src/lib/Minio.ts
import * as Minio from "minio";
import { config } from "./config";

declare global {
  // eslint-disable-next-line no-var
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

export const minioClient: Minio.Client = global.__minioClient;

export function sanitizeObjectName(raw: string): string {
  let name: string;

  try {
    name = decodeURIComponent(raw);
  } catch {
    throw new Error("Invalid filename encoding");
  }

  if (
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.startsWith(".")
  ) {
    throw new Error(`Invalid filename: "${raw}"`);
  }

  if (!/^[\w\s\-.]+$/.test(name)) {
    throw new Error(`Filename contains disallowed characters: "${raw}"`);
  }

  return name;
}

export async function uploadPutusanPdf(
  fileName: string,
  buffer: Buffer,
): Promise<string> {
  const objectName = sanitizeObjectName(fileName);

  await minioClient.putObject(
    config.minio.bucket,
    objectName,
    buffer,
    buffer.length,
    {
      "Content-Type": "application/pdf",
    },
  );

  return objectName;
}

export async function deletePutusanPdf(fileName: string): Promise<void> {
  const objectName = sanitizeObjectName(fileName);

  await minioClient.removeObject(config.minio.bucket, objectName);
}
