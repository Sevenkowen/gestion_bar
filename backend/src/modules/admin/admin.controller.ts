import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  @Roles(RoleName.ADMIN)
  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ordersToday, ingredients, pendingPrints] = await Promise.all([
      this.prisma.payment.count({ where: { createdAt: { gte: today } } }),
      this.prisma.ingredient.findMany({ where: { active: true } }),
      this.prisma.printJob.count({ where: { status: 'PENDIENTE' } }),
    ]);

    const lowStock = ingredients.filter((i) => i.currentStock.lte(i.minStock)).length;

    return { ordersToday, lowStockAlerts: lowStock, pendingPrintJobs: pendingPrints };
  }
}
