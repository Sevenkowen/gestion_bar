import { Controller, Get, Post, Param, Body, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CajaService } from './caja.service';
import { CobrarDto } from './dto/cobrar.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('caja')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('caja')
export class CajaController {
  constructor(private cajaService: CajaService) {}

  @Get('mesas-pendientes')
  @Roles(RoleName.ADMIN, RoleName.CAJA)
  @ApiOperation({ summary: 'Mesas con cuenta pedida' })
  pending(@Request() req: { user: { branchId: number } }) {
    return this.cajaService.getPendingTables(req.user.branchId);
  }

  @Post('cobrar/:orderId')
  @Roles(RoleName.ADMIN, RoleName.CAJA)
  @ApiOperation({ summary: 'Cobrar y cerrar mesa' })
  cobrar(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CobrarDto,
    @Request() req: { user: { id: number; branchId: number } },
  ) {
    return this.cajaService.cobrar(orderId, dto, req.user.id, req.user.branchId);
  }

  @Get('historial')
  @Roles(RoleName.ADMIN, RoleName.CAJA)
  @ApiOperation({ summary: 'Historial de ventas del día' })
  history(
    @Request() req: { user: { branchId: number } },
    @Query('date') date?: string,
  ) {
    return this.cajaService.getSalesHistory(req.user.branchId, date);
  }
}
