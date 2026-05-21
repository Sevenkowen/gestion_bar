import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'mozo1' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'mozo123' })
  @IsString()
  @MinLength(4)
  password!: string;
}
