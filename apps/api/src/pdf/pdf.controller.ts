import { Controller, Get, Header, Inject, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { PdfService } from "./pdf.service";

@Controller("pdf")
export class PdfController {
  constructor(@Inject(PdfService) private readonly pdf: PdfService) {}

  private send(
    res: Response,
    file: { buffer: Buffer; filename: string },
    download?: string,
  ) {
    const disposition = download === "1" ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${file.filename}"`);
    res.send(file.buffer);
  }

  @Get("quotes/:id")
  @Header("Content-Type", "application/pdf")
  async quote(@Param("id") id: string, @Query("download") download: string | undefined, @Res() res: Response) {
    this.send(res, await this.pdf.renderQuote(id), download);
  }

  @Get("invoices/:id")
  @Header("Content-Type", "application/pdf")
  async invoice(@Param("id") id: string, @Query("download") download: string | undefined, @Res() res: Response) {
    this.send(res, await this.pdf.renderInvoice(id), download);
  }

  @Get("credit-notes/:id")
  @Header("Content-Type", "application/pdf")
  async creditNote(@Param("id") id: string, @Query("download") download: string | undefined, @Res() res: Response) {
    this.send(res, await this.pdf.renderCreditNote(id), download);
  }
}
