export const DOMAIN_EVENTS = {
  ORDER_ITEMS_SENT: 'order.items.sent',
  STOCK_MOVEMENT_CREATED: 'stock.movement.created',
  PRODUCT_AVAILABILITY_CHANGED: 'product.availability.changed',
  TABLE_STATUS_CHANGED: 'table.status.changed',
  PAYMENT_COMPLETED: 'payment.completed',
  PRINT_JOB_FAILED: 'print.job.failed',
} as const;

export interface OrderItemsSentPayload {
  orderId: number;
  branchId: number;
  tableId: number | null;
  itemIds: number[];
  waiterName: string;
}

export interface ProductAvailabilityChangedPayload {
  productId: number;
  branchId: number;
  available: boolean;
}

export interface TableStatusChangedPayload {
  tableId: number;
  branchId: number;
  status: string;
  orderId?: number;
}
