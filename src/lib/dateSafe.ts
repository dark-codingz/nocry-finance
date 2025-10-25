import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "America/Sao_Paulo";

/** Retorna número de dias do mês (1..31) para ano/mês (1..12) */
export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** Garante que o dia esteja dentro do mês (clamp) */
export function clampDay(year: number, month1to12: number, day: number): number {
  const max = daysInMonth(year, month1to12);
  return Math.min(Math.max(1, Math.floor(day || 1)), max);
}

/** Cria ISO (yyyy-mm-dd) no fuso TZ com clamp do dia */
export function makeISO(year: number, month1to12: number, day: number): string {
  const dd = clampDay(year, month1to12, day);
  // dayjs mantém segurança e formata ISO-only-date
  return dayjs.tz(`${year}-${String(month1to12).padStart(2,"0")}-${String(dd).padStart(2,"0")}`, TZ).format("YYYY-MM-DD");
}

/** Diferença em dias entre duas datas ISO no fuso TZ (end - start) */
export function diffDays(aISO: string, bISO: string): number {
  const a = dayjs.tz(aISO, TZ); const b = dayjs.tz(bISO, TZ);
  return b.startOf("day").diff(a.startOf("day"), "day");
}

/** Hoje (date ISO, TZ) */
export function todayISO(): string {
  return dayjs().tz(TZ).format("YYYY-MM-DD");
}



