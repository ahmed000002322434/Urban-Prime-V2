
export const PLATFORM_FEE_PERCENTAGE = 0.10;

/**
 * Formats a number into a currency string.
 * @param amount - The amount to format.
 * @param currencyCode - The ISO 4217 currency code (default: USD).
 */
export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Calculates the platform fee and net payout for a given price.
 * @param price - The listing price.
 * @returns An object containing the fee amount and the estimated payout.
 */
export const calculatePayout = (price: number): { fee: number; payout: number } => {
  if (!price || price < 0) {
    return { fee: 0, payout: 0 };
  }

  const fee = price * PLATFORM_FEE_PERCENTAGE;
  const payout = price - fee;

  return {
    fee,
    payout,
  };
};
