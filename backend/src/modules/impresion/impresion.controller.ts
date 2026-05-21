import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { ImpresionService } from './impresion.service';
import { CreatePrinterDto, UpdatePrinterDto } from './dto/printer.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('impresion')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('impresion')
export class ImpresionController {
  constructor(
    private impresionService: ImpresionService,
    private prisma: PrismaService,
  ) {}

  @Get('jobs')
  @Roles(RoleName.ADMIN)
  listJobs() {
    return this.prisma.printJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get('jobs/pendientes')
  @Roles(RoleName.ADMIN)
  pending() {
    return this.impresionService.getPendingJobs();
  }

  @Get('impresoras')
  @Roles(RoleName.ADMIN)
  listPrinters(@Request() req: { user: { branchId: number } }) {
    return this.impresionService.findAllPrinters(req.user.branchId);
  }

  @Post('impresoras')
  @Roles(RoleName.ADMIN)
  createPrinter(
    @Body() dto: CreatePrinterDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.impresionService.createPrinter(req.user.branchId, dto);
  }

  @Put('impresoras/:id')
  @Roles(RoleName.ADMIN)
  updatePrinter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrinterDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.impresionService.updatePrinter(id, req.user.branchId, dto);
  }
}
