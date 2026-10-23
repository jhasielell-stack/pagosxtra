// Cutoff logic for payment requests
// - If required payment date is Tuesday: must be received by Monday 2:00 PM
// - If required payment date is Friday: must be received by Thursday 2:00 PM
// - If sent after cutoff: show red alert, auto-reschedule to next cycle

export type CutoffStatus = 'green' | 'yellow' | 'red';

export interface CutoffInfo {
  status: CutoffStatus;
  cutoffDate: Date | null;
  hoursRemaining: number | null;
  message: string;
  rescheduledDate: string | null;
  isAfterCutoff: boolean;
}

// Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

// Find the next Tuesday or Friday from a given date
function nextPaymentCycleDate(from: Date): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + 1);

  while (true) {
    const dow = getDayOfWeek(result);
    if (dow === 2 || dow === 5) {
      // Tuesday (2) or Friday (5)
      return result;
    }
    result.setDate(result.getDate() + 1);
  }
}

// Get the cutoff date (and time) for a given required payment date
function getCutoffForPaymentDate(paymentDate: Date): Date | null {
  const dow = getDayOfWeek(paymentDate);

  if (dow === 2) {
    // Tuesday -> cutoff is Monday 2:00 PM
    const cutoff = new Date(paymentDate);
    cutoff.setDate(cutoff.getDate() - 1);
    cutoff.setHours(14, 0, 0, 0);
    return cutoff;
  }

  if (dow === 5) {
    // Friday -> cutoff is Thursday 2:00 PM
    const cutoff = new Date(paymentDate);
    cutoff.setDate(cutoff.getDate() - 1);
    cutoff.setHours(14, 0, 0, 0);
    return cutoff;
  }

  // Not a payment day — no cutoff applies
  return null;
}

export function evaluateCutoff(requiredPaymentDateStr: string, now: Date = new Date()): CutoffInfo {
  const paymentDate = new Date(requiredPaymentDateStr + 'T00:00:00');
  const dow = getDayOfWeek(paymentDate);

  // If the payment date is not Tuesday or Friday, we need to reschedule
  if (dow !== 2 && dow !== 5) {
    const next = nextPaymentCycleDate(paymentDate);
    return {
      status: 'red',
      cutoffDate: null,
      hoursRemaining: null,
      message: 'La fecha de pago debe ser martes o viernes. Se reprogramará automáticamente.',
      rescheduledDate: formatDate(next),
      isAfterCutoff: true,
    };
  }

  const cutoffDate = getCutoffForPaymentDate(paymentDate);

  if (!cutoffDate) {
    return {
      status: 'green',
      cutoffDate: null,
      hoursRemaining: null,
      message: 'Fecha válida.',
      rescheduledDate: null,
      isAfterCutoff: false,
    };
  }

  const diffMs = cutoffDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (diffMs <= 0) {
    // After cutoff — reschedule to next cycle
    const next = nextPaymentCycleDate(paymentDate);
    return {
      status: 'red',
      cutoffDate,
      hoursRemaining: hoursRemaining,
      message: `Fuera de corte. El plazo terminó el ${formatDateTime(cutoffDate)}. Se reprograma al ${formatDate(next)}.`,
      rescheduledDate: formatDate(next),
      isAfterCutoff: true,
    };
  }

  if (hoursRemaining < 4) {
    return {
      status: 'yellow',
      cutoffDate,
      hoursRemaining,
      message: `Quedan menos de 4 horas para el corte (${formatDateTime(cutoffDate)}). Envíe pronto.`,
      rescheduledDate: null,
      isAfterCutoff: false,
    };
  }

  return {
    status: 'green',
    cutoffDate,
    hoursRemaining,
    message: `Dentro del corte. Fecha límite: ${formatDateTime(cutoffDate)}.`,
    rescheduledDate: null,
    isAfterCutoff: false,
  };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr} ${h}:${min}`;
}

// Helper to format currency
export function formatCurrency(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}
