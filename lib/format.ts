export function money(amount: number, currency: "ARS" | "USD" = "ARS") {
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: currency === "ARS" ? 0 : 2,
    minimumFractionDigits: currency === "ARS" ? 0 : 2
  }).format(amount);

  return `${currency === "ARS" ? "AR$" : "US$"} ${formatted}`;
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

export function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(`${to}T12:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}
