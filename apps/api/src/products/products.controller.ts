import { Body, Controller, Delete, Get, Header, Inject, Param, Patch, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Controller("products")
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly products: ProductsService) {}

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async export(@Res() res: Response) {
    const csv = await this.products.exportCsv();
    res.setHeader("Content-Disposition", 'attachment; filename="tarifs.csv"');
    res.send(csv);
  }

  @Get("categories")
  categories() {
    return this.products.listCategories();
  }

  @Get()
  list(
    @Query("q") q?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("categoryId") categoryId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.products.list({ q, type, status, categoryId, page, pageSize });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.products.get(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.products.remove(id);
  }

  @Post(":id/duplicate")
  duplicate(@Param("id") id: string) {
    return this.products.duplicate(id);
  }
}
