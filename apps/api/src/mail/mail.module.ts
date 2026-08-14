import { Module } from "@nestjs/common";
import { PdfModule } from "../pdf/pdf.module";
import { RemindersModule } from "../reminders/reminders.module";
import { MailController } from "./mail.controller";
import { MailService } from "./mail.service";

@Module({
  imports: [PdfModule, RemindersModule],
  controllers: [MailController],
  providers: [MailService],
})
export class MailModule {}
