import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MenuItemType } from '@prisma/client';

export class CreateMenuItemDto {
  @ApiProperty()
  @IsInt()
  sectionId!: number;

  @ApiProperty({ enum: MenuItemType })
  @IsEnum(MenuItemType)
  type!: MenuItemType;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === MenuItemType.PRODUCT)
  @IsInt()
  productId?: number;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === MenuItemType.COMBO)
  @IsInt()
  comboId?: number;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === MenuItemType.INSUMO)
  @IsInt()
  ingredientId?: number;

  @ApiProperty({ example: 4500 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class UpdateMenuItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sectionId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
