export type SyncMonthRange = {
  fecha_desde: string;
  fecha_hasta: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function getTodayPartsInTimezone(timeZone: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return { year, month, day };
}

/**
 * Rango mes anterior + mes actual en la zona horaria indicada.
 * fecha_desde = día 1 del mes anterior
 * fecha_hasta = hoy (en esa zona)
 */
export function getPreviousAndCurrentMonthRange(
  timeZone = "America/Caracas"
): SyncMonthRange {
  const { year, month, day } = getTodayPartsInTimezone(timeZone);

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  return {
    fecha_desde: `${prevYear}-${pad2(prevMonth)}-01`,
    fecha_hasta: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}
