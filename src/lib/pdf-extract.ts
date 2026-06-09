// src/lib/pdf-extract.ts

import pdfParse from "pdf-parse/lib/pdf-parse";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);

  const text = data.text
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!text || text.length < 100) {
    throw new Error("Teks PDF terlalu sedikit atau gagal diekstrak");
  }

  return text;
}
