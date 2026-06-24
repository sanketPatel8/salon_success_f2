import type { User } from '@shared/schema';

export const PAYMENT_GRACE_PERIOD_DAYS = 10;
const PAYMENT_GRACE_PERIOD_MS = PAYMENT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export function hasPaymentGraceAccess(user: User, now = new Date()): boolean {
  if (user.subscriptionStatus !== 'past_due' || !user.paymentFailedAt) {
    return false;
  }

  return now.getTime() - new Date(user.paymentFailedAt).getTime() < PAYMENT_GRACE_PERIOD_MS;
}
