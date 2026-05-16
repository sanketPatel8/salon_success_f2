import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Percent, Receipt, Package, TrendingUp, DollarSign, FileText, Star, Users, Target, Shield, Crown, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import katiePhotoPath from "@assets/katie-photo.png";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildDefaultHomepageCmsContent } from "@shared/homepage-cms";

const featureIcons = [Clock, Percent, DollarSign, Package, TrendingUp, Receipt, FileText, Target];

export default function Landing() {
  const [showDemo, setShowDemo] = useState(false);
  const [, navigate] = useLocation();
  const defaultContent = buildDefaultHomepageCmsContent();
  const { data } = useQuery({
    queryKey: ["/api/homepage-content"],
    queryFn: async () => {
      const response = await fetch("/api/homepage-content");
      if (!response.ok) {
        throw new Error("Failed to load homepage content");
      }
      return response.json() as Promise<{ content: typeof defaultContent }>;
    },
    retry: false,
  });
  const content = data?.content ?? defaultContent;

  useEffect(() => {
    // Base Meta Pixel Code
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod ?
    n.callMethod.apply(n,arguments) : n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', '544990893994369');
    fbq('track', 'PageView');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img 
                src="/logo_withbg.jpeg" 
                alt="The Salon Success Manager Logo" 
                className="h-14 w-14 sm:h-16 sm:w-16"
              />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">{content.header.signInText}</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="text-xs text-white sm:text-sm px-2 sm:px-4">{content.header.trialButtonText}</Button>
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
              <div className="mb-4 sm:mb-6 flex justify-center">
                <img 
                src="/logo_withbg.jpeg" 
                alt="The Salon Success Manager Logo" 
                className="h-24 w-24 sm:h-24 sm:w-24"
              />
                {/* <h2 className="text-xl sm:text-2xl font-bold text-primary">The Salon Success Manager</h2> */}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
                {content.hero.headline}
                <span className="text-primary"> {content.hero.highlightedText}</span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 mb-6 sm:mb-8 leading-relaxed">
                {content.hero.description}
              </p>
              {/* <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
                Stop Guessing. Start Managing 
                <span className="text-primary"> Like a CEO.</span>
              </h1>
              
              <p className="text-base sm:text-md lg:text-lg text-slate-600 mb-6 sm:mb-8 leading-relaxed">
                Most salon owners are incredible at what they do , but when it comes to numbers? It’s confusing, overwhelming, and easy to avoid. That’s where Salon Success Manager comes in. The no - jargon financial tool built specifically for the hair, beauty, and aesthetics industry. It’s the easiest way to finally take control of your pricing, profits, and business growth.
              </p> */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto text-white text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                    {content.hero.primaryCtaText}
                    <span className="ml-2">→</span>
                  </Button>
                </Link>
                <Button onClick={() => setShowDemo(true)} size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                  {content.hero.demoCtaText}
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-3 sm:mt-4">
                {content.hero.trialNote}
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
                      <span className="text-lg sm:text-2xl font-bold text-blue-600">38%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                        </div>
                        <span className="text-sm sm:text-base font-medium">Hourly Rate</span>
                      </div>
                      <span className="text-lg sm:text-2xl font-bold text-purple-600">£35</span>
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

      {showDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl relative">
            <button
              onClick={() => setShowDemo(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
            >
              <X size={32} />
            </button>
            
            <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                width="560"
                height="315"
                src="https://www.youtube.com/embed/yitHSnYrNNI?si=Zt-FSphqLzrCEtRf"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      <section className="relative flex items-center justify-center overflow-hidden bg-hsl(348 30% 85%)">
  
  {/* Content Container */}
  <div className="relative z-10 max-w-6xl mx-auto px-6 my-16 py-4">
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
      
      {/* Left Side - Image */}
      <div className="w-full lg:w-1/2 h-full">
        <img 
          src="/Katie_image.jpeg" 
          alt="Salon Success Manager Dashboard" 
          className="w-full h-[600px] rounded-lg shadow-xl object-cover"
        />
      </div>

      {/* Right Side - Content */}
      <div className="w-full lg:w-1/2 text-center lg:text-left">
        {/* Main Headline */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-8 leading-tight">
          {content.ceoSection.title}
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-800 mb-6 leading-relaxed">
          {content.ceoSection.subtitle}
        </p>

        {/* Product Introduction */}
        <p className="text-xl md:text-2xl text-primary font-semibold mb-6">
          {content.ceoSection.introHighlight}
        </p>

        {/* Description */}
        <div className="mb-12">
          <p className="text-base md:text-lg text-gray-800 leading-relaxed mb-4">
            {content.ceoSection.descriptionLineOne}
          </p>
          <p className="text-lg md:text-xl font-medium text-gray-800">
            {content.ceoSection.descriptionLineTwo}
          </p>
        </div>
      </div>

    </div>
  </div>
</section>

      {/* Testimonial Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-hsl(348 30% 85%)">
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
                <div className="text-sm sm:text-base lg:text-lg text-slate-700 italic leading-relaxed mb-3 sm:mb-4">
                  <p>
                  "{content.founderQuote.paragraphOne}
                  </p>
                  <p className="mt-3">
                  {content.founderQuote.paragraphTwo}"
                  </p>
                </div>
                <p className="text-xs italic sm:text-sm font-semibold text-primary">{content.founderQuote.attribution}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-hsl(348 30% 85%)">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              {content.appPreview.title}
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              {content.appPreview.subtitle}
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
            <span className="text-xs sm:text-sm text-slate-500">salonsuccessmanager.com</span>
            </div>
            </div>
            
            <main className="flex-1 p-8 overflow-y-auto">
        {/* Metrics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Current Hourly Rate Card */}
          <div className="rounded-lg bg-card text-card-foreground shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Current Hourly Rate</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">£13.20</p>
                  <p className="text-sm mt-2 flex items-center text-success">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-trending-up h-3 w-3 mr-1"
                    >
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                      <polyline points="16 7 22 7 22 13"></polyline>
                    </svg>
                    +12% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-clock text-primary h-6 w-6"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Average Profit Margin Card */}
          <div className="rounded-lg bg-card text-card-foreground shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Avg Profit Margin</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">38.0%</p>
                  <p className="text-sm mt-2 flex items-center text-success">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-trending-up h-3 w-3 mr-1"
                    >
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                      <polyline points="16 7 22 7 22 13"></polyline>
                    </svg>
                    +5% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-percent text-success h-6 w-6"
                  >
                    <line x1="19" x2="5" y1="5" y2="19"></line>
                    <circle cx="6.5" cy="6.5" r="2.5"></circle>
                    <circle cx="17.5" cy="17.5" r="2.5"></circle>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Card */}
          <div className="rounded-lg bg-card text-card-foreground shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">£2,650.20</p>
                  <p className="text-sm mt-2 flex items-center text-warning">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-trending-up h-3 w-3 mr-1 rotate-180"
                    >
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                      <polyline points="16 7 22 7 22 13"></polyline>
                    </svg>
                    -3% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-dollar-sign text-warning h-6 w-6"
                  >
                    <line x1="12" x2="12" y1="2" y2="22"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Active Treatments Card */}
          <div className="rounded-lg bg-card text-card-foreground shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Active Treatments</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">12</p>
                  <p className="text-sm mt-2 flex items-center text-slate-500">Services offered</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-bath text-purple-600 h-6 w-6"
                  >
                    <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"></path>
                    <line x1="10" x2="8" y1="5" y2="7"></line>
                    <line x1="2" x2="22" y1="12" y2="12"></line>
                    <line x1="7" x2="7" y1="19" y2="21"></line>
                    <line x1="17" x2="17" y1="19" y2="21"></line>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calculator Cards Grid */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
          style={{
            marginBottom: 0,
          }}
        >
          {/* Hourly Rate Calculator Card */}
          <div className="rounded-lg bg-card text-card-foreground shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Hourly Rate Calculator</h3>
                  <p className="text-slate-600 text-sm mt-1">Calculate your optimal hourly rate based on expenses and goals</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-clock text-primary h-5 w-5"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Current Hourly Rate:</span>
                  <span className="text-2xl font-bold text-primary">£13.20</span>
                </div>
                <p className="text-slate-600 text-sm mt-2">Based on your latest calculation</p>
              </div>

              <button
                onClick={() => navigate('/hourly-rate')}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 h-10 px-4 py-2 w-full bg-primary text-white hover-bg-[#FFB6C1]"
              >
                Open Calculator
              </button>
            </div>
          </div>

          {/* Treatment Profit Calculator Card */}
          <div className="rounded-lg bg-card text-card-foreground shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Treatment Profit Calculator</h3>
                  <p className="text-slate-600 text-sm mt-1">Calculate profit margins for individual treatments</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-percent text-success h-5 w-5"
                  >
                    <line x1="19" x2="5" y1="5" y2="19"></line>
                    <circle cx="6.5" cy="6.5" r="2.5"></circle>
                    <circle cx="17.5" cy="17.5" r="2.5"></circle>
                  </svg>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Average Profit Margin:</span>
                  <span className="text-2xl font-bold text-success">38.0%</span>
                </div>
                <p className="text-slate-600 text-sm mt-2">Across all your treatments</p>
              </div>

              <button
                onClick={() => navigate('/profit-margin')}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 h-10 px-4 py-2 w-full bg-success text-white hover-bg-[#FFB6C1]"
              >
                Open Calculator
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-hsl(348 30% 85%)">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              {content.featuresSection.title}
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              {content.featuresSection.subtitle}
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {content.featuresSection.items.map((feature, index) => {
              const Icon = featureIcons[index % featureIcons.length];
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

      <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {/* Main Heading */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">
          {content.supportSection.title}
        </h2>
        
        {/* Subheading */}
        <p className="text-md md:text-lg text-gray-600 text-center mb-16">
          {content.supportSection.subtitle}
        </p>

        {/* Included With Your Subscription */}
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-12">
          {content.supportSection.introTitle}
        </h3>

        {/* Features List */}
        <div className="space-y-6">
          {content.supportSection.items.map((item, index) => (
          <div key={`support-item-${index}`} className="bg-[#F8FBFF] rounded-lg border border-[#CFE4FE] p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex gap-6 items-start">
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-md flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-3">
                  {item.title}
                </h4>
                <p className="text-base md:text-md text-gray-700 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
          ))}
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
              {content.testimonialsSection.title}
            </h2>
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 text-sm sm:text-base text-slate-200">{content.testimonialsSection.ratingText}</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {content.testimonialsSection.items.map((testimonial, index) => (
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
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-hsl(348 30% 85%)">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              {content.pricingSection.title}
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              {content.pricingSection.subtitle}
            </p>
          </div>

          <Card className="border-2 border-primary shadow-xl">
            <CardHeader className="text-center pb-2">
              <Badge variant="default" className="w-fit mx-auto mb-3 sm:mb-4 text-xs sm:text-sm">
                {content.pricingSection.badgeText}
              </Badge>
              <CardTitle className="text-xl sm:text-2xl">{content.pricingSection.cardTitle}</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
                {/* <span className="text-3xl sm:text-4xl font-bold text-slate-900">£27</span>
                <span className="text-sm sm:text-base text-slate-500">/month</span> */}
              </div>
              <CardDescription className="text-sm sm:text-base mt-2">
                {content.pricingSection.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {content.pricingSection.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 sm:gap-3">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-slate-700">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <Link href="/register">
                  <Button size="lg" className="w-full text-base sm:text-lg py-3 sm:py-4">
                    {content.pricingSection.primaryCtaText}
                  </Button>
                </Link>
                <p className="text-center text-xs sm:text-sm text-slate-500">
                  {content.pricingSection.note}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-20 px-6 bg-hsl(348 30% 85%)">
      <div className="max-w-5xl mx-auto">
        {/* Main Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
          {content.experienceSection.title}
        </h2>

        {/* White Card Container */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          {/* Benefits List */}
          <div className="space-y-6 mb-12">
            {content.experienceSection.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4">
                {/* Green Checkmark Circle */}
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-sm">
                  <svg 
                    className="w-4 h-4 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </div>
                
                {/* Benefit Text */}
                <p className="text-md md:text-xl text-gray-700 leading-relaxed pt-1">
                  {benefit}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-3 mt-12">
            <button
            onClick={() => window.location.href = "/register"} 
            className="group bg-primary hover:from-pink-500 hover:to-pink-600 text-white text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-2 rounded-md shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3">
              {content.experienceSection.primaryCtaText}
              <svg 
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 8l4 4m0 0l-4 4m4-4H3" 
                />
              </svg>
            </button>
            
            {/* Subtext */}
            <p className="text-sm md:text-base text-gray-500">
              {content.experienceSection.note}
            </p>
          </div>
        </div>
      </div>
    </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-primary text-white">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            {content.finalCta.title}
          </h2>
          <p className="text-base sm:text-xl mb-6 sm:mb-8 text-primary-foreground/90">
            {content.finalCta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 justify-center">
            <div className="flex flex-col items-center">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="w-full text-black sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                  {content.finalCta.primaryCtaText}
                </Button>
              </Link>
              <p className="text-sm text-black/90 pt-2">
                {content.finalCta.note}
              </p>
            </div>
            {/* <Link href="/contact">
              <Button size="lg" variant="secondary" className="w-full text-black sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                Contact Sales
              </Button>
            </Link> */}
          </div>
        </div>
      </section>

      

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div>
              <div className="mb-3 sm:mb-4">
                <h3 className="font-bold text-base sm:text-lg">{content.footer.brandTitle}</h3>
                <p className="text-xs sm:text-sm text-slate-400">{content.footer.brandSubtitle}</p>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm">
                {content.footer.description}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{content.footer.companyHeading}</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><a href={content.footer.aboutKatieUrl} className="hover:text-white">{content.footer.aboutKatieText}</a></li>
                <li><a href={`mailto:${content.footer.contactEmail}`} className="hover:text-white">{content.footer.contactText}</a></li>
                <li><Link href="/privacy" className="hover:text-white">{content.footer.privacyText}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{content.footer.getStartedHeading}</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><Link href="/register" className="hover:text-white">{content.footer.trialLinkText}</Link></li>
                <li><Link href="/login" className="hover:text-white">{content.footer.signInText}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-slate-400">
            <p>{content.footer.copyrightText}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
