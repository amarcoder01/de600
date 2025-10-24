import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: 'Regulatory Information - Vidality Trading Platform',
  description: 'Regulatory information and compliance details for Vidality trading platform.',
}

export default function RegulatoryPage() {
  return (
    <main className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="mb-2 flex items-center">
          <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white hover:bg-gray-50 text-gray-700">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-center text-gray-900">Regulatory Framework</h1>
        <p className="text-center text-gray-700">
          This section outlines the regulatory framework, compliance obligations, and disclosures
          applicable to our services. Please review carefully to understand the standards under which
          we operate.
        </p>

        <Card className="shadow-lg rounded-2xl bg-white border border-gray-200">
          <CardContent className="space-y-4 p-6 text-gray-900">
            <h2 className="text-xl font-semibold text-gray-900">1. Regulatory Oversight</h2>
            <p className="text-gray-700">
              Our platform complies with financial regulations applicable in the jurisdictions where we
              operate. We work with licensed and regulated partners, brokers, and data providers to
              ensure compliance with governing laws and industry standards.
            </p>

            <Separator />

            <h2 className="text-xl font-semibold text-gray-900">2. Licensing & Authorization</h2>
            <p className="text-gray-700">
              We are committed to partnering with entities holding valid regulatory approvals (e.g.,
              SEBI in India, SEC in the U.S., FCA in the U.K.) depending on the region of operation.
              However, we are not a broker, custodian, or financial institution. All transactions are
              executed through regulated third parties.
            </p>

            <Separator />

            <h2 className="text-xl font-semibold text-gray-900">3. Risk Disclosures</h2>
            <p className="text-gray-700">
              Trading in financial markets carries significant risks, including the potential loss of
              invested capital. Past performance is not indicative of future results. Users are
              strongly advised to consult independent financial advisors before engaging in trading or
              investment activities.
            </p>

            <Separator />

            <h2 className="text-xl font-semibold text-gray-900">4. Data Compliance</h2>
            <p className="text-gray-700">
              We adhere to applicable data protection laws, including the GDPR (European Union) and
              other regional privacy frameworks. All user data is processed in accordance with our
              <a href="/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>.
            </p>

            <Separator />

            <h2 className="text-xl font-semibold text-gray-900">5. Jurisdictional Limitations</h2>
            <p className="text-gray-700">
              Certain products and services may not be available in all jurisdictions due to local
              regulatory restrictions. It is the responsibility of each user to ensure compliance with
              the laws applicable in their respective location before using our services.
            </p>

            <Separator />

            <h2 className="text-xl font-semibold text-gray-900">6. Updates & Amendments</h2>
            <p className="text-gray-700">
              This Regulatory Information may be updated periodically to reflect changes in applicable
              laws, regulatory requirements, or company practices. Continued use of our services
              constitutes acceptance of such updates.
            </p>
          </CardContent>
        </Card>

        <p className="text-sm text-gray-500 text-center">
          Last Updated: {new Date().toLocaleDateString()}
        </p>
        
      </div>
    </main>
  );
}
