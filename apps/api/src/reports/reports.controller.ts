import { Controller, Get, Header, Inject, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async export(@Res() res: Response, @Query("from") from?: string, @Query("to") to?: string) {
    const csv = await this.reports.exportCsv(from, to);
    res.setHeader("Content-Disposition", 'attachment; filename="rapport-facturier.csv"');
    res.send(csv);
  }

  @Get()
  get(@Query("from") from?: string, @Query("to") to?: string) {
    return this.reports.get(from, to);
  }
}
