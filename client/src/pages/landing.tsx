import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Percent, Receipt, Package, TrendingUp, DollarSign, FileText, Star, Users, Shield, Crown } from "lucide-react";
import { Link } from "wouter";
import katiePhotoPath from "@assets/katie-photo.png";

const features = [
  {
    icon: Clock,
    title: "Hourly Rate Calculator",
    description: "Work out how much it costs you per hour to run your business, so you can check if your treatments are actually priced correctly"
  },
  {
    icon: Percent,
    title: "Profit Margin Calculator", 
    description: "Break down the profit in every treatment or training course, so you know exactly what's worth your time"
  },
  {
    icon: DollarSign,
    title: "CEO Numbers Dashboard",
    description: "Katie's famous CEO System helps business owners finally understand their numbers, so they can stop winging it or hiding from the figures"
  },
  {
    icon: Package,
    title: "Stock Budget Calculator",
    description: "Does it feel like all your money is constantly going on stock? Create a monthly budget to help you stay in control and stop overspending"
  },
  {
    icon: TrendingUp,
    title: "Revenue Projections",
    description: "Have income goals you'd love to hit? Let's break them down clearly, so you know exactly how many extra clients you need, and for which treatments"
  },
  {
    icon: Receipt,
    title: "Expense Tracker",
    description: "Keep track of all your business costs and put them into categories to stay on top of your finances"
  },
  {
    icon: FileText,
    title: "Professional Reports",
    description: "Generate PDF reports, CSV exports, and email summaries"
  }
];

const testimonials = [
  {
    name: "Sarah Mitchell",
    business: "Hair Salon Owner",
    quote: "This tool completely transformed how I price my services. I'm now making 40% more profit!",
    rating: 5
  },
  {
    name: "Emma Johnson", 
    business: "Beauty Clinic",
    quote: "The expense tracking alone has saved me thousands. I can see exactly where my money goes.",
    rating: 5
  },
  {
    name: "Lisa Williams",
    business: "Training Academy",
    quote: "Running a training academy means juggling so many numbers. This app keeps everything organised and shows me exactly which courses are most profitable.",
    rating: 5
  }
];

const pricingBenefits = [
  "Unlimited access to all calculators",
  "Advanced reporting and exports",
  "Multi-business tracking",
  "Professional PDF reports",
  "Email support",
  "Data security and backups",
  "Mobile responsive design",
  "Regular feature updates"
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div>
                <h1 className="text-base sm:text-xl font-bold text-slate-800">Salon Success Manager</h1>
                <p className="text-xs sm:text-sm text-slate-500">by Katie Godfrey</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-4">Subscribe Now</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-10 sm:py-16 lg:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="mb-4 sm:mb-6 flex justify-center lg:justify-start">
                <h2 className="text-xl sm:text-2xl font-bold text-primary">Salon Success Manager</h2>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
                Transform Your Salon into a 
                <span className="text-primary"> Profitable Business</span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 mb-6 sm:mb-8 leading-relaxed">
                Stop guessing your prices. Start managing like a CEO. Get the financial clarity and tools you need 
                to build a successful salon, clinic, or training academy.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                    Subscribe Now
                    <span className="ml-2">→</span>
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                  Watch Demo
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-3 sm:mt-4">
                £23.97/month • Cancel anytime • Have a promo code? Enter during signup
              </p>
            </div>
            
            <div className="relative mt-8 lg:mt-0">
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary/80 h-2 sm:h-3"></div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        </div>
                        <span className="text-sm sm:text-base font-medium">Monthly Revenue</span>
                      </div>
                      <span className="text-lg sm:text-2xl font-bold text-green-600">£12,450</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                        </div>
                        <span className="text-sm sm:text-base font-medium">Profit Margin</span>
                      </div>
                      <span className="text-lg sm:text-2xl font-bold text-blue-600">68%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                        </div>
                        <span className="text-sm sm:text-base font-medium">Hourly Rate</span>
                      </div>
                      <span className="text-lg sm:text-2xl font-bold text-purple-600">£85</span>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6 h-24 sm:h-32 bg-gradient-to-r from-primary/10 to-blue-100 rounded-lg flex items-end justify-center">
                    <div className="flex items-end gap-1 sm:gap-2 pb-3 sm:pb-4">
                      {[40, 65, 45, 80, 60, 90, 75].map((height, i) => (
                        <div
                          key={i}
                          className="bg-primary rounded-t"
                          style={{ height: `${height}%`, width: '8px', minWidth: '8px' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Cards */}
              <div className="hidden sm:block absolute -top-4 -left-4 bg-white rounded-lg shadow-lg p-3 border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">+32% Growth</span>
                </div>
              </div>
              
              <div className="hidden sm:block absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-3 border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">280 Clients</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-blue-50 border-l-4 border-primary p-4 sm:p-6 lg:p-8 rounded-r-lg">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                <img 
                src={katiePhotoPath} 
                alt="Katie Godfrey" 
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
              />
              </div>
              <div className="flex-1">
                <p className="text-sm sm:text-base lg:text-lg text-slate-700 italic leading-relaxed mb-3 sm:mb-4">
                  "So many professionals come to me confused about why they're making money, but have nothing left at the end of the month. Nine times out of ten, it comes down to incorrect pricing and not knowing their break-even point or the real cost of running their business day-to-day. This app takes the guesswork out of your numbers, no spreadsheets, no confusing accountant jargon. Just simple, clear insights to help you understand exactly how to price, where your profit is, and how to finally make more money in your business."
                </p>
                <p className="text-xs sm:text-sm font-semibold text-primary">- Katie Godfrey, Business Strategist</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              See Your Business Dashboard in Action
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Get real-time insights and manage every aspect of your salon business
            </p>
          </div>
          
          <div className="relative">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border">
              {/* Mock Browser Header */}
              <div className="bg-slate-100 px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2">
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full"></div>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex-1 bg-white rounded px-2 sm:px-3 py-1 mx-2 sm:mx-4">
                  <span className="text-xs sm:text-sm text-slate-500">salon-success-manager.app</span>
                </div>
              </div>
              
              {/* Mock Dashboard */}
              <div className="p-4 sm:p-6 bg-gradient-to-br from-white to-slate-50">
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-slate-600">This Month's Revenue</span>
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">£18,240</div>
                    <div className="text-xs sm:text-sm text-green-600">+24% from last month</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-slate-600">Average Profit Margin</span>
                      <Percent className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">72%</div>
                    <div className="text-xs sm:text-sm text-blue-600">Above industry average</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border sm:col-span-2 md:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-slate-600">Optimal Hourly Rate</span>
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">£95</div>
                    <div className="text-xs sm:text-sm text-purple-600">Based on your data</div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Recent Calculations</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5 sm:py-2">
                        <span className="text-xs sm:text-sm">Hair Cut & Blow Dry</span>
                        <span className="font-medium text-sm sm:text-base">£45</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 sm:py-2">
                        <span className="text-xs sm:text-sm">Full Colour Treatment</span>
                        <span className="font-medium text-sm sm:text-base">£120</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 sm:py-2">
                        <span className="text-xs sm:text-sm">Wedding Package</span>
                        <span className="font-medium text-sm sm:text-base">£350</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                    <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Expense Overview</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5 sm:py-2">
                        <span className="text-xs sm:text-sm">Product Supplies</span>
                        <span className="text-red-600 text-sm sm:text-base">-£1,240</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 sm:py-2">
                        <span className="text-xs sm:text-sm">Rent & Utilities</span>
                        <span className="text-red-600 text-sm sm:text-base">-£2,400</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 sm:py-2">
                        <span className="text-xs sm:text-sm">Marketing</span>
                        <span className="text-red-600 text-sm sm:text-base">-£480</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Professional tools designed specifically for salon and clinic owners
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm sm:text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 relative">
        {/* Luxury Salon Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 to-slate-800/90">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3CradialGradient id='light1' cx='20%25' cy='30%25' r='15%25'%3E%3Cstop offset='0%25' style='stop-color:%23fbbf24;stop-opacity:0.8'/%3E%3Cstop offset='100%25' style='stop-color:%23fbbf24;stop-opacity:0'/%3E%3C/radialGradient%3E%3CradialGradient id='light2' cx='80%25' cy='20%25' r='12%25'%3E%3Cstop offset='0%25' style='stop-color:%23f59e0b;stop-opacity:0.6'/%3E%3Cstop offset='100%25' style='stop-color:%23f59e0b;stop-opacity:0'/%3E%3C/radialGradient%3E%3ClinearGradient id='mirror' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%23e5e7eb;stop-opacity:0.3'/%3E%3Cstop offset='50%25' style='stop-color:%23f9fafb;stop-opacity:0.8'/%3E%3Cstop offset='100%25' style='stop-color:%23e5e7eb;stop-opacity:0.3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='800' fill='%23111827'/%3E%3Cellipse cx='200' cy='240' rx='120' ry='8' fill='%23374151' opacity='0.4'/%3E%3Crect x='50' y='150' width='300' height='180' rx='15' fill='url(%23mirror)' opacity='0.6'/%3E%3Crect x='400' y='200' width='80' height='300' rx='40' fill='%23d1d5db' opacity='0.3'/%3E%3Crect x='550' y='180' width='100' height='60' rx='8' fill='%239ca3af' opacity='0.4'/%3E%3Ccircle cx='750' cy='200' r='25' fill='url(%23light1)'/%3E%3Ccircle cx='950' cy='150' r='20' fill='url(%23light2)'/%3E%3Crect x='800' y='300' width='200' height='120' rx='10' fill='%236b7280' opacity='0.2'/%3E%3Cpath d='M100 500 Q300 480 500 500 T900 520' stroke='%239ca3af' stroke-width='2' fill='none' opacity='0.3'/%3E%3Crect x='700' y='450' width='60' height='80' rx='5' fill='%23d1d5db' opacity='0.3'/%3E%3C/svg%3E")`
            }}
          />
        </div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Trusted by Salon Owners Across the World
            </h2>
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 text-sm sm:text-base text-slate-200">4.9/5 from 200+ reviews</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                      <span className="text-primary font-bold text-base sm:text-lg">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 mb-3 sm:mb-4 italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold text-sm sm:text-base text-slate-900">{testimonial.name}</p>
                    <p className="text-xs sm:text-sm text-slate-500">{testimonial.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              One plan, all features, incredible value
            </p>
          </div>

          <Card className="border-2 border-primary shadow-xl">
            <CardHeader className="text-center pb-2">
              <Badge variant="default" className="w-fit mx-auto mb-3 sm:mb-4 text-xs sm:text-sm">
                Most Popular
              </Badge>
              <CardTitle className="text-xl sm:text-2xl">Professional Plan</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
                <span className="text-3xl sm:text-4xl font-bold text-slate-900">£23.97</span>
                <span className="text-sm sm:text-base text-slate-500">/month</span>
              </div>
              <CardDescription className="text-sm sm:text-base mt-2">
                Everything you need to manage your business professionally
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {pricingBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 sm:gap-3">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-slate-700">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <Link href="/register">
                  <Button size="lg" className="w-full text-base sm:text-lg py-3 sm:py-4">
                    Subscribe Now - £23.97/month
                  </Button>
                </Link>
                <p className="text-center text-xs sm:text-sm text-slate-500">
                  Cancel anytime • Have a promo code? Enter during signup
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-primary text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-base sm:text-xl mb-6 sm:mb-8 text-primary-foreground/90">
            Join hundreds of salon owners who've increased their profits with data-driven decisions
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="w-full text-black sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                Subscribe Now
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-black text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 border-white hover:bg-white hover:text-primary">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div>
              <div className="mb-3 sm:mb-4">
                <h3 className="font-bold text-base sm:text-lg">Salon Success Manager</h3>
                <p className="text-xs sm:text-sm text-slate-400">by Katie Godfrey</p>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm">
                Professional business management tools for salon and clinic owners.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><a href="https://kgbusinessmentor.com/" className="hover:text-white">About Katie</a></li>
                <li><a href="mailto:info@kgbusinessmentor.com" className="hover:text-white">Contact</a></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Get Started</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><Link href="/register" className="hover:text-white">Subscribe</Link></li>
                <li><Link href="/login" className="hover:text-white">Sign In</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-slate-400">
            <p>&copy; 2025 Katie Godfrey Business Mentor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}