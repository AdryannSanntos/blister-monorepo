"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "src/core/shared/components/ui/button";
import { Calendar } from "src/core/shared/components/ui/calendar";
import { Input } from "src/core/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "src/core/shared/components/ui/popover";
import { cn } from "src/core/shared/utils";

type BaseProps = {
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
};

type SingleDatePickerInputProps = BaseProps & {
  mode: "single";
  value?: Date;
  onChange: (value: Date | undefined) => void;
};

type RangeDatePickerInputProps = BaseProps & {
  mode: "range";
  value?: DateRange;
  onChange: (value: DateRange | undefined) => void;
};

type DatePickerInputProps =
  | SingleDatePickerInputProps
  | RangeDatePickerInputProps;

function formatDisplayDate(date: Date) {
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

function formatSingleValue(value?: Date) {
  return value ? formatDisplayDate(value) : "";
}

function formatRangeValue(value?: DateRange) {
  if (!value?.from) return "";
  if (!value.to) return formatDisplayDate(value.from);
  return `${formatDisplayDate(value.from)} - ${formatDisplayDate(value.to)}`;
}

function parseDatePart(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, dayString, monthString, yearString] = match;
  const day = Number(dayString);
  const month = Number(monthString) - 1;
  const year = Number(yearString);
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function clampDate(date: Date, minDate?: Date, maxDate?: Date) {
  if (minDate && date < minDate) return minDate;
  if (maxDate && date > maxDate) return maxDate;
  return date;
}

function applySingleDateMask(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function applyRangeDateMask(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 16);
  const fromDigits = digits.slice(0, 8);
  const toDigits = digits.slice(8, 16);
  const fromValue = applySingleDateMask(fromDigits);
  const toValue = applySingleDateMask(toDigits);

  if (!toDigits.length) return fromValue;

  return `${fromValue} - ${toValue}`;
}

function getInputValue(props: DatePickerInputProps) {
  return props.mode === "single"
    ? formatSingleValue(props.value)
    : formatRangeValue(props.value);
}

function getDisabledMatcher(minDate?: Date, maxDate?: Date) {
  if (minDate && maxDate) {
    return { before: minDate, after: maxDate };
  }

  if (minDate) {
    return { before: minDate };
  }

  if (maxDate) {
    return { after: maxDate };
  }

  return undefined;
}

export function DatePickerInput(props: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const nextInputValue = React.useMemo(() => getInputValue(props), [props]);
  const disabledMatcher = React.useMemo(
    () => getDisabledMatcher(props.minDate, props.maxDate),
    [props.maxDate, props.minDate],
  );
  const [inputValue, setInputValue] = React.useState(() => nextInputValue);

  React.useEffect(() => {
    setInputValue(nextInputValue);
  }, [nextInputValue]);

  function commitSingleValue(rawValue: string) {
    if (props.mode !== "single") return;

    const parsed = parseDatePart(rawValue);
    if (!parsed) {
      setInputValue(formatSingleValue(props.value));
      return;
    }

    const nextDate = clampDate(parsed, props.minDate, props.maxDate);
    props.onChange(nextDate);
    setInputValue(formatSingleValue(nextDate));
  }

  function commitRangeValue(rawValue: string) {
    if (props.mode !== "range") return;

    const [fromPart, toPart] = rawValue.split(" - ");
    const parsedFrom = parseDatePart(fromPart ?? "");

    if (!parsedFrom) {
      setInputValue(formatRangeValue(props.value));
      return;
    }

    const parsedTo = toPart ? parseDatePart(toPart) : undefined;
    const from = clampDate(parsedFrom, props.minDate, props.maxDate);
    const to = parsedTo
      ? clampDate(parsedTo, props.minDate, props.maxDate)
      : undefined;
    const nextRange = to && from > to ? { from: to, to: from } : { from, to };

    props.onChange(nextRange);
    setInputValue(formatRangeValue(nextRange));
  }

  function commitInputValue() {
    if (!inputValue.trim()) {
      props.onChange(undefined);
      setInputValue("");
      return;
    }

    if (props.mode === "single") {
      commitSingleValue(inputValue);
      return;
    }

    commitRangeValue(inputValue);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative min-w-0", props.className)}>
        <Input
          value={inputValue}
          placeholder={
            props.placeholder ??
            (props.mode === "single" ? "dd/mm/aaaa" : "dd/mm/aaaa - dd/mm/aaaa")
          }
          disabled={props.disabled}
          onChange={(event) =>
            setInputValue(
              props.mode === "single"
                ? applySingleDateMask(event.target.value)
                : applyRangeDateMask(event.target.value),
            )
          }
          onBlur={commitInputValue}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitInputValue();
              setOpen(false);
            }
          }}
          className="pr-10"
        />

        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={props.disabled}
            className="absolute right-1 top-1 size-7 rounded-[var(--r-sm)] text-[var(--fg-quaternary)] hover:text-[var(--fg-primary)]"
            aria-label="Abrir calendário"
          >
            <CalendarDays className="size-4" />
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent align="end" className="w-auto p-0">
        <PopoverHeader className="border-b border-[var(--line-subtle)] px-4 py-3">
          <PopoverTitle>
            {props.mode === "single" ? "Selecionar data" : "Selecionar período"}
          </PopoverTitle>
          <PopoverDescription>
            {props.mode === "single"
              ? "Escolha uma data ou digite no campo acima."
              : "Escolha início e fim ou digite as duas datas no mesmo campo."}
          </PopoverDescription>
        </PopoverHeader>

        <div className="p-2">
          {props.mode === "single" ? (
            <Calendar
              mode="single"
              locale={ptBR}
              selected={props.value}
              onSelect={(value) => {
                props.onChange(value ?? undefined);
                setInputValue(formatSingleValue(value ?? undefined));
                setOpen(false);
              }}
              disabled={disabledMatcher}
            />
          ) : (
            <Calendar
              mode="range"
              locale={ptBR}
              selected={props.value}
              onSelect={(value) => {
                props.onChange(value ?? undefined);
                setInputValue(formatRangeValue(value ?? undefined));
                if (value?.from && value?.to) {
                  setOpen(false);
                }
              }}
              disabled={disabledMatcher}
              numberOfMonths={2}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { DateRange, DatePickerInputProps };
