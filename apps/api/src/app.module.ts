import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ClientsModule } from "./clients/clients.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [PrismaModule, ClientsModule, ProductsModule],
})
export class AppModule {}
