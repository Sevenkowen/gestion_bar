import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PrintSector } from '@prisma/client';

export class RecipeLineDto {
  @ApiProperty()
  @IsInt()
  ingredientId!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty()
  @IsInt()
  categoryId!: number;

  @ApiProperty({ enum: PrintSector })
  @IsEnum(PrintSector)
  printSector!: PrintSector;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  manualAvailable?: boolean;

  @ApiPropertyOptional({ type: [RecipeLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  recipe?: RecipeLineDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ enum: PrintSector })
  @IsOptional()
  @IsEnum(PrintSector)
  printSector?: PrintSector;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  manualAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: [RecipeLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  recipe?: RecipeLineDto[];
}
