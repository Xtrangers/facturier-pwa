import { Body, Controller, Get, Header, Inject, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { RemindersService } from "./reminders.service";
import { CreateReminderDto } from "./dto/create-reminder.dto";

@Controller("reminders")
export class RemindersController {
  constructor(@Inject(RemindersService) private readonly reminders: RemindersService) {}

  @Get("queue")
  queue() {
    return this.reminders.queue();
  }

  @Get("summary")
  summary() {
    return this.reminders.summary();
  }

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async export(@Res() res: Response) {
    const csv = await this.reminders.exportQueueCsv();
    res.setHeader("Content-Disposition", 'attachment; filename="relances.csv"');
    res.send(csv);
  }

  @Get()
  list() {
    return this.reminders.list();
  }

  @Post()
  create(@Body() dto: CreateReminderDto) {
    return this.reminders.create(dto);
  }
}
