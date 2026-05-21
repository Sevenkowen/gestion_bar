import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

class PaymentLineDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class CobrarDto {
  @ApiProperty({ type: [PaymentLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentLineDto)
  payments!: PaymentLineDto[];
}
