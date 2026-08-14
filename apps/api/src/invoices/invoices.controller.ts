import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto, CreatePaymentDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto, UpdateInvoiceStatusDto } from "./dto/update-invoice.dto";

@Controller("invoices")
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly invoices: InvoicesService) {}

  @Get()
  list(
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("clientId") clientId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.invoices.list({ q, status, clientId, page, pageSize });
  }

  @Post("from-quote/:quoteId")
  fromQuote(@Param("quoteId") quoteId: string) {
    return this.invoices.fromQuote(quoteId);
  }

  @Get(":id/payments")
  payments(@Param("id") id: string) {
    return this.invoices.listPayments(id);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.invoices.get(id);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoices.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoices.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.invoices.remove(id);
  }

  @Post(":id/duplicate")
  duplicate(@Param("id") id: string) {
    return this.invoices.duplicate(id);
  }

  @Post(":id/issue")
  issue(@Param("id") id: string) {
    return this.invoices.issue(id);
  }

  @Post(":id/status")
  changeStatus(@Param("id") id: string, @Body() dto: UpdateInvoiceStatusDto) {
    return this.invoices.changeStatus(id, dto.status);
  }

  @Post(":id/payments")
  addPayment(@Param("id") id: string, @Body() dto: CreatePaymentDto) {
    return this.invoices.addPayment(id, dto);
  }
}
