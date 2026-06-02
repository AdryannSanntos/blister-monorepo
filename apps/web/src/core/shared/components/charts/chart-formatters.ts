const numberFormatter = new Intl.NumberFormat("pt-BR");

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatChartNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatChartCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatChartPercent(value: number) {
  return percentFormatter.format(value / 100);
}

export function formatChartDate(
  value: Date,
  options: Intl.DateTimeFormatOptions,
) {
  return value.toLocaleDateString("pt-BR", options);
}

export function formatChartDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0s";
  }

  const totalSeconds = Math.round(value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  if (minutes > 0) {
    return `${minutes}min ${seconds}s`;
  }

  return `${seconds}s`;
}
