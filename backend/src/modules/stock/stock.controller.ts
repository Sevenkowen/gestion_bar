import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IngredientKind, RoleName } from '@prisma/client';
import { StockService } from './stock.service';
import {
  CreateIngredientDto,
  UpdateIngredientDto,
  AdjustStockDto,
} from './dto/ingredient.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('insumos y stock')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private stockService: StockService) {}

  @Get('ingredientes')
  @Roles(RoleName.ADMIN)
  @ApiQuery({ name: 'kind', enum: IngredientKind, required: false })
  listIngredients(@Query('kind') kind?: IngredientKind) {
    return this.stockService.findAllIngredients(kind);
  }

  @Post('ingredientes')
  @Roles(RoleName.ADMIN)
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.stockService.createIngredient(dto);
  }

  @Put('ingredientes/:id')
  @Roles(RoleName.ADMIN)
  updateIngredient(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIngredientDto) {
    return this.stockService.updateIngredient(id, dto);
  }

  @Post('ingredientes/:id/ajustar')
  @Roles(RoleName.ADMIN)
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.stockService.adjustStock(id, dto.quantity, req.user.id, dto.notes);
  }

  @Post('recalcular-disponibilidad')
  @Roles(RoleName.ADMIN)
  recalculate() {
    return this.stockService.recalculateAllAvailability();
  }
}
