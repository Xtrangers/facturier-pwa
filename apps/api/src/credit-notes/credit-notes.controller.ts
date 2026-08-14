import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { CreditNotesService } from "./credit-notes.service";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";

@Controller("credit-notes")
export class CreditNotesController {
  constructor(@Inject(CreditNotesService) private readonly notes: CreditNotesService) {}

  @Get()
  list(
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("invoiceId") invoiceId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.notes.list({ q, status, invoiceId, page, pageSize });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.notes.get(id);
  }

  @Post()
  create(@Body() dto: CreateCreditNoteDto) {
    return this.notes.create(dto);
  }

  @Post(":id/issue")
  issue(@Param("id") id: string) {
    return this.notes.issue(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.notes.remove(id);
  }
}
