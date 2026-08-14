import { PartialType } from "@nestjs/mapped-types";
import { IsIn } from "class-validator";
import { CreateQuoteDto } from "./create-quote.dto";

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}

export class UpdateQuoteStatusDto {
  @IsIn(["SENT", "PENDING", "ACCEPTED", "REJECTED", "EXPIRED"])
  status!: "SENT" | "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
}
