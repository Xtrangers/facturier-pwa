import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

export class SendMailDto {
  @IsOptional()
  @ValidateIf((_, value) => typeof value === "string" && value.length > 0)
  @IsEmail()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  message?: string;
}

export class SendReminderMailDto extends SendMailDto {
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
  @IsIn([1, 2, 3])
  level!: 1 | 2 | 3;
}
