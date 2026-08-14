import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { QuotesService } from "./quotes.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { UpdateQuoteDto, UpdateQuoteStatusDto } from "./dto/update-quote.dto";

@Controller("quotes")
export class QuotesController {
  constructor(@Inject(QuotesService) private readonly quotes: QuotesService) {}

  @Get()
  list(
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("clientId") clientId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.quotes.list({ q, status, clientId, page, pageSize });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.quotes.get(id);
  }

  @Post()
  create(@Body() dto: CreateQuoteDto) {
    return this.quotes.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotes.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.quotes.remove(id);
  }

  @Post(":id/duplicate")
  duplicate(@Param("id") id: string) {
    return this.quotes.duplicate(id);
  }

  @Post(":id/status")
  changeStatus(@Param("id") id: string, @Body() dto: UpdateQuoteStatusDto) {
    return this.quotes.changeStatus(id, dto.status);
  }
}
