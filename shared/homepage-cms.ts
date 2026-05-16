import { z } from "zod";

export const homepageFeatureItemSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(600),
});

export const homepageTestimonialItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  business: z.string().trim().min(1).max(160),
  quote: z.string().trim().min(1).max(600),
  rating: z.number().int().min(1).max(5),
});

export const homepageSupportItemSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(600),
});

export const homepageCmsInputSchema = z.object({
  header: z.object({
    signInText: z.string().trim().min(1).max(80),
    trialButtonText: z.string().trim().min(1).max(120),
  }),
  hero: z.object({
    headline: z.string().trim().min(1).max(240),
    highlightedText: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(1200),
    primaryCtaText: z.string().trim().min(1).max(120),
    demoCtaText: z.string().trim().min(1).max(120),
    trialNote: z.string().trim().min(1).max(240),
  }),
  ceoSection: z.object({
    title: z.string().trim().min(1).max(240),
    subtitle: z.string().trim().min(1).max(600),
    introHighlight: z.string().trim().min(1).max(240),
    descriptionLineOne: z.string().trim().min(1).max(600),
    descriptionLineTwo: z.string().trim().min(1).max(600),
  }),
  founderQuote: z.object({
    paragraphOne: z.string().trim().min(1).max(1400),
    paragraphTwo: z.string().trim().min(1).max(1400),
    attribution: z.string().trim().min(1).max(240),
  }),
  appPreview: z.object({
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().min(1).max(300),
  }),
  featuresSection: z.object({
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().min(1).max(300),
    items: z.array(homepageFeatureItemSchema).min(1).max(20),
  }),
  supportSection: z.object({
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().min(1).max(300),
    introTitle: z.string().trim().min(1).max(200),
    items: z.array(homepageSupportItemSchema).min(1).max(12),
  }),
  testimonialsSection: z.object({
    title: z.string().trim().min(1).max(200),
    ratingText: z.string().trim().min(1).max(160),
    items: z.array(homepageTestimonialItemSchema).min(1).max(12),
  }),
  pricingSection: z.object({
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().min(1).max(300),
    badgeText: z.string().trim().min(1).max(80),
    cardTitle: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(500),
    benefits: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
    primaryCtaText: z.string().trim().min(1).max(120),
    note: z.string().trim().min(1).max(200),
  }),
  experienceSection: z.object({
    title: z.string().trim().min(1).max(200),
    benefits: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
    primaryCtaText: z.string().trim().min(1).max(120),
    note: z.string().trim().min(1).max(200),
  }),
  finalCta: z.object({
    title: z.string().trim().min(1).max(220),
    subtitle: z.string().trim().min(1).max(400),
    primaryCtaText: z.string().trim().min(1).max(140),
    note: z.string().trim().min(1).max(200),
  }),
  footer: z.object({
    brandTitle: z.string().trim().min(1).max(160),
    brandSubtitle: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(300),
    companyHeading: z.string().trim().min(1).max(80),
    aboutKatieText: z.string().trim().min(1).max(80),
    aboutKatieUrl: z.string().trim().min(1).max(500),
    contactText: z.string().trim().min(1).max(80),
    contactEmail: z.string().trim().min(1).max(200),
    privacyText: z.string().trim().min(1).max(80),
    getStartedHeading: z.string().trim().min(1).max(80),
    trialLinkText: z.string().trim().min(1).max(80),
    signInText: z.string().trim().min(1).max(80),
    copyrightText: z.string().trim().min(1).max(200),
  }),
});

export type HomepageCmsInput = z.infer<typeof homepageCmsInputSchema>;

export const DEFAULT_HOMEPAGE_CMS_CONTENT: HomepageCmsInput = {
  header: {
    signInText: "Sign In",
    trialButtonText: "Get Your Free Trial",
  },
  hero: {
    headline: "Understand Your Numbers. Stop Winging It.",
    highlightedText: "Love Your Business Again.",
    description:
      "Running a salon, clinic, or training academy shouldn’t feel like guesswork. You deserve to know where your money is going, how much you’re really making, and exactly what to do to increase your income and profit, without feeling like you need to be an accountant.",
    primaryCtaText: "Get Your Free Trial",
    demoCtaText: "Watch Demo",
    trialNote: "£27/month • Cancel anytime • Have a promo code? Enter after signup",
  },
  ceoSection: {
    title: "Stop Guessing. Start Managing Like a CEO.",
    subtitle:
      "Most salon owners are incredible at what they do, but when it comes to numbers? It's confusing, overwhelming, and easy to avoid.",
    introHighlight: "That's where Salon Success Manager comes in.",
    descriptionLineOne:
      "The no-jargon financial tool built specifically for the hair, beauty, and aesthetics industry.",
    descriptionLineTwo:
      "It's the easiest way to finally take control of your pricing, profits, and business growth.",
  },
  founderQuote: {
    paragraphOne:
      "So many professionals come to me saying they’re fully booked but have nothing left at the end of the month. Nine times out of ten, it comes down to incorrect pricing and not knowing their break - even point or the real cost of running their business day - to - day. It’s not because they are bad with money, it’s because they have never been shown how to understand it.",
    paragraphTwo:
      "This web app takes away the stress, the spreadsheets, and the scary accountant terms. It’s everything I teach my private clients and have used in my own salons for years. When you understand what money your business needs to make, you can build the business more easily. Start to enjoy the parts of business that your currently avoiding.",
    attribution: "- Katie Godfrey, Business Strategist, Author & Podcaster",
  },
  appPreview: {
    title: "See Your Business Dashboard in Action",
    subtitle: "Get real-time insights and manage every aspect of your salon business",
  },
  featuresSection: {
    title: "Everything You Need to Manage Your Business",
    subtitle: "Professional tools designed specifically for salon and clinic owners",
    items: [
      {
        title: "Hourly Rate Calculator",
        description:
          "Work out how much it costs you per hour to run your business, so you can check if your treatments are actually priced correctly.",
      },
      {
        title: "Treatment Pricing Calculator",
        description:
          "Work out how much you should be charging for every single service. You can even break down the profit in every treatment or training course.",
      },
      {
        title: "CEO Numbers Dashboard",
        description:
          "Katie Godfrey’s famous system used by thousands of salon owners to finally make sense of their business finances.",
      },
      {
        title: "Stock Budget Calculator",
        description:
          "Does it feel like all your money is constantly going on stock? Create a monthly budget to help you stay in control and stop overspending.",
      },
      {
        title: "Revenue Goals & Projections",
        description:
          "Set clear income targets and see exactly how many clients or courses you need to hit them.",
      },
      {
        title: "Expense Tracker & Profit Margins",
        description:
          "Know exactly where your money’s going and what’s actually bringing in profit.",
      },
      {
        title: "Professional Reports & Dashboards",
        description: "Simple visuals, no spreadsheets, no jargon. Just clarity.",
      },
      {
        title: "Team Targets Setter",
        description:
          "Easily set your team targets that they need to hit to keep the business profitable.",
      },
    ],
  },
  supportSection: {
    title: "You Don't Just Get the App, You Get the Support.",
    subtitle: "Because we know information alone isn't enough...",
    introTitle: "Included With Your Subscription:",
    items: [
      {
        title: "Monthly Live Accountability Sessions",
        description:
          "Join Katie every month on Zoom to keep on top of your numbers and actually use the tools. Ask any questions you like to understand money and business.",
      },
      {
        title: "Access to £1,500+ Worth of Business Training",
        description:
          "Exclusive video library covering pricing, money mindset, marketing, and growth which is drip fed over a period of time to stop the overwhelm.",
      },
      {
        title: "Private Facebook Community",
        description:
          "Connect with other salon, clinic, and academy owners who are taking control of their profits too. If you have a question or stuck with the system, just drop us a message in the group.",
      },
    ],
  },
  testimonialsSection: {
    title: "Trusted by Salon Owners Worldwide",
    ratingText: "4.9/5 from 200+ reviews",
    items: [
      {
        name: "Kay Taylor",
        business: "Hair Salon Owner",
        quote:
          "This tool completely transformed how I price my services. I'm now making 40% more profit!",
        rating: 5,
      },
      {
        name: "Emma Johnson",
        business: "Beauty Clinic",
        quote: "The expense tracking alone has saved me thousands.",
        rating: 5,
      },
      {
        name: "Lisa Williams",
        business: "Training Academy",
        quote:
          "Running a training academy means juggling so many numbers. This app keeps it all clear and organised.",
        rating: 5,
      },
    ],
  },
  pricingSection: {
    title: "Simple, No-Brainer Pricing",
    subtitle: "One plan, all features, incredible value",
    badgeText: "Most Popular",
    cardTitle: "Start with a 3 - day free trial - cancel anytime.",
    description:
      "After that, it’s just £27/month for the tools, support, and clarity that will change your business.",
    benefits: [
      "Unlimited access to all calculators",
      "Advanced reporting and exports",
      "Multi-business tracking",
      "Professional PDF reports",
      "Email support",
      "Data security and backups",
      "Mobile responsive design",
      "Regular feature updates",
      "Monthly live accountability calls",
      "Community & training portal",
    ],
    primaryCtaText: "Start Your Free 3-Day Trial",
    note: "No contracts • Cancel anytime",
  },
  experienceSection: {
    title: "What You Will Experience",
    benefits: [
      "Understanding exactly what to charge",
      "Easy to use calculators which will show you your profit margins",
      "A clear plan to hit your income goals",
      "Less financial stress and more freedom",
      "The feeling of finally running your business like a CEO without winging it",
    ],
    primaryCtaText: "Start Your Free 3-Day Trial",
    note: "No contracts • Cancel anytime",
  },
  finalCta: {
    title: "Ready to Finally Understand Your Numbers?",
    subtitle:
      "Join hundreds of salon owners transforming their profits, pricing, and peace of mind with Salon Success Manager.",
    primaryCtaText: "Start Your 3 - Day Free Trial Now",
    note: "£27/month after trial • Cancel anytime",
  },
  footer: {
    brandTitle: "Salon Success Manager",
    brandSubtitle: "by Katie Godfrey",
    description: "Professional business management tools for salon and clinic owners.",
    companyHeading: "Company",
    aboutKatieText: "About Katie",
    aboutKatieUrl: "https://kgbusinessmentor.com/",
    contactText: "Contact",
    contactEmail: "info@kgbusinessmentor.com",
    privacyText: "Privacy Policy",
    getStartedHeading: "Get Started",
    trialLinkText: "Get Your Free Trial",
    signInText: "Sign In",
    copyrightText: "© 2025 Katie Godfrey Business Mentor. All rights reserved.",
  },
};

export function buildDefaultHomepageCmsContent(): HomepageCmsInput {
  return JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CMS_CONTENT));
}
