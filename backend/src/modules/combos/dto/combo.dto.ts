import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ComboProductDto {
  @ApiProperty()
  @IsInt()
  productId!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateComboDto {
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

  @ApiProperty({ type: [ComboProductDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboProductDto)
  products!: ComboProductDto[];
}

export class UpdateComboDto {
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
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: [ComboProductDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboProductDto)
  products?: ComboProductDto[];
}
