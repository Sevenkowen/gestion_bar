import { IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddOrderItemDto {
  @ApiPropertyOptional({ example: 1, description: 'Ítem del menú (precio de carta)' })
  @ValidateIf((o) => !o.productId && !o.comboId)
  @IsInt()
  menuItemId?: number;

  @ApiPropertyOptional({ example: 1 })
  @ValidateIf((o) => !o.comboId && !o.menuItemId)
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({ example: 1 })
  @ValidateIf((o) => !o.productId && !o.menuItemId)
  @IsInt()
  comboId?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'Sin cebolla' })
  @IsOptional()
  @IsString()
  notes?: string;
}
