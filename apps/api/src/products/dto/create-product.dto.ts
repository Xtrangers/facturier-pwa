import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sku?: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoryName?: string;

  @IsIn(["MATERIAL", "LABOR", "SERVICE", "TRAVEL"])
  type!: "MATERIAL" | "LABOR" | "SERVICE" | "TRAVEL";

  @IsIn(["PIECE", "HOUR", "DAY", "METER", "FLAT"])
  unit!: "PIECE" | "HOUR" | "DAY" | "METER" | "FLAT";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  purchasePriceCents?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  salePriceHtCents!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 550, 1000, 2000])
  taxRateBps?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stockQty?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "ARCHIVED";
}
