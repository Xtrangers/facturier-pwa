import { Body, Controller, Get, Header, Inject, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { PaymentsService } from "./payments.service";
import { RecordPaymentDto } from "./dto/record-payment.dto";

@Controller("payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Get("open-invoices")
  openInvoices() {
    return this.payments.openInvoices();
  }

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async export(
    @Res() res: Response,
    @Query("q") q?: string,
    @Query("method") method?: string,
    @Query("clientId") clientId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const csv = await this.payments.exportCsv({ q, method, clientId, from, to });
    res.setHeader("Content-Disposition", 'attachment; filename="paiements.csv"');
    res.send(csv);
  }

  @Get()
  list(
    @Query("q") q?: string,
    @Query("method") method?: string,
    @Query("clientId") clientId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.payments.list({ q, method, clientId, from, to });
  }

  @Post()
  create(@Body() dto: RecordPaymentDto) {
    return this.payments.create(dto);
  }
}
