import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { ProductosService } from './productos.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('productos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.MOZO, RoleName.CAJA)
  findAll(@Request() req: { user: { branchId: number } }) {
    return this.productosService.findAll(req.user.branchId);
  }

  @Get('disponibles')
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  findAvailable(@Request() req: { user: { branchId: number } }) {
    return this.productosService.findAvailable(req.user.branchId);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: { user: { branchId: number } }) {
    return this.productosService.findOne(id, req.user.branchId);
  }

  @Post()
  @Roles(RoleName.ADMIN)
  create(@Body() dto: CreateProductDto, @Request() req: { user: { branchId: number } }) {
    return this.productosService.create(req.user.branchId, dto);
  }

  @Put(':id')
  @Roles(RoleName.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.productosService.update(id, req.user.branchId, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: { user: { branchId: number } }) {
    return this.productosService.remove(id, req.user.branchId);
  }
}
