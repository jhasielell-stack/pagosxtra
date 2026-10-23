export type UserRole = 'solicitante' | 'aprobador' | 'administrador';

export type Area =
  | 'Asistencia'
  | 'Contabilidad'
  | 'Finanzas'
  | 'Alianzas'
  | 'Programa de Desarrollo'
  | 'Participación Comunitaria'
  | 'Logística'
  | 'Seguridad'
  | 'Comunicación'
  | 'Programa Academia Tomate'
  | 'Dirección'
  | 'Subdirección';

export type Priority = 'Urgente' | 'Alta' | 'Media' | 'Baja';

export type RequestStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Pagada';

export type ReasonType = 'Interna' | 'Externa';

export type Currency = 'MXN' | 'USD';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  area: Area | null;
  job_title: string | null;
  created_at: string;
}

export interface PaymentRequest {
  id: string;
  folio: string;
  request_date: string;
  user_id: string;
  area: Area;
  job_title: string | null;
  requirement_name: string;
  priority: Priority;
  project: string | null;
  payment_concept: string;
  amount: number;
  currency: Currency;
  reason_type: ReasonType;
  reason_text: string | null;
  requires_invoice: boolean;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  required_payment_date: string;
  observations: string | null;
  status: RequestStatus;
  approver_id: string | null;
  approver_observations: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  request_id: string | null;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  request_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

export const AREAS: Area[] = [
  'Asistencia',
  'Contabilidad',
  'Finanzas',
  'Alianzas',
  'Programa de Desarrollo',
  'Participación Comunitaria',
  'Logística',
  'Seguridad',
  'Comunicación',
  'Programa Academia Tomate',
  'Dirección',
  'Subdirección',
];

export const PRIORITIES: Priority[] = ['Urgente', 'Alta', 'Media', 'Baja'];

export const STATUSES: RequestStatus[] = ['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Pagada'];

export const REASON_TYPES: ReasonType[] = ['Interna', 'Externa'];

export const CURRENCIES: Currency[] = ['MXN', 'USD'];
