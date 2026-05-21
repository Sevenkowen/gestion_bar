import api from './api';
import type { PrintSector } from '@/types';

export interface Printer {
  id: number;
  name: string;
  sector: PrintSector;
  address: string;
  connectionType: string;
  active: boolean;
}

export interface PrintJob {
  id: number;
  status: string;
  sector: PrintSector;
  errorMessage: string | null;
  createdAt: string;
}

export const impresionApi = {
  impresoras: () => api.get<Printer[]>('/impresion/impresoras').then((r) => r.data),
  createImpresora: (data: { name: string; sector: PrintSector; address: string }) =>
    api.post<Printer>('/impresion/impresoras', data).then((r) => r.data),
  updateImpresora: (id: number, data: Partial<Printer>) =>
    api.put<Printer>(`/impresion/impresoras/${id}`, data).then((r) => r.data),
  jobs: () => api.get<PrintJob[]>('/impresion/jobs').then((r) => r.data),
};
