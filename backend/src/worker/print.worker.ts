/**
 * Print Worker — proceso independiente que imprime jobs pendientes.
 * Ejecutar: npm run start:print-worker
 *
 * En producción: servicio Docker separado con mismo image que API.
 */
import { PrismaClient, PrintJobStatus } from '@prisma/client';

const POLL_INTERVAL_MS = 2000;
const prisma = new PrismaClient();

interface TicketContent {
  header: string;
  tableNumber?: number;
  orderId: number;
  waiterName: string;
  items: { name: string; quantity: number; notes?: string | null }[];
  timestamp: string;
}

async function printJob(jobId: number, content: TicketContent, address: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const escpos = require('escpos');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  escpos.Network = require('escpos-network');

  const [host, portStr] = address.split(':');
  const port = parseInt(portStr ?? '9100', 10);

  return new Promise<void>((resolve, reject) => {
    const device = new escpos.Network(host, port);
    const printer = new escpos.Printer(device);

    device.open((err: Error | null) => {
      if (err) return reject(err);

      printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text(`=== ${content.header} ===`)
        .text(content.tableNumber ? `MESA ${content.tableNumber}` : '')
        .text(`Pedido #${content.orderId}`)
        .text(`Mozo: ${content.waiterName}`)
        .text('--------------------------------')
        .align('lt')
        .style('normal');

      for (const item of content.items) {
        printer.text(`${item.quantity}x ${item.name}`);
        if (item.notes) printer.text(`   > ${item.notes}`);
      }

      printer
        .text('--------------------------------')
        .cut()
        .close();

      resolve();
    });
  });
}

async function processNextJob() {
  const jobs = await prisma.printJob.findMany({
    where: { status: PrintJobStatus.PENDIENTE },
    orderBy: { createdAt: 'asc' },
    take: 1,
    include: { printer: true },
  });

  if (!jobs.length) return;

  const job = jobs[0];

  // Lock optimista
  const updated = await prisma.printJob.updateMany({
    where: { id: job.id, status: PrintJobStatus.PENDIENTE },
    data: { attempts: { increment: 1 } },
  });
  if (updated.count === 0) return;

  const content = job.content as unknown as TicketContent;
  const address = job.printer?.address;

  if (!address) {
    await prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: PrintJobStatus.ERROR,
        errorMessage: 'Sin impresora configurada para este sector',
      },
    });
    return;
  }

  try {
    await printJob(job.id, content, address);
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: PrintJobStatus.IMPRESO, printedAt: new Date() },
    });
    console.log(`[print-worker] Job #${job.id} impreso OK`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    const attempts = job.attempts + 1;
    await prisma.printJob.update({
      where: { id: job.id },
      data: {
        errorMessage: message,
        status: attempts >= job.maxAttempts ? PrintJobStatus.ERROR : PrintJobStatus.PENDIENTE,
      },
    });
    console.error(`[print-worker] Job #${job.id} error:`, message);
  }
}

async function main() {
  console.log('[print-worker] Iniciado — polling cada', POLL_INTERVAL_MS, 'ms');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processNextJob();
    } catch (err) {
      console.error('[print-worker] Error fatal en ciclo:', err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
