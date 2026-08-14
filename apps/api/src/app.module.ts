import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ClientsModule } from "./clients/clients.module";
import { ProductsModule } from "./products/products.module";
import { QuotesModule } from "./quotes/quotes.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { CreditNotesModule } from "./credit-notes/credit-notes.module";
import { RemindersModule } from "./reminders/reminders.module";

@Module({
  imports: [PrismaModule, ClientsModule, ProductsModule, QuotesModule, InvoicesModule, CreditNotesModule, RemindersModule],
})
export class AppModule {}
