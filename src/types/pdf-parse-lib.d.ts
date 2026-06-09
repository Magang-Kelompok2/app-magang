declare module "pdf-parse/lib/pdf-parse" {
  type PdfParseResult = {
    text: string;
  };

  function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;

  export default pdfParse;
}
