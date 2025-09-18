import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy - Vidality Trading Platform',
  description: 'Cookie Policy for Vidality trading platform. Learn how we use cookies and similar technologies.',
}

export default function CookiesPage() {
  const effectiveDate = "August 31, 2025";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 px-6 py-12">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-2xl p-8 md:p-12">
        <header>
          <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
          <p className="text-sm text-gray-600 mb-6">
            Effective date: {effectiveDate}
          </p>
        </header>

        <section className="mb-6">
          <p>
            VIDALITY PTY LTD uses cookies and similar tracking technologies on the Vidality platform (the "Service") to enhance user experience, analyze usage, secure the platform, and provide personalized features. This Cookie Policy explains what cookies are used, why, and how you can manage them.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, enable core functionality, and collect analytic data.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">2. Types of Cookies We Use</h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>Strictly Necessary Cookies</strong>: Essential for basic functionality—e.g., login, security measures, session persistence. Cannot be disabled.
            </li>
            <li>
              <strong>Performance & Analytics Cookies</strong>: Anonymous cookies that help us understand how users interact with our Service and improve performance.
            </li>
            <li>
              <strong>Functional Cookies</strong>: Remember user preferences such as language selections, display settings, or cookie-consent status.
            </li>
            <li>
              <strong>Advertising & Tracking Cookies</strong>: Used to deliver targeted content or ads, and to measure campaign effectiveness. These may be provided by third parties.
            </li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">3. How We Use Cookies</h2>
          <ul className="list-disc pl-6">
            <li>To recognize you as a logged-in user and maintain your session.</li>
            <li>To collect usage statistics and improve user experience.</li>
            <li>To store your preferences and settings.</li>
            <li>To enable secure operations and detect fraud.</li>
            <li>To provide personalized content and measure advertising campaigns, if applicable.</li>
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">
            4. Third-Party Cookies
          </h2>
          <p>
            We may allow third-party providers (e.g., analytics, marketing, cloud services) to set cookies through our Service. These cookies are subject to their own privacy policies, and we are not responsible for their practices.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">5. Your Choices</h2>
          <p>
            You can manage or disable cookies via your browser settings (e.g., Chrome, Firefox, Safari).  
            Note that blocking certain types of cookies (especially necessary or functional cookies) may impact the performance or functionality of the Service.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">6. Cookie Consent & Preference Center</h2>
          <p>
            We recommend implementing a consent banner or preference center to obtain user consent for non-essential cookies in jurisdictions requiring it (e.g., GDPR in the EU, CCPA in California). The preference center should allow users to toggle opt-in/opt-out for performance, functional, or targeting cookies at any time.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">7. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy periodically. We will post any changes here along with a new effective date. Substantial changes may be communicated via banner or email.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">8. Contact Us</h2>
          <p>
            For questions or concerns regarding our cookie use, contact us at:  
            <a href="mailto:amar@vidality.com" className="text-blue-600 underline">amar@vidality.com</a> or  
            <a href="mailto:contact.support.vidality@gmail.com" className="text-blue-600 underline">contact.support.vidality@gmail.com</a>
          </p>
        </section>

        <footer className="text-sm text-gray-500">
          © 2025 VIDALITY PTY LTD. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
