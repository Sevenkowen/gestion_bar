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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(RoleName.ADMIN)
  findAll(@Request() req: { user: { branchId: number } }) {
    return this.usersService.findAll(req.user.branchId);
  }

  @Post()
  @Roles(RoleName.ADMIN)
  create(@Body() body: CreateUserDto, @Request() req: { user: { branchId: number } }) {
    return this.usersService.create(body, req.user.branchId);
  }

  @Put(':id')
  @Roles(RoleName.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @Request() req: { user: { id: number; branchId: number } },
  ) {
    return this.usersService.update(id, req.user.branchId, req.user.id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; branchId: number } },
  ) {
    return this.usersService.deactivate(id, req.user.branchId, req.user.id);
  }
}
