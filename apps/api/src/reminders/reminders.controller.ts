import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { RemindersService } from "./reminders.service";
import { CreateReminderDto } from "./dto/create-reminder.dto";

@Controller("reminders")
export class RemindersController {
  constructor(@Inject(RemindersService) private readonly reminders: RemindersService) {}

  @Get("queue")
  queue() {
    return this.reminders.queue();
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
