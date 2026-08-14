import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class QuoteLineDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @MaxLength(200)
  designation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsIn(["PIECE", "HOUR", "DAY", "METER", "FLAT"])
  unit!: "PIECE" | "HOUR" | "DAY" | "METER" | "FLAT";

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPriceCents!: number;

  @IsOptional()
  @IsIn(["NONE", "PERCENT", "AMOUNT"])
  discountKind?: "NONE" | "PERCENT" | "AMOUNT";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discountValue?: number;

  @Type(() => Number)
  @IsInt()
  @IsIn([0, 550, 1000, 2000])
  taxRateBps!: number;
}

export class CreateQuoteDto {
  @IsString()
  clientId!: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  terms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  internalNotes?: string;

  @IsOptional()
  @IsIn(["NONE", "PERCENT", "AMOUNT"])
  discountKind?: "NONE" | "PERCENT" | "AMOUNT";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelFeeCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 550, 1000, 2000])
  travelFeeTaxRateBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  depositCents?: number;

  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  @ArrayMinSize(1)
  lines!: QuoteLineDto[];
}
