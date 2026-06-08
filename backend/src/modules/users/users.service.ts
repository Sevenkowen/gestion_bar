import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RoleName } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
  ) {}

  findAll(branchId: number) {
    return this.prisma.user.findMany({
      where: { branchId },
      select: userSelect,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  private async findInBranch(id: number, branchId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, branchId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async assertCanDeactivate(targetId: number, branchId: number, currentUserId: number) {
    if (targetId === currentUserId) {
      throw new BadRequestException('No podés desactivar tu propio usuario');
    }

    const target = await this.findInBranch(targetId, branchId);
    if (target.role !== RoleName.ADMIN) return;

    const activeAdmins = await this.prisma.user.count({
      where: { branchId, role: RoleName.ADMIN, active: true },
    });
    if (activeAdmins <= 1) {
      throw new BadRequestException('Debe quedar al menos un administrador activo');
    }
  }

  async create(dto: CreateUserDto, branchId: number) {
    const passwordHash = await this.auth.hashPassword(dto.password);
    try {
      return await this.prisma.user.create({
        data: {
          username: dto.username,
          name: dto.name,
          role: dto.role,
          branchId,
          passwordHash,
        },
        select: userSelect,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ese nombre de usuario ya existe');
      }
      throw e;
    }
  }

  async update(id: number, branchId: number, currentUserId: number, dto: UpdateUserDto) {
    await this.findInBranch(id, branchId);

    if (dto.active === false) {
      await this.assertCanDeactivate(id, branchId, currentUserId);
    }

    if (id === currentUserId && dto.role && dto.role !== RoleName.ADMIN) {
      throw new BadRequestException('No podés cambiar tu propio rol');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) {
      data.passwordHash = await this.auth.hashPassword(dto.password);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: userSelect,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ese nombre de usuario ya existe');
      }
      throw e;
    }
  }

  async deactivate(id: number, branchId: number, currentUserId: number) {
    return this.update(id, branchId, currentUserId, { active: false });
  }
}
