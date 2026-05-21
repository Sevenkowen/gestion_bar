import { Controller, Get, Post, Put, Param, Body, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { MesasService } from './mesas.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('mesas')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('mesas')
export class MesasController {
  constructor(private mesasService: MesasService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.MOZO, RoleName.CAJA)
  @ApiOperation({ summary: 'Listar mesas con estado' })
  findAll(@Request() req: { user: { branchId: number } }) {
    return this.mesasService.findAll(req.user.branchId);
  }

  @Get('admin')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Listar todas las mesas (admin)' })
  findAllAdmin(@Request() req: { user: { branchId: number } }) {
    return this.mesasService.findAllAdmin(req.user.branchId);
  }

  @Post()
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Crear mesa' })
  create(@Body() dto: CreateTableDto, @Request() req: { user: { branchId: number } }) {
    return this.mesasService.createTable(req.user.branchId, dto);
  }

  @Put(':id')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Actualizar mesa' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.mesasService.updateTable(id, req.user.branchId, dto);
  }

  @Post(':id/abrir')
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  @ApiOperation({ summary: 'Abrir mesa y crear pedido' })
  open(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; branchId: number } },
  ) {
    return this.mesasService.openTable(id, req.user.id, req.user.branchId);
  }
}
