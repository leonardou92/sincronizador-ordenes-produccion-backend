export function buildMysqlDateRangeParams(
  fechaDesde: string,
  fechaHasta: string,
  pairs: number,
): string[] {
  return Array.from({ length: pairs }, () => [fechaDesde, fechaHasta]).flat();
}
