import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/header";
import { Heart, Video, Users, Calendar, BookOpen, Sparkles, MessageCircle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";

interface AddEventCalendarProps {
  calendarId?: string;
  theme?: 'theme-light' | 'theme-dark';
  maxEvents?: number;
  includeAtc?: boolean;
  includeStc?: boolean;
  includeLocation?: boolean;
  includeTimezone?: boolean;
  includeOrganizer?: boolean;
  includeCountdown?: boolean;
  includeDescription?: boolean;
  height?: string;
}

// AddEvent Calendar Component with mobile optimization
function AddEventCalendar({
  calendarId = '1wn2kz0fr713',
  theme = 'theme-light',
  maxEvents = 20,
  includeAtc = true,
  includeStc = true,
  includeLocation = false,
  includeTimezone = false,
  includeOrganizer = false,
  includeCountdown = false,
  includeDescription = false,
  height = '500px'
}: AddEventCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load the AddEvent script only once
    if (!scriptLoadedRef.current) {
      const script = document.createElement('script');
      script.src = 'https://cdn.addevent.com/libs/cal/js/cal.events.embed.t5.init.js';
      script.type = 'text/javascript';
      script.async = true;
      
      script.onload = () => {
        scriptLoadedRef.current = true;
        // Trigger initialization if the global function exists
        if (typeof (window as any).addeventcal !== 'undefined') {
          (window as any).addeventcal.refresh();
        }
      };

      document.body.appendChild(script);

      return () => {
        // Cleanup: remove script when component unmounts
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    } else {
      // Script already loaded, just refresh
      if (typeof (window as any).addeventcal !== 'undefined') {
        (window as any).addeventcal.refresh();
      }
    }
  }, []);

  return (
    <div className="w-full overflow-hidden">
      <style>{`
        /* Mobile responsive styles for AddEvent calendar */
        .ae-emd-cal-events {
          font-size: 14px !important;
        }
        
        @media (max-width: 640px) {
          .ae-emd-cal-events {
            font-size: 12px !important;
          }
          .ae-emd-cal-events .ae-emd-event-title {
            font-size: 13px !important;
          }
          .ae-emd-cal-events .ae-emd-event-date {
            font-size: 11px !important;
          }
          
          /* Force header items to stack on mobile */
          .ae-emd-cal-events .ae-emd-head {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          
          .ae-emd-cal-events .ae-emd-head > * {
            width: 100% !important;
            display: block !important;
          }
          
          /* Stack "Upcoming events" dropdown and "Follow Calendar" button */
          .ae-emd-cal-events .ae-emd-head .ae-emd-left,
          .ae-emd-cal-events .ae-emd-head .ae-emd-right {
            width: 100% !important;
            margin: 0 !important;
          }
        }
        
        @media (min-width: 641px) and (max-width: 1024px) {
          .ae-emd-cal-events {
            font-size: 13px !important;
          }
        }
        
        /* Ensure calendar fits container */
        .ae-emd-cal-events * {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{ 
          width: '100%', 
          height,
          minHeight: '350px'
        }}
        className="ae-emd-cal-events"
        data-calendar={calendarId}
        data-lbl-upcoming="Upcoming events"
        data-lbl-subscribe="Follow Calendar"
        data-no-events="No events found..."
        data-lbl-readmore="Read more"
        data-lbl-in="In"
        data-lbl-days="days"
        data-lbl-day="day"
        data-lbl-hours="hours"
        data-lbl-hour="hour"
        data-lbl-minutes="minutes"
        data-lbl-minute="minute"
        data-lbl-seconds="seconds"
        data-lbl-second="second"
        data-lbl-live="LIVE"
        data-theme={theme}
        data-include-atc={includeAtc.toString()}
        data-include-stc={includeStc.toString()}
        data-include-moupcpicker="true"
        data-include-location={includeLocation.toString()}
        data-include-timezone={includeTimezone.toString()}
        data-include-organizer={includeOrganizer.toString()}
        data-include-countdown={includeCountdown.toString()}
        data-include-description={includeDescription.toString()}
        data-include-timezone-select="true"
        data-default-view="upcoming"
        data-stayonpage="false"
        data-datetime-format="1"
        data-datetime-language="en_US"
        data-events-max={maxEvents.toString()}
        data-description-length="brief"
      />
    </div>
  );
}

export default function Community() {
  const { toast } = useToast();
  const { formatCurrency, setCurrencyFromUser, formatSymbol } = useCurrency();
  const [showCalendar, setShowCalendar] = useState(false);

  // Check for session cookie and handle API 401 responses
  useEffect(() => {
    console.log('🔍 Dashboard mounted - checking authentication...');
    
    const checkSession = async () => {
      try {
        const response = await fetch('/api/v2/auth/user', {
          method: 'GET',
          credentials: 'include',
        });
        
        console.log('🔍 Auth check response status:', response.status);
        if (response.status === 401) {
          console.log('❌ Session invalid or expired - redirecting to login');
          toast({
            title: "Session Expired",
            description: "Please log in to continue",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (response.ok) {
          const data = await response.json();
          console.log('✅ Session valid for user:', data.email);
          
          if (data.currency) {
            setCurrencyFromUser(data.currency);
          }
        }
      } catch (error) {
        console.error('❌ Error checking session:', error);
      }
    };

    checkSession();
    const intervalId = setInterval(checkSession, 30000);
    return () => clearInterval(intervalId);
  }, [toast, setCurrencyFromUser]);

  return (
    <>
      <Header 
        title="Community Access" 
        description="Your exclusive member benefits" 
      />
      
      <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto bg-gradient-to-br from-pink-50 to-purple-50">
        {/* Welcome Banner */}
        <div className="mb-4 sm:mb-6 lg:mb-8 bg-white rounded-lg sm:rounded-xl lg:rounded-2xl border-2 border-primary p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-primary p-2.5 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md shrink-0">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
            </div>
            <div className="w-full">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-2.5 lg:mb-3">
                Welcome To Your Salon Success Manager Community Access
              </h1>
              <p className="text-gray-700 text-xs sm:text-sm md:text-base leading-relaxed">
                This is so much more than just a membership or software. You're getting accountability, live guidance, bonus trainings 
                that elevate your skills across all different parts of business, and a community of support available around the clock. 
                Everything you need to transform your business lives right here.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6 lg:mb-8">
          {/* Welcome Video Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-100">
            <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
              <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4 mb-3 sm:mb-3.5 lg:mb-4">
                <div className="bg-gradient-to-br from-red-100 to-red-200 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl shrink-0">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600" />
                </div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Welcome Video</h2>
              </div>
              
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-5 lg:mb-6">
                Get started with a personal welcome from Katie and learn how to make the most of your subscription
              </p>

              {/* Video Container */}
              <div className="bg-gray-100 rounded-lg sm:rounded-xl mb-3 sm:mb-4 md:mb-5 lg:mb-6 aspect-video flex items-center justify-center overflow-hidden">
                <iframe 
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/sSH84bmUKXo?si=4FL9VToWPeFzlCG3" 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  referrerPolicy="strict-origin-when-cross-origin" 
                  allowFullScreen
                ></iframe>
              </div>

              <p className="text-xs sm:text-sm text-gray-600">
                Watch this first to understand how to get the most from your Salon Success Manager subscription.
              </p>
            </CardContent>
          </Card>

          {/* Private Facebook Community Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-100">
            <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
              <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4 mb-3 sm:mb-3.5 lg:mb-4">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Private Facebook Community</h2>
              </div>
              
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-2.5 sm:mb-3 lg:mb-4">
                Connect with other salon, clinic, and academy owners who are taking control of their profits
              </p>

              <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-5 lg:mb-6">
                Have a question? Stuck with something? Just drop a message in the group anytime. Our community is here to support you 24/7.
              </p>

              <Button 
                className="w-full bg-primary hover:bg-primary/80 text-white shadow-md text-xs sm:text-sm md:text-base py-2 sm:py-2.5"
                onClick={() => window.open('https://www.facebook.com/groups/salonsuccessmanager/', '_blank')}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                Join the Facebook Group
              </Button>
            </CardContent>
          </Card>

          {/* Monthly Live Calls Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-100">
            <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
              <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4 mb-3 sm:mb-3.5 lg:mb-4">
                <div className="bg-gradient-to-br from-green-100 to-green-200 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl shrink-0">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                </div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Monthly Live Calls with Katie</h2>
              </div>
              
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-2.5 sm:mb-3 lg:mb-4">
                Accountability sessions to keep you on track with your numbers
              </p>

              <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-5 lg:mb-6">
                Join Katie every month on Zoom to review your numbers, get your questions answered, and stay accountable. These calls are the key 
                to actually using what you've learned.
              </p>

              {/* Calendar Embed - Fully responsive */}
              <div className="mb-3 sm:mb-4 md:mb-5 lg:mb-6 bg-white rounded-lg border border-gray-200 p-2 sm:p-3 md:p-4 overflow-hidden">
                <AddEventCalendar 
                  calendarId="1wn2kz0fr713"
                  theme="theme-light"
                  height="400px"
                  includeAtc={true}
                  includeStc={true}
                  maxEvents={20}
                />
              </div>
            </CardContent>
          </Card>

          {/* Training Portal Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-100">
            <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
              <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4 mb-3 sm:mb-3.5 lg:mb-4">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
                </div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Training Portal</h2>
              </div>
              
              <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-2.5 sm:mb-3 lg:mb-4">
                £1,500+ worth of exclusive business training
              </p>

              <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-5 lg:mb-6">
                Access our exclusive video library covering pricing, money mindset, marketing, and growth. Content is drip-fed to stop the overwhelm 
                and help you take action.
              </p>

              <Button 
                className="w-full bg-primary hover:bg-primary/80 text-white shadow-md text-xs sm:text-sm md:text-base py-2 sm:py-2.5"
                onClick={() => window.open('https://katiegodfrey.thrivecart.com/salon-success-manager-portal/', '_blank')}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                Access Training Portal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Need Help Section */}
        <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl border-0">
          <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 lg:p-4 rounded-xl shrink-0">
                <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-blue-500" />
              </div>
              <div className="w-full">
                <h2 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-2.5 lg:mb-3">Need Help?</h2>
                <p className="text-gray-200 text-xs sm:text-sm md:text-base">
                  If you have any questions about accessing these resources or need support, post in the Facebook group or email us at{' '}
                  <a 
                    href="mailto:help@salonsuccessmanager.com" 
                    className="text-blue-400 hover:text-blue-300 underline font-semibold break-all"
                  >
                    help@salonsuccessmanager.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}