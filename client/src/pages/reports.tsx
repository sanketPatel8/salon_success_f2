import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { formatPercentage } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { FileText, Download, Mail, TrendingUp, DollarSign, Percent, Clock } from "lucide-react";
import jsPDF from 'jspdf';
import Paywall from "@/components/paywall";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { Treatment, Expense, HourlyRateCalculation } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [isEmailPending, setIsEmailPending] = useState(false);

  // Check for session cookie and handle API 401 responses
    useEffect(() => {
      console.log('🔍 Dashboard mounted - checking authentication...');
      
      const checkSession = async () => {
        try {
          // Make an API call to verify session is valid
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
            
            // Wait 2 seconds before redirecting so toast is visible
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
            
          } else if (response.ok) {
            const data = await response.json();
            console.log('✅ Session valid for user:', data.email);
          }
        } catch (error) {
          console.error('❌ Error checking session:', error);
        }
      };
  
      // Check immediately on mount
      checkSession();
      
      // Set up periodic check every 30 seconds
      const intervalId = setInterval(checkSession, 30000);
      
      return () => clearInterval(intervalId);
    }, [toast]);

  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics"],
  });

  const { data: treatments = [], isLoading: treatmentsLoading } = useQuery<Treatment[]>({
    queryKey: ["/api/treatments"],
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: hourlyCalculations = [], isLoading: calculationsLoading } = useQuery<HourlyRateCalculation[]>({
    queryKey: ["/api/hourly-rate-calculations"],
  });

  const isLoading = metricsLoading || treatmentsLoading || expensesLoading || calculationsLoading;

  // Calculate derived values for exports
  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
  const avgTreatmentPrice = treatments.length > 0 
    ? treatments.reduce((sum, t) => sum + parseFloat(t.price.toString()), 0) / treatments.length 
    : 0;

  const handleExportCSV = () => {
    const reportData = [
      ['Metric', 'Value'],
      ['Current Hourly Rate', formatCurrency(metrics?.hourlyRate || 0)],
      ['Average Profit Margin', formatPercentage(metrics?.avgProfitMargin || 0)],
      ['Monthly Revenue', formatCurrency(metrics?.monthlyRevenue || 0)],
      ['Active Treatments', (metrics?.activeTreatments || 0).toString()],
      ['Total Expenses', formatCurrency(totalExpenses)],
      ['Average Treatment Price', formatCurrency(avgTreatmentPrice)],
      [''],
      ['Treatment Breakdown', ''],
      ['Name', 'Price', 'Duration (min)', 'Profit Margin'],
      ...treatments.map(t => [
        t.name,
        formatCurrency(t.price),
        t.duration.toString(),
        t.profitMargin
      ]),
      [''],
      ['Recent Expenses', ''],
      ['Category', 'Amount', 'Date', 'Description'],
      ...expenses.slice(0, 10).map(e => [
        e.category,
        formatCurrency(e.amount),
        new Date(e.date).toLocaleDateString(),
        e.description || ''
      ])
    ];

    const csvContent = reportData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `business-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Business Performance Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 25;
    
    // Key Metrics Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Metrics', 15, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Check if metrics exists and has properties
    if (metrics && typeof metrics === 'object') {
      const metricsData = [
        `Hourly Rate: ${formatCurrency(metrics.hourlyRate || 0)}`,
        `Avg Profit Margin: ${formatPercentage(metrics.avgProfitMargin || 0)}`,
        `Monthly Revenue: ${formatCurrency(metrics.monthlyRevenue || 0)}`,
        `Active Treatments: ${metrics.activeTreatments || 0}`
      ];
      
      metricsData.forEach(metric => {
        doc.text(metric, 15, yPosition);
        yPosition += 10;
      });
    }
    
    yPosition += 15;
    
    // Treatments Section
    if (treatments && treatments.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Treatment Performance', 15, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      treatments.forEach(treatment => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(`${treatment.name} - ${formatCurrency(treatment.price)} (${treatment.duration} min) - ${treatment.profitMargin}%`, 15, yPosition);
        yPosition += 10;
      });
    }
    
    yPosition += 15;
    
    // Recent Expenses Section
    if (expenses && expenses.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Recent Expenses', 15, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      expenses.slice(0, 10).forEach(expense => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        const expenseDate = new Date(expense.date).toLocaleDateString();
        doc.text(`${expense.category} - ${formatCurrency(expense.amount)} - ${expenseDate} - ${expense.description || 'N/A'}`, 15, yPosition);
        yPosition += 10;
      });
    }
    
    // Save the PDF
    doc.save(`business-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };



  const handleEmailReport = async () => {
    try {
      setIsEmailPending(true);
      
      const response = await fetch('/api/email-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.fallback && data.emailData) {
          // Use mailto fallback
          const subject = encodeURIComponent(data.emailData.subject);
          const body = encodeURIComponent(data.emailData.body);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
        } else {
          toast({
            title: "Report Sent",
            description: "Your business report has been sent to your email address.",
          });
        }
      } else {
        toast({
          title: "Email Failed",
          description: data.message || "Failed to send email report. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while sending the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEmailPending(false);
    }
  };

  // Calculate additional metrics
  const highestMarginTreatment = treatments?.length ? treatments.reduce((max, treatment) => 
    parseFloat(treatment.profitMargin) > parseFloat(max?.profitMargin || "0") ? treatment : max
  ) : null;
  const lowestMarginTreatment = treatments?.length ? treatments.reduce((min, treatment) => 
    parseFloat(treatment.profitMargin) < parseFloat(min?.profitMargin || "100") ? treatment : min
  ) : null;

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <>
        <Header 
          title="Business Reports & Analytics" 
          description="Generate comprehensive business reports and insights" 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </>
    );
  }

  // Check subscription status
  // if (!subscriptionStatus?.active) {
  //   return (
  //     <>
  //       <Header 
  //         title="Business Reports & Analytics" 
  //         description="Generate comprehensive business reports and insights" 
  //       />
  //       <Paywall 
  //         title="Business Reports & Analytics"
  //         description="Access detailed financial reports and insights"
  //         feature="business analytics and reporting"
  //       />
  //     </>
  //   );
  // }

  return (
    <>
      <Header 
        title="Reports & Export" 
        description="View business insights and export your data for external use" 
      />
      
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Export Actions */}
        <Card className="border border-slate-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Export Options</h3>
                <p className="text-slate-600 text-sm mt-1">Download or share your business reports</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="text-primary h-5 w-5" />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button onClick={handleExportPDF} className="bg-primary text-white hover-bg-[#FFB6C1]">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={handleEmailReport} 
                disabled={isEmailPending}
                variant="outline"
                className="disabled:opacity-50"
              >
                <Mail className="h-4 w-4 mr-2" />
                {isEmailPending ? 'Sending...' : 'Email Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Current Hourly Rate</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {isLoading ? "..." : formatCurrency(metrics?.hourlyRate || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Avg Profit Margin</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {isLoading ? "..." : `${metrics?.avgProfitMargin || 0}%`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Percent className="text-success h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {isLoading ? "..." : formatCurrency(metrics?.monthlyRevenue || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-warning h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {isLoading ? "..." : formatCurrency(totalExpenses)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-red-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Treatment Analysis */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Treatment Analysis</h3>
              
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading treatment data...</div>
              ) : treatments?.length ? (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3">Treatment Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Total Treatments:</span>
                        <p className="font-bold text-slate-800">{treatments.length}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Average Price:</span>
                        <p className="font-bold text-slate-800">{formatCurrency(avgTreatmentPrice)}</p>
                      </div>
                    </div>
                  </div>

                  {highestMarginTreatment && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-700 mb-2">Highest Margin Treatment</h4>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-green-800">{highestMarginTreatment.name}</p>
                          <p className="text-sm text-green-600">{formatCurrency(highestMarginTreatment.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-700">{formatPercentage(highestMarginTreatment.profitMargin)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {lowestMarginTreatment && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h4 className="font-semibold text-red-700 mb-2">Lowest Margin Treatment</h4>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-red-800">{lowestMarginTreatment.name}</p>
                          <p className="text-sm text-red-600">{formatCurrency(lowestMarginTreatment.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-700">{formatPercentage(lowestMarginTreatment.profitMargin)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-3">All Treatments</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {treatments
                        .sort((a, b) => parseFloat(b.profitMargin) - parseFloat(a.profitMargin))
                        .map((treatment) => (
                        <div key={treatment.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="font-medium text-slate-800">{treatment.name}</span>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(treatment.price)}</p>
                            <p className="text-sm text-success">{formatPercentage(treatment.profitMargin)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No treatments found. Add treatments to see analysis.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Financial Overview</h3>
              
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading financial data...</div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3">Revenue Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Projected Monthly Revenue:</span>
                        <span className="font-semibold">{formatCurrency(metrics?.monthlyRevenue || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Monthly Expenses:</span>
                        <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="font-medium text-slate-800">Net Profit (Est.):</span>
                        <span className="font-bold text-success">
                          {formatCurrency((parseFloat(metrics?.monthlyRevenue || "0") - totalExpenses))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {hourlyCalculations?.length ? (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-primary mb-3">Rate History</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {hourlyCalculations.slice(0, 5).map((calc) => (
                          <div key={calc.id} className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">
                              {new Date(calc.createdAt).toLocaleDateString()}
                            </span>
                            <span className="font-semibold text-primary">
                              {formatCurrency(calc.calculatedRate)}/hr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-600 mb-3">Business Recommendations</h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li>• Focus on high-margin treatments to maximise profit</li>
                      <li>• Review pricing for treatments below 50% margin</li>
                      <li>• Track monthly trends to identify peak seasons</li>
                      <li>• Consider package deals to increase average transaction</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
