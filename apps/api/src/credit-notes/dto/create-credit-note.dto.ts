import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateCreditNoteDto {
  @IsString()
  invoiceId!: string;

  @IsIn(["TOTAL", "PARTIAL"])
  kind!: "TOTAL" | "PARTIAL";

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 550, 1000, 2000])
  taxRateBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalHtCents?: number;
}
