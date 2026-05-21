import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MesasModule } from './modules/mesas/mesas.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { ProductosModule } from './modules/productos/productos.module';
import { CombosModule } from './modules/combos/combos.module';
import { MenuModule } from './modules/menu/menu.module';
import { StockModule } from './modules/stock/stock.module';
import { CajaModule } from './modules/caja/caja.module';
import { ImpresionModule } from './modules/impresion/impresion.module';
import { AdminModule } from './modules/admin/admin.module';
import { EventsModule } from './modules/events/events.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    MesasModule,
    PedidosModule,
    CategoriasModule,
    ProductosModule,
    CombosModule,
    MenuModule,
    StockModule,
    CajaModule,
    ImpresionModule,
    AdminModule,
    EventsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
