import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

export class UpdateSettingsDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsString()
  @MaxLength(200)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsString()
  @MaxLength(12)
  postalCode!: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @ValidateIf((_, value) => typeof value === "string" && value.length > 0)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  siret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vatNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  iban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  bic?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{1,8}$/)
  clientPrefix?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{1,8}$/)
  quotePrefix?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{1,8}$/)
  invoicePrefix?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{1,8}$/)
  creditPrefix?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 550, 1000, 2000])
  defaultTaxRateBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  defaultDueDays?: number;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  pdfPrimaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  legalMentions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  termsAndConditions?: string;
}
