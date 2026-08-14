import { PartialType } from "@nestjs/mapped-types";
import { IsIn } from "class-validator";
import { CreateInvoiceDto } from "./create-invoice.dto";

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class UpdateInvoiceStatusDto {
  @IsIn(["SENT", "OVERDUE"])
  status!: "SENT" | "OVERDUE";
}
