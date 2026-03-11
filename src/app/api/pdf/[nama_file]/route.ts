// src/app/api/pdf/[nama_file]/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as Minio from "minio";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT ?? "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

const BUCKET = process.env.MINIO_BUCKET!;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nama_file: string }> },
) {
  const { nama_file } = await params;
  const namaFile = decodeURIComponent(nama_file);

  try {
    const stream = await minioClient.getObject(BUCKET, namaFile);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${namaFile}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("MinIO error:", err);
    return NextResponse.json(
      { error: `File tidak ditemukan: ${namaFile}` },
      { status: 404 },
    );
  }
}
