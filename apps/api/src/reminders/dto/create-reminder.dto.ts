import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateReminderDto {
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  level!: 1 | 2 | 3;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
