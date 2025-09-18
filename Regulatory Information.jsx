import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function RegulatoryInformation() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Regulatory Information</h1>
      <p className="text-center text-gray-600">
        This section outlines the regulatory framework, compliance obligations, and disclosures
        applicable to our services. Please review carefully to understand the standards under which
        we operate.
      </p>

      <Card className="shadow-lg rounded-2xl">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-xl font-semibold">1. Regulatory Oversight</h2>
          <p>
            Our platform complies with financial regulations applicable in the jurisdictions where we
            operate. We work with licensed and regulated partners, brokers, and data providers to
            ensure compliance with governing laws and industry standards.
          </p>

          <Separator />

          <h2 className="text-xl font-semibold">2. Licensing & Authorization</h2>
          <p>
            We are committed to partnering with entities holding valid regulatory approvals (e.g.,
            SEBI in India, SEC in the U.S., FCA in the U.K.) depending on the region of operation.
            However, we are not a broker, custodian, or financial institution. All transactions are
            executed through regulated third parties.
          </p>

          <Separator />

          <h2 className="text-xl font-semibold">3. Risk Disclosures</h2>
          <p>
            Trading in financial markets carries significant risks, including the potential loss of
            invested capital. Past performance is not indicative of future results. Users are
            strongly advised to consult independent financial advisors before engaging in trading or
            investment activities.
          </p>

          <Separator />

          <h2 className="text-xl font-semibold">4. Data Compliance</h2>
          <p>
            We adhere to applicable data protection laws, including the GDPR (European Union) and
            other regional privacy frameworks. All user data is processed in accordance with our
            <a href="/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>.
          </p>

          <Separator />

          <h2 className="text-xl font-semibold">5. Jurisdictional Limitations</h2>
          <p>
            Certain products and services may not be available in all jurisdictions due to local
            regulatory restrictions. It is the responsibility of each user to ensure compliance with
            the laws applicable in their respective location before using our services.
          </p>

          <Separator />

          <h2 className="text-xl font-semibold">6. Updates & Amendments</h2>
          <p>
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
  );
}
