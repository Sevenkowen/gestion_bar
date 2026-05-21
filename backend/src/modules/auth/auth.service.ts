import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { promisify } from 'util';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

const bcryptCompare = promisify(bcrypt.compare);
const bcryptHash = promisify(bcrypt.hash);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { branch: true },
    });

    if (!user?.active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcryptCompare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch.name,
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcryptHash(password, 12) as Promise<string>;
  }
}
