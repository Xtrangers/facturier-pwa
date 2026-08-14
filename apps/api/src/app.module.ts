import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ClientsModule } from "./clients/clients.module";
import { ProductsModule } from "./products/products.module";
import { QuotesModule } from "./quotes/quotes.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { CreditNotesModule } from "./credit-notes/credit-notes.module";
import { RemindersModule } from "./reminders/reminders.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ReportsModule } from "./reports/reports.module";
import { PaymentsModule } from "./payments/payments.module";
import { DocumentsModule } from "./documents/documents.module";
import { SettingsModule } from "./settings/settings.module";

@Module({
  imports: [
    PrismaModule,
    ClientsModule,
    ProductsModule,
    QuotesModule,
    InvoicesModule,
    CreditNotesModule,
    RemindersModule,
    DashboardModule,
    ReportsModule,
    PaymentsModule,
    DocumentsModule,
    SettingsModule,
  ],
})
export class AppModule {}
