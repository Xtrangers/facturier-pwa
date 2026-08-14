import { Controller, Get, Header, Inject, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(@Inject(DocumentsService) private readonly documents: DocumentsService) {}

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async export(
    @Res() res: Response,
    @Query("q") q?: string,
    @Query("kind") kind?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const csv = await this.documents.exportCsv({ q, kind, from, to });
    res.setHeader("Content-Disposition", 'attachment; filename="documents.csv"');
    res.send(csv);
  }

  @Get()
  list(
    @Query("q") q?: string,
    @Query("kind") kind?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.documents.list({ q, kind, from, to });
  }
}
