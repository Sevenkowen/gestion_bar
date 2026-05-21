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
import { MenuService } from './menu.service';
import { CreateMenuSectionDto, UpdateMenuSectionDto } from './dto/menu-section.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('menu')
export class MenuController {
  constructor(private service: MenuService) {}

  @Get('carta')
  @Roles(RoleName.ADMIN, RoleName.MOZO)
  findCarta(@Request() req: { user: { branchId: number } }) {
    return this.service.findCarta(req.user.branchId);
  }

  @Get('sections')
  @Roles(RoleName.ADMIN)
  findAllSections(@Request() req: { user: { branchId: number } }) {
    return this.service.findAllSections(req.user.branchId);
  }

  @Post('sections')
  @Roles(RoleName.ADMIN)
  createSection(
    @Body() dto: CreateMenuSectionDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.service.createSection(req.user.branchId, dto);
  }

  @Put('sections/:id')
  @Roles(RoleName.ADMIN)
  updateSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuSectionDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.service.updateSection(id, req.user.branchId, dto);
  }

  @Delete('sections/:id')
  @Roles(RoleName.ADMIN)
  removeSection(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.service.removeSection(id, req.user.branchId);
  }

  @Post('items')
  @Roles(RoleName.ADMIN)
  createItem(@Body() dto: CreateMenuItemDto, @Request() req: { user: { branchId: number } }) {
    return this.service.createItem(req.user.branchId, dto);
  }

  @Put('items/:id')
  @Roles(RoleName.ADMIN)
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuItemDto,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.service.updateItem(id, req.user.branchId, dto);
  }

  @Delete('items/:id')
  @Roles(RoleName.ADMIN)
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { branchId: number } },
  ) {
    return this.service.removeItem(id, req.user.branchId);
  }
}
