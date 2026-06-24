let _symbol = '$';
export function setCurrencySymbol(s: string) { _symbol = s; }
export function formatCurrency(amount: number): string {
  return `${_symbol}${amount.toFixed(2)}`;
}
