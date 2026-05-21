import { Module } from '@nestjs/common';
import { ImpresionService } from './impresion.service';
import { ImpresionController } from './impresion.controller';

@Module({
  controllers: [ImpresionController],
  providers: [ImpresionService],
  exports: [ImpresionService],
})
export class ImpresionModule {}
