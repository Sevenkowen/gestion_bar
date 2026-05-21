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
import { CombosService } from './combos.service';
import { CreateComboDto, UpdateComboDto } from './dto/combo.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('combos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('combos')
export class CombosController {
  constructor(private combosService: CombosService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  findAll(@Request() req: { user: { branchId: number } }) {
    return this.combosService.findAll(req.user.branchId);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: { user: { branchId: number } }) {
    return this.combosService.findOne(id, req.user.branchId);
  }

  @Post()
  @Roles(RoleName.ADMIN)
  create(@Body() dto: CreateComboDto, @Request() req: { user: { branchId: number } }) {
    return this.combosService.create(req.user.branchId, dto);
  }

  @Put(':id')
  @Roles(RoleName.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComboDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.combosService.update(id, req.user.branchId, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: { user: { branchId: number } }) {
    return this.combosService.remove(id, req.user.branchId);
  }
}
