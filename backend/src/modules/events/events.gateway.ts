import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DOMAIN_EVENTS } from '../../common/events/domain.events';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET', 'dev-secret-change-me'),
      });

      const branchId = payload.branchId as number;
      const role = payload.role as string;

      client.join(`branch:${branchId}`);
      client.join(`role:${role}`);
      client.data.user = payload;

      this.logger.log(`Cliente conectado: ${payload.username} (${role})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.data.user?.username ?? 'unknown'}`);
  }

  joinTable(client: Socket, tableId: number) {
    client.join(`table:${tableId}`);
  }

  @OnEvent(DOMAIN_EVENTS.TABLE_STATUS_CHANGED)
  handleTableChanged(payload: {
    tableId: number | null;
    branchId: number;
    status: string;
    orderId?: number;
  }) {
    if (!payload.tableId) return;
    this.server.to(`branch:${payload.branchId}`).emit('mesa:updated', payload);
    this.server.to(`table:${payload.tableId}`).emit('mesa:updated', payload);
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_ITEMS_SENT)
  handleOrderSent(payload: {
    orderId: number;
    branchId: number;
    tableId: number | null;
  }) {
    this.server.to(`branch:${payload.branchId}`).emit('pedido:nuevo', payload);
    if (payload.tableId) {
      this.server.to(`table:${payload.tableId}`).emit('pedido:updated', payload);
    }
  }

  @OnEvent(DOMAIN_EVENTS.PRODUCT_AVAILABILITY_CHANGED)
  handleAvailability(payload: { productId: number; branchId: number; available: boolean }) {
    this.server.to(`branch:${payload.branchId}`).emit('producto:disponibilidad', payload);
  }

  @OnEvent(DOMAIN_EVENTS.PAYMENT_COMPLETED)
  handlePayment(payload: { tableId: number; branchId: number; paymentId: number }) {
    this.server.to(`branch:${payload.branchId}`).emit('caja:mesa-cobrada', payload);
  }
}
