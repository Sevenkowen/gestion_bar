import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UnitType, IngredientKind } from '@prisma/client';

export class CreateIngredientDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  unit!: UnitType;

  @ApiPropertyOptional({ enum: IngredientKind, default: IngredientKind.COCINA })
  @IsOptional()
  @IsEnum(IngredientKind)
  kind?: IngredientKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}

export class UpdateIngredientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: UnitType })
  @IsOptional()
  @IsEnum(UnitType)
  unit?: UnitType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ enum: IngredientKind })
  @IsOptional()
  @IsEnum(IngredientKind)
  kind?: IngredientKind;
}

export class AdjustStockDto {
  @ApiProperty({ description: 'Cantidad a sumar (positivo) o restar (negativo)' })
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
