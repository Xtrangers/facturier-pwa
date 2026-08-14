import { Body, Controller, Delete, Get, Header, Inject, Param, Patch, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";

@Controller("clients")
export class ClientsController {
  constructor(@Inject(ClientsService) private readonly clients: ClientsService) {}

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async export(@Res() res: Response) {
    const csv = await this.clients.exportCsv();
    res.setHeader("Content-Disposition", 'attachment; filename="clients.csv"');
    res.send(csv);
  }

  @Get()
  list(
    @Query("q") q?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.clients.list({ q, type, status, page, pageSize });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.clients.get(id);
  }

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clients.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.clients.remove(id);
  }

  @Post(":id/duplicate")
  duplicate(@Param("id") id: string) {
    return this.clients.duplicate(id);
  }
}
