import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-slate-600">Last updated: June 2025</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Introduction</h2>
            <p className="text-slate-700 leading-relaxed">
              At Salon Success Manager by Katie Godfrey, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our business management platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-800">Personal Information</h3>
              <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
                <li>Name and contact details (email address)</li>
                <li>Business information (business name, type, location)</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Account preferences and settings</li>
              </ul>
              
              <h3 className="text-lg font-medium text-slate-800 mt-6">Business Data</h3>
              <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
                <li>Financial calculations and projections</li>
                <li>Treatment and service pricing information</li>
                <li>Business expenses and income records</li>
                <li>Stock purchase data and budgets</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Provide and maintain our business management tools</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send important account and service updates</li>
              <li>Provide customer support and respond to enquiries</li>
              <li>Improve our platform and develop new features</li>
              <li>Comply with legal obligations and protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Security</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your personal and business data:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Secure SSL encryption for all data transmission</li>
              <li>Regular security audits and monitoring</li>
              <li>Restricted access to personal information</li>
              <li>Secure payment processing through Stripe</li>
              <li>Regular data backups and recovery procedures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Sharing</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share limited information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>With payment processors (Stripe) to handle transactions</li>
              <li>With email service providers for essential communications</li>
              <li>When required by law or to protect our legal rights</li>
              <li>With your explicit consent for specific purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Your Rights</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Under UK data protection laws, you have the following rights:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Access your personal data and understand how it's used</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your personal data</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Cookies and Tracking</h2>
            <p className="text-slate-700 leading-relaxed">
              We use essential cookies to ensure our platform functions properly and to maintain your login session. We do not use tracking cookies for advertising purposes. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Retention</h2>
            <p className="text-slate-700 leading-relaxed">
              We retain your personal data only as long as necessary to provide our services and comply with legal obligations. Business data calculations and records are kept for as long as your account remains active, plus a reasonable period thereafter for backup and legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">International Data Transfers</h2>
            <p className="text-slate-700 leading-relaxed">
              Your data is primarily stored and processed within the UK and EU. Any international transfers are conducted with appropriate safeguards in accordance with UK data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Changes to This Policy</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy periodically to reflect changes in our practices or applicable laws. We will notify you of any material changes via email or through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Us</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or wish to exercise your data protection rights, please contact us:
            </p>
            <div className="bg-slate-50 p-6 rounded-lg">
              <p className="text-slate-700 mb-2"><strong>Katie Godfrey Business Mentor</strong></p>
              <p className="text-slate-700 mb-2">Email: <a href="mailto:info@kgbusinessmentor.com" className="text-primary hover:underline">info@kgbusinessmentor.com</a></p>
              <p className="text-slate-700">Website: <a href="https://kgbusinessmentor.com/" className="text-primary hover:underline">kgbusinessmentor.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}