// src/app/api/pdf/[nama_file]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { minioClient, sanitizeObjectName } from "../../../../lib/minio";
import { config } from "../../../../lib/config";
import { errorResponse, NotFoundError, ValidationError } from "../../../../lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nama_file: string }> }
): Promise<NextResponse> {
  try {
    const { nama_file } = await params;

    // SECURITY: sanitize before any I/O — throws on path traversal
    let safeFilename: string;
    try {
      safeFilename = sanitizeObjectName(nama_file);
    } catch (err) {
      throw new ValidationError(
        err instanceof Error ? err.message : "Invalid filename"
      );
    }

    // Only serve PDFs
    if (!safeFilename.toLowerCase().endsWith(".pdf")) {
      throw new ValidationError("Only PDF files may be served via this endpoint");
    }

    let stream: NodeJS.ReadableStream;
    try {
      stream = await minioClient.getObject(config.minio.bucket, safeFilename);
    } catch (err: unknown) {
      // MinIO throws with code "NoSuchKey" for missing objects
      const code = (err as { code?: string })?.code;
      if (code === "NoSuchKey" || code === "NotFound") {
        throw new NotFoundError(`File '${safeFilename}'`);
      }
      // Other MinIO errors (connection, auth) → 500
      throw err;
    }

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // inline: render in browser. Use "attachment" to force download.
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Content-Length": buffer.length.toString(),
        // Prevent caching of sensitive documents in shared environments
        "Cache-Control": "private, no-store",
        // Basic security headers
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}