import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class RecordPaymentDto {
  @IsString()
  invoiceId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsIn(["TRANSFER", "CARD", "CHECK", "CASH", "DIRECT_DEBIT"])
  method!: "TRANSFER" | "CARD" | "CHECK" | "CASH" | "DIRECT_DEBIT";

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
