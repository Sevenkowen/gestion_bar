import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrintSector } from '@prisma/client';

export class CreatePrinterDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: PrintSector })
  @IsEnum(PrintSector)
  sector!: PrintSector;

  @ApiProperty({ example: '192.168.1.100:9100' })
  @IsString()
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  connectionType?: string;
}

export class UpdatePrinterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
