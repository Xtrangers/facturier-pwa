import { Module } from "@nestjs/common";
import { InvoicesModule } from "../invoices/invoices.module";
import { CreditNotesController } from "./credit-notes.controller";
import { CreditNotesService } from "./credit-notes.service";

@Module({
  imports: [InvoicesModule],
  controllers: [CreditNotesController],
  providers: [CreditNotesService],
})
export class CreditNotesModule {}
