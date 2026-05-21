import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
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
  create(
    @Body() body: { username: string; password: string; name: string; role: RoleName },
    @Request() req: { user: { branchId: number } },
  ) {
    return this.usersService.create({ ...body, branchId: req.user.branchId });
  }
}
