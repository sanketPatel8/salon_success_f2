import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  Check,
  CircleDollarSign,
  HelpCircle,
  MessageCircle,
  Play,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const accountantQuestions = [
  "Are your prices actually making you profit?",
  "Where is all your money going?",
  "What do you need to take home a real wage?",
  "Am I actually growing or just staying busy?",
];

const coachQuestions = [
  "What to post on social media and when",
  "How to plan offers and launches that actually convert",
  "How to hire, manage and keep great staff",
  "How to work less and earn more",
];

const financeTools = [
  "Breakeven calculator",
  "Pricing & profit tool",
  "Katie's famous CEO Numbers System",
  "Goal setting & revenue tracker",
  "Team targets setter",
];

const aiTopics = [
  "Pricing & finances",
  "Social media content and strategy",
  "Launching new services and offers",
  "Hiring, staffing, and team management",
  "Marketing ideas and campaigns",
  "CEO mindset and decision-making",
  "Growing revenue and creating memberships",
  "Content planning",
  "Client retention strategies",
];

const reviewImages = Array.from({ length: 22 }, (_, index) => `/review${index + 1}.jpg`);

const reviewGroupLabels = [
  "Ratings and reviews",
  "Member wins",
  "Salon owner feedback",
  "Success stories",
];

function getRandomReviewGroups(images: string[], count: number) {
  const shuffled = [...images];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  const groups = Array.from({ length: count }, () => [] as string[]);
  shuffled.forEach((image, index) => {
    groups[index % count].push(image);
  });

  return groups.map((images, index) => ({
    title: reviewGroupLabels[index] ?? "Member reviews",
    images,
  }));
}

const pricingItems = [
  "Full Salon Success Manager app - all tools and dashboards",
  "KG AI Mentor - 24/7 support on finances, social media, staffing, launches, marketing and more",
  "Monthly live accountability call with Katie",
  "Video walkthroughs on every page - no guessing",
  "Pricing calculator, breakeven tool, and financial tracker",
  "Katie's famous CEO numbers system",
  "Goal setting & tracking",
  "Team Targets Setter",
  "New features and tools added regularly",
];

const walkthroughVideos = [
  {
    title: "Expense Tracker walkthrough",
    thumbnail: "https://img.youtube.com/vi/v2pwmNMtnGM/hqdefault.jpg",
  },
  {
    title: "Treatment Calculator walkthrough",
    thumbnail: "https://img.youtube.com/vi/CWPqabq0YDk/hqdefault.jpg",
  },
  {
    title: "CEO Numbers walkthrough",
    thumbnail: "https://img.youtube.com/vi/kYJWnxgD3i8/hqdefault.jpg",
  },
  {
    title: "Team Targets walkthrough",
    thumbnail: "https://img.youtube.com/vi/clDsLETPOCk/hqdefault.jpg",
  },
];

const featurePreviewImages = [
  { title: "Report", src: "/Report.png" },
  { title: "Team Member", src: "/Team%20Member.png" },
  { title: "Expense", src: "/Expense.png" },
  { title: "CEO numbers", src: "/CEO%20numbers.png" },
  { title: "Hourly rate", src: "/Hourly%20rate.png" },
  { title: "KG AI", src: "/Kg_AI.png" },
];

const faqs = [
  {
    question: "I don't have time to learn a new tool.",
    answer:
      "Every single page inside Salon Success Manager has a short video showing you exactly what to do. Most members are fully set up within 30 minutes. And the monthly accountability call keeps you on track without it becoming another item on your to-do list. This is created to make life so much easier, not harder.",
  },
  {
    question: "I'm already paying for too many subscriptions.",
    answer:
      "The KG AI Mentor is sold as a standalone product for £49 month. Your Salon Success Manager subscription includes that, plus the full app, plus the monthly live call. For the price of one tool, you're getting finance clarity, 24/7 business coaching across every area, social media, staffing, launches, marketing, and a live monthly call with Katie. It replaces several things most salon owners pay for separately.",
  },
  {
    question: "I'm not good with numbers. Will I actually understand it?",
    answer:
      "That's exactly who this was built for. Katie has spent years working with salon owners who are brilliant at their services but terrified of their finances, not because they aren't smart, but because nobody ever explained it in a way that made sense for their business. Salon Success Manager does. And if you're ever stuck, the AI mentor and the monthly call are right there.",
  },
  {
    question: "What can the AI Mentor actually help me with?",
    answer:
      "Almost anything business-related. Beauty professionals use it to write social media captions, plan content, think through a new service launch, work out what to say to a difficult staff member, figure out their pricing structure, plan a marketing campaign, and much more. It's trained on Katie's specific methods, so the answers actually make sense for a beauty or aesthetic business.",
  },
  {
    question: "Can I cancel if it's not for me?",
    answer:
      "Absolutely. No contracts, no cancellation fees. Cancel any time from your account settings.",
  },
];

const trustItems = ["No commitment", "Cancel anytime", "Takes 2 minutes to set up"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-flex rounded border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
      {children}
    </div>
  );
}

function CtaButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Link href="/register">
      <Button className={`h-auto rounded-md bg-primary px-6 py-4 text-sm font-bold text-white hover:bg-primary/90 sm:text-base ${className}`}>
        {children}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Link>
  );
}

export default function Landing() {
  const selectedReviewGroups = useMemo(() => getRandomReviewGroups(reviewImages, 4), []);

  useEffect(() => {
    const win = window as typeof window & { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
    if (win.fbq) {
      win.fbq("track", "PageView");
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
    win.fbq = (...args: unknown[]) => {
      ((win.fbq as any).queue = (win.fbq as any).queue || []).push(args);
    };
    (win.fbq as any).loaded = true;
    (win.fbq as any).version = "2.0";
    win.fbq("init", "544990893994369");
    win.fbq("track", "PageView");
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-primary/20 bg-white/95 shadow-sm shadow-primary/5 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo_withbg.jpeg" alt="Salon Success Manager" className="h-12 w-12 rounded object-cover" />
            <div className="leading-tight">
              <p className="text-base font-black tracking-tight sm:text-lg">
                Salon Success <span className="text-primary">Manager</span>
              </p>
              <p className="text-xs text-slate-500">Katie Godfrey</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button variant="outline" className="h-10 rounded-md border-slate-900 px-4 text-xs font-semibold sm:text-sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="h-10 rounded-md bg-primary px-4 text-xs font-bold text-white hover:bg-primary/90 sm:text-sm">
                Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#1c1c2e_0%,#2e2e42_55%,#3a2535_100%)] px-4 py-16 text-white sm:px-6 lg:px-10 lg:py-24">
          <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1500px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-primary">24/7 business coach for your salon.</p>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                You became a salon owner to do what you love. <span className="text-primary">Not to become an accountant.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
                Your personal accountant, your personal business coach, AND a live monthly call with Katie Godfrey all in one place. Only <strong className="text-white">£27 a month.</strong>
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <CtaButton>Start your free trial today</CtaButton>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50">
                {trustItems.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4 lg:pl-8">
              {[
                { icon: CircleDollarSign, title: "Personal Accountant", text: "Know your numbers and pricing", was: "£100s/mo" },
                { icon: Target, title: "Personal Business Coach", text: "Strategy, marketing, and growth", was: "£49/mo" },
                { icon: CalendarCheck, title: "Monthly Live Call", text: "Real accountability with Katie", was: "£100s/mo" },
              ].map((item, index) => {
                const Icon = item.icon;
                const isHighlighted = index === 2;
                return (
                  <div
                    key={item.title}
                    className={`flex min-h-[96px] items-center gap-4 rounded-2xl border px-5 py-4 backdrop-blur ${
                      isHighlighted
                        ? "border-primary bg-primary text-white"
                        : "border-white/15 bg-white/[0.07] text-white"
                    }`}
                  >
                    <Icon className="h-8 w-8 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className={isHighlighted ? "text-sm text-white/80" : "text-sm text-white/60"}>{item.text}</p>
                    </div>
                    <div className="ml-auto min-w-[86px] text-right leading-none">
                      <div className={isHighlighted ? "text-sm font-semibold text-white/55 line-through" : "text-sm font-semibold text-white/35 line-through"}>
                        {item.was}
                      </div>
                      <div className={isHighlighted ? "mt-1 text-lg font-black text-white" : "mt-1 text-lg font-black text-primary/80"}>
                        Included
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-2xl border border-primary/40 bg-white/[0.05] p-6 text-center">
                <p className="text-sm text-white/55">All of this for</p>
                <div className="mt-1 text-5xl font-black">£27<span className="text-xl text-white/55">/mo</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#faf8f9] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-[1500px]">
            <h2 className="max-w-5xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Right now, without a system, you're undercharging, overspending, and winging it blind <span className="text-primary">and it's costing you more than £27 a month.</span>
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              You didn't get into this industry to become an accountant, a marketing manager, a HR department, and a social media manager. But here you are, doing all of it.
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <ProblemCard icon={<CircleDollarSign className="h-8 w-8" />} title="Your Personal Accountant" subtitle="Finally know your numbers without having to understand them" items={accountantQuestions} />
              <ProblemCard icon={<Target className="h-8 w-8" />} title="Your Personal Business Coach" subtitle="The strategy, marketing and confidence to grow - without guessing" items={coachQuestions} />
            </div>

            <div className="mt-8 flex flex-col gap-5 rounded-2xl bg-slate-950 p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
              <p className="max-w-4xl text-base leading-8 text-white/75">
                A dedicated accountant costs <strong className="text-white">£100s a month.</strong> A business coach costs <strong className="text-white">£100s a month.</strong> You get both for £27.
              </p>
              <div className="whitespace-nowrap text-4xl font-black text-primary">£27/mo</div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-[1500px]">
            <SectionLabel>What You Get</SectionLabel>
            <h2 className="max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Your numbers. Your marketing. <span className="text-primary">Both handled. Finally.</span>
            </h2>

            <div className="mt-8 grid gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["18 years", "In the industry"],
                ["800+", "Salon owners helped"],
                ["Millions", "Generated"],
                ["20+", "Industry awards"],
              ].map(([num, label]) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-black text-primary">{num}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-4xl text-base leading-8 text-slate-600">
              Katie Godfrey isn't just another business coach. She's done it herself. Built salons, built academies, and built a proven system that doubles and triples salon income. Salon Success Manager is part of that system. In your pocket. 24/7. For £27 a month.
            </p>

            <FeatureFinance />
            <FeatureAi />
            <FeatureCall />
            <FeatureVideos />
          </div>
        </section>

        <section className="grid gap-10 bg-slate-950 px-4 py-16 text-white sm:px-6 lg:grid-cols-[0.85fr_1fr] lg:px-10 lg:py-24">
          <div className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <img src="/Katie_image_2.jpeg" alt="Katie Godfrey" className="h-full min-h-[420px] w-full object-cover" />
          </div>
          <div className="mx-auto max-w-3xl self-center">
            <SectionLabel>About Katie</SectionLabel>
            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              From <span className="text-primary">£50,000 in debt</span> to million pound brand I built this so you don't have to figure it out the hard way.
            </h2>
            <div className="mt-7 space-y-5 text-base leading-8 text-white/65">
              <p>When I started my first salon at 19, I was over £50,000 in debt and my Dad gave me £40 a week to get by. My salon couldn't afford to pay me. Nobody taught me about business finances. I had to figure it out the hard way. Sleepless nights, scary tax bills, months where I worked non-stop but had nothing to show for it.</p>
              <p>Over the years, I turned that salon into a multi-award-winning, multi-location business. Nationwide training academy. Launched my own professional product line and now I mentor thousands of businesses worldwide.</p>
              <p>What I kept seeing in my clients was the same thing I'd been through myself. Talented, hard-working people who were scared of their numbers, stuck on their pricing, unsure how to grow. So I built them tools. Ran the sessions. Answered the questions at 10pm on a Tuesday. That's what became Salon Success Manager.</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["18 Years", "In the beauty industry"],
                ["800+", "Salon owners coached"],
                ["20+ Awards", "Industry recognition"],
                ["100+ Press", "Features worldwide"],
              ].map(([num, desc]) => (
                <div key={num} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                  <div className="text-2xl font-black text-primary">{num}</div>
                  <div className="mt-1 text-sm text-white/45">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#faf8f9] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-[1500px]">
            <SectionLabel>From Members</SectionLabel>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Real results from <span className="text-primary">real salon owners</span></h2>
            <p className="mt-3 text-slate-600">What members say after joining Salon Success Manager</p>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {selectedReviewGroups.map((reviewGroup) => (
                <ReviewCollageCard key={reviewGroup.title} title={reviewGroup.title} images={reviewGroup.images} />
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white px-4 py-16 text-center sm:px-6 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">One simple subscription. <span className="text-primary">Everything included.</span></h2>
            <p className="mt-4 text-slate-600">No hidden extras. No paying separately for the AI. No surprise charges.</p>
            <div className="relative mt-10 overflow-hidden rounded-3xl bg-slate-950 p-7 text-left text-white sm:p-10">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative text-center">
                <div className="text-6xl font-black"><span className="text-3xl text-white/50">£</span>27<span className="text-2xl text-white/50">/mo</span></div>
                <p className="mt-2 text-sm text-white/55">Cancel anytime. No long-term commitment.</p>
              </div>
              <ul className="relative mt-8 space-y-4">
                {pricingItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-white/80 sm:text-base">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-primary p-1 text-white" />
                    <span>{item}{item.startsWith("KG AI") && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">worth £49 month alone</span>}</span>
                  </li>
                ))}
              </ul>
              <div className="relative mt-9">
                <CtaButton className="w-full justify-center">Start your free trial</CtaButton>
                <p className="mt-4 text-center text-sm text-white/45">No commitment · Cancel anytime · Set up in minutes</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#faf8f9] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-[1500px]">
            <SectionLabel>Common Questions</SectionLabel>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Things people ask <span className="text-primary">before joining</span></h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-primary/15 bg-white p-6">
                  <div className="mb-4 flex items-start gap-3">
                    <HelpCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <h3 className="text-lg font-black">{faq.question}</h3>
                  </div>
                  <p className="leading-7 text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary px-4 py-16 text-center text-white sm:px-6 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">You shouldn't have to figure this out alone.</h2>
            <p className="mt-6 text-lg leading-8 text-white/80">
              Join hundreds of salon and clinic owners who finally know their numbers, price with confidence, and have Katie in their corner, for their finances, their team, their social media, and everything in between.
            </p>
            <div className="mt-9">
              <Link href="/register">
                <Button className="h-auto rounded-md bg-white px-8 py-4 text-base font-black text-slate-950 hover:bg-white/90">
                  Start your free trial today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-white/75">
              <span>No commitment</span>
              <span>Cancel anytime</span>
              <span>Set up in minutes</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 px-4 py-8 text-center text-sm text-white/45 sm:px-6 lg:px-10">
        <p>© 2025 Salon Success Manager · Katie Godfrey</p>
        <div className="mt-2 flex justify-center gap-4 text-white/25">
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}

function ProblemCard({ icon, title, subtitle, items }: { icon: React.ReactNode; title: string; subtitle: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-white p-6 shadow-sm shadow-slate-200/70 sm:p-8">
      <div className="mb-3 flex items-center gap-3 text-primary">
        {icon}
        <h3 className="text-2xl font-black text-slate-950">{title}</h3>
      </div>
      <p className="border-b border-slate-100 pb-5 text-sm text-slate-500">{subtitle}</p>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-slate-700">
            <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewCollageCard({ title, images }: { title: string; images: string[] }) {
  const visibleImages = images.slice(0, 5);
  const extraCount = Math.max(images.length - visibleImages.length, 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm shadow-slate-200/60">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xl font-black text-slate-900">5.0</span>
            <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Excellent</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Based on real Salon Success Manager member screenshots</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          {images.length} reviews
        </div>
      </div>

      <div className="grid h-[330px] grid-cols-[1.1fr_1fr] gap-2 p-4 sm:h-[370px] sm:p-5">
        <ReviewImageTile src={visibleImages[0]} className="h-full" />
        <div className="grid h-full grid-cols-2 gap-2">
          {visibleImages.slice(1).map((image, index) => (
            <ReviewImageTile key={image} src={image} extraCount={index === 3 ? extraCount : 0} />
          ))}
        </div>
      </div>
    </article>
  );
}

function ReviewImageTile({ src, className = "", extraCount = 0 }: { src: string; className?: string; extraCount?: number }) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={`relative block overflow-hidden rounded-xl bg-[#fff8fb] ring-1 ring-primary/10 ${className}`}
      aria-label="Open member review image"
    >
      <img src={src} alt="Salon Success Manager member review" className="h-full w-full object-contain" loading="lazy" />
      {extraCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-2xl font-black text-white">
          +{extraCount}
        </div>
      )}
    </a>
  );
}

function FeatureFinance() {
  return (
    <div className="mt-16 grid gap-10 border-b border-slate-100 pb-16 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-primary">Feature 01 - Finance Tools</p>
        <h3 className="text-3xl font-black leading-tight">From financial chaos to complete clarity - automatically.</h3>
        <div className="mt-5 space-y-4 text-base leading-8 text-slate-600">
          <p>These aren't generic tools built by someone who's never set foot in a salon. The breakeven calculator, pricing tool, and Katie's famous CEO Numbers System were built by someone who has owned salons, run academies, and spent 18 years coaching over 800 salon and clinic owners through exactly the financial mistakes you're making right now.</p>
          <p>In minutes you'll know whether your business is actually profitable, whether your prices are right, and exactly what needs to change to start paying yourself properly. This is no longer an expensive hobby.</p>
        </div>
        <ul className="mt-6 space-y-3">
          {financeTools.map((item) => (
            <li key={item} className="flex items-center gap-3 font-semibold text-slate-800">
              <Check className="h-5 w-5 rounded-full bg-primary p-1 text-white" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-center lg:justify-center">
        <img
          src="/Katie_image_3.jpeg"
          alt="Katie Godfrey"
          className="h-[420px] w-auto max-w-full rounded-2xl object-contain sm:h-[520px]"
          loading="lazy"
        />
      </div>
    </div>
  );
}

function FeatureAi() {
  return (
    <div className="my-16 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#1c1c2e_0%,#211a2c_55%,#321d2b_100%)] p-6 text-white shadow-2xl shadow-slate-950/10 sm:p-10 lg:p-14">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.08fr] lg:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5 fill-current" />
            KG AI Mentor
          </div>
          <h3 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">Katie Godfrey in your pocket. 24/7.</h3>
          <div className="mt-7 space-y-5 text-base leading-8 text-white/75">
            <p>To work with Katie personally, salon owners invest <strong className="text-white">over £10,000.</strong> To be in her mastermind, there's a waiting list.</p>
            <p>Now that same brain - every method, every framework, every answer - is available inside Salon Success Manager. Any time. Any question. No waiting list. No four-figure investment.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {aiTopics.map((topic) => (
              <span key={topic} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">{topic}</span>
            ))}
          </div>
          <p className="mt-7 text-sm text-white/50">Sold separately for <strong className="text-primary">£49/month.</strong> Included in your subscription at no extra cost.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-2xl backdrop-blur">
          <div className="mb-5 flex items-center gap-2 text-sm text-white/45">
            <Bot className="h-4 w-4 text-primary" />
            KG AI Mentor
          </div>
          {[
            ["user", "It's 11pm and I have no idea what to post tomorrow"],
            ["ai", "No stress. Here are 3 content ideas based on your services and what's performing well in your industry right now..."],
            ["user", "Are my prices actually profitable?"],
            ["ai", "Let's check. Based on your hourly rate and treatment times, your brow lamination is currently running at a 12% margin - here's how to fix that..."],
            ["user", "How do I handle a staff member who's always late?"],
            ["ai", "This is really common. Here's exactly how I'd approach the conversation and what to put in writing..."],
          ].map(([type, text], index) => (
            <div key={`${type}-${index}`} className={`mb-4 max-w-[88%] rounded-xl px-4 py-3 text-sm font-medium leading-6 ${type === "user" ? "ml-auto bg-primary text-white" : "bg-white/12 text-white"}`}>
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCall() {
  return (
    <div className="grid gap-10 border-b border-slate-100 pb-16 lg:grid-cols-2 lg:items-center">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-600">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Live - Not a Recording
        </div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-primary">Feature 03 - Monthly Call</p>
        <h3 className="text-3xl font-black leading-tight">Monthly live accountability call with Katie. Not a recording. Not a replay. Live.</h3>
        <p className="mt-5 text-base leading-8 text-slate-600">
          Once a month you're in the room with Katie and a community of salon and clinic owners. Ask your questions, demos on the system, get personalised input, and leave with a clear plan. This alone is worth more than the monthly subscription.
        </p>
      </div>
      <div className="rounded-3xl border border-primary/30 bg-primary/10 p-6">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm shadow-primary/10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-black text-white">KG</div>
          <div>
            <h4 className="font-black">Katie Godfrey</h4>
            <p className="text-sm text-slate-500">Business Strategist · 18 years · 800+ clients</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <p className="font-bold">Ask Katie anything. Live. Every month.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {featurePreviewImages.map((image) => (
              <a
                key={image.title}
                href={image.src}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl border border-primary/15 bg-[#fff8fb] p-2 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10"
                aria-label={`Open ${image.title} preview`}
              >
                <div className="aspect-video overflow-hidden rounded-lg bg-white">
                  <img
                    src={image.src}
                    alt={`${image.title} preview`}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <p className="mt-2 text-center text-[11px] font-bold text-slate-700 sm:text-xs">{image.title}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVideos() {
  return (
    <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-primary">Feature 04 - Video Walkthroughs</p>
        <h3 className="text-3xl font-black leading-tight">Video walkthroughs on every single page</h3>
        <p className="mt-5 text-base leading-8 text-slate-600">
          Every tool inside Salon Success Manager has a short video showing you exactly how to use it. No guessing, no getting lost. You will be up and running in under 30 minutes. Money and numbers just got extremely easy! No more relying on the accountant.
        </p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {walkthroughVideos.map((video) => (
            <div key={video.title} className="rounded-2xl bg-white p-4 shadow-sm">
              <Link href="/register" aria-label={`Register to watch ${video.title}`}>
                <div className="group relative aspect-video overflow-hidden rounded-xl bg-slate-950">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-full w-full object-cover opacity-80 blur-[1px] transition duration-300 group-hover:scale-[1.03] group-hover:opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-slate-950/25" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg transition duration-300 group-hover:scale-105 sm:h-14 sm:w-20">
                      <Play className="ml-1 h-6 w-6 fill-current sm:h-7 sm:w-7" />
                    </div>
                  </div>
                </div>
              </Link>
              {/* <p className="mt-3 text-sm font-bold">{video.title}</p> */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
