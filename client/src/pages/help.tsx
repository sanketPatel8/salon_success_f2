import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageCircle, Book, Video, FileText, Calculator, Clock, Percent, Receipt, Package, TrendingUp, DollarSign, Crown } from "lucide-react";
import Header from "@/components/header";
import { useState } from "react";

export default function Help() {
  const [activeTab, setActiveTab] = useState("getting-started");

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title="Help & Support" 
        description="Get help with your Salon Success Manager and contact our support team"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="features">Features Guide</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact Support</TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Quick Start Video
                </CardTitle>
                <CardDescription>
                  Watch a 5-minute overview of your Salon Success Manager
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Video className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Tutorial video coming soon</p>
                  </div>
                </div>
                <Button className="w-full">Watch Tutorial</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  Step-by-Step Guide
                </CardTitle>
                <CardDescription>
                  Follow our comprehensive setup guide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">1</Badge>
                  <span className="text-sm">Set up your business profile</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">2</Badge>
                  <span className="text-sm">Calculate your hourly rate</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">3</Badge>
                  <span className="text-sm">Track expenses and revenue</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">4</Badge>
                  <span className="text-sm">Review your CEO numbers</span>
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab("features")}>View Full Guide</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Hourly Rate Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Calculate your optimal hourly rate based on:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Business expenses</li>
                  <li>Desired salary</li>
                  <li>Working hours</li>
                  <li>Profit margins</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Percent className="h-4 w-4" />
                  Profit Margin Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Analyse profitability of services:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Service costs vs. pricing</li>
                  <li>Profit margin analysis</li>
                  <li>Pricing recommendations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Receipt className="h-4 w-4" />
                  Expense Tracker
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Monitor business expenses:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Track all business costs</li>
                  <li>Categorise expenses</li>
                  <li>Monthly summaries</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4" />
                  Stock Budget Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Plan your stock purchases:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Budget allocation</li>
                  <li>Inventory planning</li>
                  <li>Cost management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  CEO Numbers
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Key business metrics:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Revenue tracking</li>
                  <li>Profit analysis</li>
                  <li>Growth indicators</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  Reports & Export
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Generate professional reports:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>PDF reports</li>
                  <li>CSV exports</li>
                  <li>Email sharing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">How do I calculate my ideal hourly rate?</h4>
                  <p className="text-sm text-slate-600">Use the Hourly Rate Calculator to input your business expenses, desired salary, and working hours. It will generate a recommended hourly rate that ensures profitability and covers all your outgoings. Once you know your hourly rate, you can make sure all your treatments and services are priced correctly.</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">This is the number one mistake we see in beauty businesses, pricing that doesn't reflect the true cost of running the business.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">How do I use the Profit Margin Calculator?</h4>
                  <p className="text-sm text-slate-600">With the Profit Margin Calculator, you can input your treatments or training courses, their prices, and the time it takes to deliver each service. The calculator will then show you exactly how much profit you're making, or if you're actually making a loss. Plus the profit percentage of each service.</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">This is a crucial step in understanding whether your services are priced correctly and sustainably.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">How to Use the Expense Tracker</h4>
                  <p className="text-sm text-slate-600">This tool makes it easy to track your monthly business spending. It helps you clearly see where your money is going, so you can understand your outgoings, stay in control of your finances, and feed accurate figures into the Hourly Rate Calculator.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">What is the Stock Budget Calculator?</h4>
                  <p className="text-sm text-slate-600">One of the most common issues we see is business owners not knowing how much to budget for stock each month. Many simply purchase as and when needed, or store excess stock in treatment rooms and retail shelves, without realising that's their money just sitting there.</p>
                  <p className="text-sm text-slate-600 mt-2">Another challenge arises when handing over stock management to team members, often, they don't know how much they're allowed to spend, which leads to over- or under-ordering.</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">The Stock Budget Calculator helps you track your average monthly stock spend so you can set clear budgets and keep better control of your cash flow.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">What is the Revenue Projections Tool?</h4>
                  <p className="text-sm text-slate-600">This tool is perfect for helping you understand how many treatments or services you need to offer to reach your income goals.</p>
                  <p className="text-sm text-slate-600 mt-2">One of the most common questions we get is: "How can I make more money?"</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">Whether you want to boost your revenue by a specific amount or set new targets, this tool shows you exactly which treatments to focus on and how many clients you need to hit those goals. It takes the guesswork out of planning and helps you make smarter business decisions.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">What is CEO Numbers?</h4>
                  <p className="text-sm text-slate-600">CEO Numbers is Katie Godfrey's proven formula that has helped thousands of business owners take control of their finances and finally understand their numbers.</p>
                  <p className="text-sm text-slate-600 mt-2">One of the biggest problems in the industry is that 95% of business owners don't know their key figures, including how much they actually turn over.</p>
                  <p className="text-sm text-slate-600 mt-2">This tool allows you to input what you make each week and track it clearly, so you can understand your income and make informed decisions. Even better, it guides you on exactly how much money to set aside each week into separate accounts or "money pots", helping you manage your finances with clarity and confidence.</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">You can customise the pots and amounts based on what your business needs most, whether it's tax, wages, stock, savings, or growth.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">What are Money Pots?</h4>
                  <p className="text-sm text-slate-600">Money Pots are a simple but powerful way to manage your business finances by dividing your income into separate accounts or "pots" for specific purposes.</p>
                  <p className="text-sm text-slate-600 mt-2">You can create your own Money Pots based on what your business needs. For example, if you're VAT registered, a VAT Pot is essential to make sure you're never caught short. I also always recommend setting up a Profit Pot, so you're consistently putting money aside for growth or rewards.</p>
                  <p className="text-sm text-slate-600 mt-2">You decide how many pots you want and what percentage of your income goes into each one.</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium">Each week, when you complete your CEO Numbers, you'll log into your bank and transfer money from your current account into each of your pots, keeping everything organised and giving you full control over your cash flow.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Can I track multiple businesses?</h4>
                  <p className="text-sm text-slate-600">Yes, the system supports multiple business tracking. You can switch between different businesses in your CEO Numbers dashboard.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">How do I export my reports?</h4>
                  <p className="text-sm text-slate-600">Go to Reports & Export, select your date range and report type, then choose from PDF, CSV, print, or email options.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">What's included in the Pro subscription?</h4>
                  <p className="text-sm text-slate-600">Pro subscription (£23.97/month) includes unlimited access to all calculators, advanced reporting, export features, and priority support.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Can I cancel my subscription anytime?</h4>
                  <p className="text-sm text-slate-600">Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
                <CardDescription>
                  Need help? Our support team is here to assist you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-slate-600">help@salonsuccessmanager.com</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
                <CardDescription>
                  Expected response times for support requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Email Support</span>
                  <Badge variant="outline">24-48 hours</Badge>
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => window.open('mailto:help@salonsuccessmanager.com?subject=Salon Success Manager Support Request', '_blank')}
                  >
                    Send Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}