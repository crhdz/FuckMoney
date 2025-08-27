/**
 * Formatea un número como moneda en formato español: xx.xxx,xx€
 * @param amount - El número a formatear
 * @param decimals - Número de decimales (por defecto 2)
 * @returns String formateado en formato español con símbolo de euro
 */
export function formatEuro(amount: number, decimals: number = 2): string {
  return amount.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + '€';
}

/**
 * Formatea un número como moneda en formato español sin decimales: xx.xxx€
 * @param amount - El número a formatear
 * @returns String formateado en formato español sin decimales
 */
export function formatEuroNoDecimals(amount: number): string {
  return formatEuro(amount, 0);
}
