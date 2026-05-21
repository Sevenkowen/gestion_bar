export function formatMoney(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(num);
}

export const mesaStatusLabel: Record<string, string> = {
  LIBRE: 'Libre',
  OCUPADA: 'Ocupada',
  CUENTA_PEDIDA: 'Cuenta pedida',
  RESERVADA: 'Reservada',
};

export const mesaStatusColor: Record<string, string> = {
  LIBRE: 'positive',
  OCUPADA: 'warning',
  CUENTA_PEDIDA: 'info',
  RESERVADA: 'grey',
};

export const paymentMethodLabel: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA_DEBITO: 'Débito',
  TARJETA_CREDITO: 'Crédito',
  TRANSFERENCIA: 'Transferencia',
  OTRO: 'Otro',
};
