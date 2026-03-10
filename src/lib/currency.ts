/**
 * Format a number as UGX currency
 */
export const formatUGX = (amount: number): string => {
  return `UGX ${amount.toLocaleString('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
