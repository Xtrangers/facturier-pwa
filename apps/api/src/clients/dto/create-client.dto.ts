import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, ValidateIf, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AddressDto {
  @IsString()
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

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
}

export class PrimaryContactDto {
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class CreateClientDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsIn(["INDIVIDUAL", "COMPANY"])
  type!: "INDIVIDUAL" | "COMPANY";

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "BLOCKED"])
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED";

  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress!: AddressDto;

  @IsOptional()
  @IsBoolean()
  shippingSameAsBilling?: boolean;

  @ValidateIf((o: CreateClientDto) => o.shippingSameAsBilling === false)
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @ValidateIf((_, v) => typeof v === "string" && v.length > 0)
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
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrimaryContactDto)
  primaryContact?: PrimaryContactDto;
}
