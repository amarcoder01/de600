import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compliance - Vidality Trading Platform',
  description: 'Compliance information and regulatory standards for Vidality trading platform.',
}

export default function CompliancePage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-6 text-gray-900">Compliance</h1>

        <p className="text-gray-700 mb-6">
          At <span className="font-semibold">Vidality Trading Platform</span>, we are committed to maintaining the
          highest standards of legal, ethical, and regulatory compliance across
          all aspects of our business. Our compliance framework is designed to
          safeguard our users, ensure transparency, and meet industry-recognized
          standards at both national and international levels.
        </p>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              1. Regulatory Oversight
            </h2>
            <p className="text-gray-700">
              We operate in alignment with applicable financial regulations and
              industry standards. Our platform undergoes regular internal and
              third-party reviews to ensure that our operations comply with
              governing laws, including (but not limited to) financial market
              regulations, consumer protection laws, and applicable data
              protection acts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              2. Data Protection & Privacy
            </h2>
            <p className="text-gray-700">
              Compliance with data privacy laws is central to our operations. We
              adhere to global frameworks such as the{" "}
              <span className="font-medium">General Data Protection Regulation (GDPR)</span> and the{" "}
              <span className="font-medium">California Consumer Privacy Act (CCPA)</span>, ensuring
              that user information is collected, processed, and stored lawfully,
              transparently, and securely. Our practices are designed to give
              users control over their data while maintaining confidentiality and
              integrity at all times.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              3. Anti-Money Laundering (AML) & Know Your Customer (KYC)
            </h2>
            <p className="text-gray-700">
              We maintain strict AML and KYC procedures to prevent fraudulent,
              illegal, or unauthorized activity on our platform. These safeguards
              include user verification, ongoing monitoring of activity, and
              compliance with international financial crime prevention standards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              4. Fair Practices & Transparency
            </h2>
            <p className="text-gray-700">
              Vidality Trading Platform is committed to fair dealing, transparent
              communication, and the responsible use of technology. We ensure that
              our services are delivered ethically and in accordance with both
              contractual obligations and industry norms. Users are provided with
              clear and accurate disclosures regarding features, fees, and risks
              associated with using our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              5. Monitoring & Continuous Improvement
            </h2>
            <p className="text-gray-700">
              Our compliance framework is dynamic and continuously updated to
              reflect evolving regulations, technological advancements, and
              industry best practices. We regularly conduct audits, staff
              training, and compliance reviews to strengthen our governance
              structure and uphold user trust.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-800">
              6. Reporting Concerns
            </h2>
            <p className="text-gray-700">
              If you suspect any violation of our compliance obligations or become
              aware of suspicious activity, you are encouraged to contact our
              Compliance Team immediately at{" "}
              <a
                href="mailto:compliance@vidalitytrading.com"
                className="text-blue-600 underline"
              >
                compliance@vidalitytrading.com
              </a>
              . All reports are treated seriously and handled in strict
              confidence.
            </p>
          </section>
        </div>

        <p className="mt-8 text-gray-600 italic">
          Note: Compliance obligations may vary depending on your jurisdiction.
          Users are responsible for ensuring their activities on the platform are
          lawful under applicable local regulations.
        </p>
      </div>
    </main>
  );
}
