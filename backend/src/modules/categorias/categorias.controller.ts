import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CategoriasService } from './categorias.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('categorias')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('categorias')
export class CategoriasController {
  constructor(private service: CategoriasService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  findAll(@Request() req: { user: { branchId: number } }) {
    return this.service.findAll(req.user.branchId);
  }

  @Post()
  @Roles(RoleName.ADMIN)
  create(@Body() dto: CreateCategoryDto, @Request() req: { user: { branchId: number } }) {
    return this.service.create(req.user.branchId, dto);
  }

  @Put(':id')
  @Roles(RoleName.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.service.update(id, req.user.branchId, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: { user: { branchId: number } }) {
    return this.service.remove(id, req.user.branchId);
  }
}
