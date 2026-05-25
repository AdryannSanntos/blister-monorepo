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
