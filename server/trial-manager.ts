import type { User } from "@shared/schema";

export class TrialManager {
  /**
   * Check if user is in active trial period (managed by Stripe)
   */
  static isTrialActive(user: User): boolean {
    return user.subscriptionStatus === "trialing";
  }

  /**
   * Get days remaining in trial (calculated from Stripe subscription end date)
   */
  static getTrialDaysRemaining(user: User): number {
    if (!this.isTrialActive(user) || !user.subscriptionEndDate) {
      return 0;
    }

    const now = new Date();
    const trialEnd = new Date(user.subscriptionEndDate);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  /**
   * Check if user has access to premium features
   */
  static hasAccess(user: User): boolean {
    // Trial users get full access
    if (this.isTrialActive(user)) {
      return true;
    }

    // Active subscribers get access
    if (user.subscriptionStatus === "active") {
      return true;
    }

    return false;
  }

  /**
   * Get user's access status for display
   */
  static getAccessStatus(user: User): {
    hasAccess: boolean;
    status: "trial" | "active" | "expired" | "inactive";
    daysRemaining?: number;
    message: string;
  } {
    if (user.subscriptionStatus === "trialing") {
      const daysRemaining = this.getTrialDaysRemaining(user);
      return {
        hasAccess: true,
        status: "trial",
        daysRemaining,
        message: `${daysRemaining} days left in your free trial`
      };
    }

    if (user.subscriptionStatus === "active") {
      return {
        hasAccess: true,
        status: "active",
        message: "Active subscription"
      };
    }

    if (user.subscriptionStatus === "incomplete" || user.subscriptionStatus === "past_due") {
      return {
        hasAccess: false,
        status: "expired",
        message: "Payment required - Complete your subscription"
      };
    }

    return {
      hasAccess: false,
      status: "inactive",
      message: "Subscribe to access premium features"
    };
  }
}