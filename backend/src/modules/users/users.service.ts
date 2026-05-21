import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RoleName } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
  ) {}

  findAll(branchId: number) {
    return this.prisma.user.findMany({
      where: { branchId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async create(data: {
    username: string;
    password: string;
    name: string;
    role: RoleName;
    branchId: number;
  }) {
    const passwordHash = await this.auth.hashPassword(data.password);
    return this.prisma.user.create({
      data: { ...data, passwordHash },
      select: { id: true, username: true, name: true, role: true },
    });
  }
}
