export type BillingState = {
  daysUntil: number;
  dueDate: string;
  isOverdue: boolean;
  isPaid: boolean;
  label: string;
  monthKey: string;
  tone: "paid" | "late" | "soon" | "ok";
};

export function monthKeyFromDate(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function getBillingState({
  dueDay,
  lastPaidMonth,
  today = new Date()
}: {
  dueDay: number;
  lastPaidMonth?: string | null;
  today?: Date;
}): BillingState {
  const safeDueDay = Math.min(31, Math.max(1, Math.round(dueDay || 1)));
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthKey = monthKeyFromDate(todayDate);
  const isPaid = lastPaidMonth === monthKey;
  const dueDate = buildDueDate(todayDate.getFullYear(), todayDate.getMonth(), safeDueDay);
  const daysUntil = Math.round((dueDate.getTime() - todayDate.getTime()) / 86400000);

  if (isPaid) {
    return {
      daysUntil,
      dueDate: toDateInputValue(dueDate),
      isOverdue: false,
      isPaid: true,
      label: "Pagado este mes",
      monthKey,
      tone: "paid"
    };
  }

  if (daysUntil < 0) {
    return {
      daysUntil,
      dueDate: toDateInputValue(dueDate),
      isOverdue: true,
      isPaid: false,
      label: `Vencido hace ${Math.abs(daysUntil)} d`,
      monthKey,
      tone: "late"
    };
  }

  if (daysUntil === 0) {
    return {
      daysUntil,
      dueDate: toDateInputValue(dueDate),
      isOverdue: false,
      isPaid: false,
      label: "Vence hoy",
      monthKey,
      tone: "soon"
    };
  }

  return {
    daysUntil,
    dueDate: toDateInputValue(dueDate),
    isOverdue: false,
    isPaid: false,
    label: `Faltan ${daysUntil} d`,
    monthKey,
    tone: daysUntil <= 7 ? "soon" : "ok"
  };
}

function buildDueDate(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
