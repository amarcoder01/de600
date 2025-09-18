import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Disclaimer - Vidality Trading Platform',
  description: 'Disclaimer for Vidality trading platform. Important legal disclaimers and risk disclosures.',
}

export default function DisclaimerPage() {
  const effectiveDate = "August 31, 2025";

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-md p-8 md:p-12">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Disclaimer
          </h1>
          <p className="text-sm text-gray-500">
            Effective date: {effectiveDate}
          </p>
        </header>

        {/* Content */}
        <div className="space-y-8">
          
          {/* General Information */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              General Information
            </h2>
            <p className="text-gray-700 leading-relaxed">
              The information provided on Vidality's website and platform is
              provided for general informational and educational purposes only.
              Every effort is made to keep content accurate and up to date;
              however, no representation or warranty is made regarding the
              completeness, accuracy, timeliness, suitability, or fitness of
              the information for any specific purpose.
            </p>
          </section>

          {/* No Professional Advice */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              No Professional Advice
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Content, tools, simulations, and AI-generated outputs on Vidality
              are not professional advice. Nothing on the platform constitutes
              financial, investment, legal, tax, medical, or other professional
              advice. Users should consult qualified professionals before
              relying on platform information for decisions that have legal,
              financial, or other significant consequences.
            </p>
          </section>

          {/* Paper Trading & AI Outputs */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Paper Trading & AI Outputs
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Vidality provides simulated (paper) trading environments and AI
              insights for research and learning. Simulated performance,
              hypothetical returns, and automated signals do not reflect actual
              trading outcomes. Results displayed on the platform are not
              guarantees of future performance in live markets.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Limitation of Liability
            </h2>
            <p className="text-gray-700 leading-relaxed">
              To the fullest extent permitted by applicable law, Vidality and
              its officers, employees, agents, and partners will not be liable
              for any direct, indirect, incidental, special, consequential, or
              punitive damages, or any loss of profits or revenues, whether
              incurred directly or indirectly, arising from:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1 text-gray-700">
              <li>Use of, or inability to use, the platform</li>
              <li>Reliance on any information or content provided</li>
              <li>Unauthorized access to or alteration of your transmissions or data</li>
            </ul>
          </section>

          {/* External Links & Third-Party Content */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              External Links & Third-Party Content
            </h2>
            <p className="text-gray-700 leading-relaxed">
              The platform may contain links to third-party sites and services.
              Those links are provided for convenience only. Vidality does not
              endorse, control, or accept responsibility for the content,
              privacy practices, or terms of such third-party sites. Users are
              encouraged to review the policies of any third-party provider
              before interacting with their services.
            </p>
          </section>

          {/* Use at Your Own Risk */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Use at Your Own Risk
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Accessing and using Vidality is at the user's own risk. While
              Vidality strives to operate secure and reliable services, no
              guarantee can be made that the platform will be uninterrupted,
              error-free, or immune to security incidents. Users should adopt
              sensible security practices and verify important information
              independently.
            </p>
          </section>

          {/* Updates to This Disclaimer */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Updates to This Disclaimer
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Vidality reserves the right to update or amend this Disclaimer at
              any time. Material changes will be posted on this page with a
              revised effective date. Continued use of the platform after such
              changes constitutes acceptance of the updated Disclaimer.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Contact
            </h2>
            <p className="text-gray-700 mb-4">
              For any questions regarding this Disclaimer or related matters,
              contact:
            </p>
            <div className="space-y-2">
              <div>
                <span className="text-gray-700 mr-2">Email:</span>
                <a
                  href="mailto:amar@vidality.com"
                  className="text-gray-900 hover:underline font-medium"
                >
                  amar@vidality.com
                </a>
              </div>
              <div>
                <span className="text-gray-700 mr-2">Support:</span>
                <a
                  href="mailto:contact.support.vidality@gmail.com"
                  className="text-gray-900 hover:underline font-medium"
                >
                  contact.support.vidality@gmail.com
                </a>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            © 2025 Vidality Pty Ltd. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
