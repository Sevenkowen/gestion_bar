import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { PedidosService } from './pedidos.service';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('pedidos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('pedidos')
export class PedidosController {
  constructor(private pedidosService: PedidosService) {}

  @Get('mesa/:tableId')
  @Roles(RoleName.ADMIN, RoleName.MOZO, RoleName.CAJA)
  @ApiOperation({ summary: 'Obtener pedido activo de una mesa' })
  findByTable(@Param('tableId', ParseIntPipe) tableId: number) {
    return this.pedidosService.findByTable(tableId);
  }

  @Post(':id/items')
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  @ApiOperation({ summary: 'Agregar producto o combo al pedido' })
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrderItemDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.pedidosService.addItem(id, dto, req.user.branchId);
  }

  @Put(':id/items/:itemId')
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  @ApiOperation({ summary: 'Modificar cantidad de ítem borrador' })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateOrderItemDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.pedidosService.updateItem(id, itemId, dto, req.user.branchId);
  }

  @Delete(':id/items/:itemId')
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  @ApiOperation({ summary: 'Eliminar ítem borrador' })
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.pedidosService.removeItem(id, itemId, req.user.branchId);
  }

  @Post(':id/enviar')
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  @ApiOperation({ summary: 'Enviar ítems borrador a cocina/barra' })
  send(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.pedidosService.sendOrder(id, req.user.branchId);
  }

  @Post(':id/cuenta')
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  @ApiOperation({ summary: 'Pedir cuenta' })
  requestBill(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.pedidosService.requestBill(id, req.user.branchId);
  }
}
