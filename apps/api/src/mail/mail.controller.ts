import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { MailService } from "./mail.service";
import { SendMailDto, SendReminderMailDto } from "./dto/send-mail.dto";

@Controller("mail")
export class MailController {
  constructor(@Inject(MailService) private readonly mail: MailService) {}

  @Get()
  list(
    @Query("quoteId") quoteId?: string,
    @Query("invoiceId") invoiceId?: string,
    @Query("creditNoteId") creditNoteId?: string,
  ) {
    return this.mail.list({ quoteId, invoiceId, creditNoteId });
  }

  @Post("quotes/:id")
  sendQuote(@Param("id") id: string, @Body() dto: SendMailDto) {
    return this.mail.sendQuote(id, dto);
  }

  @Post("invoices/:id")
  sendInvoice(@Param("id") id: string, @Body() dto: SendMailDto) {
    return this.mail.sendInvoice(id, dto);
  }

  @Post("credit-notes/:id")
  sendCreditNote(@Param("id") id: string, @Body() dto: SendMailDto) {
    return this.mail.sendCreditNote(id, dto);
  }

  @Post("reminders")
  sendReminder(@Body() dto: SendReminderMailDto) {
    return this.mail.sendReminder(dto);
  }
}
