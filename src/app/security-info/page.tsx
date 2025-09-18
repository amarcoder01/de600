import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security Information - Vidality Trading Platform',
  description: 'Security measures and information protection details for Vidality trading platform.',
}

export default function SecurityInfoPage() {
  const effectiveDate = "August 31, 2025";

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="mx-auto max-w-4xl">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Security Information
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Comprehensive security measures and protection details
            </p>
            <p className="text-sm text-gray-500">
              Last updated: {effectiveDate}
            </p>
          </header>

          {/* Overview Section */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Vidality Pty Ltd (the "Platform") treats information security as a core business priority. 
              This document describes the principal technical, physical, and organizational measures we 
              maintain to protect the confidentiality, integrity, and availability of platform systems and user data.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 italic">
                <strong>Note:</strong> Security is an evolving discipline — while we employ industry-best controls, 
                no system can be guaranteed 100% secure.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="space-y-8">
          {/* Governance & Risk Management */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              Governance & Risk Management
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Security governance at Vidality is overseen by senior leadership and our appointed Security Officer. 
              We maintain documented policies and procedures covering information security, data protection, 
              incident response, vendor risk, and business continuity. Risk assessments are performed regularly 
              to identify, evaluate and remediate security risks.
            </p>
          </div>

          {/* Technical Controls */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-green-600 font-bold">2</span>
              </div>
              Technical Controls
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">🔐 Encryption</h3>
                  <p className="text-sm text-gray-700">
                    Data in transit is protected using TLS 1.2+ (HTTPS). Sensitive data at rest is encrypted 
                    using AES-256 or equivalent standards where applicable.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">🔑 Access Control</h3>
                  <p className="text-sm text-gray-700">
                    Role-based access control (RBAC), the principle of least privilege, and just-in-time 
                    access are enforced for systems and administrative functions.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">🔒 Authentication</h3>
                  <p className="text-sm text-gray-700">
                    Strong authentication is required for accounts. We support multi-factor authentication 
                    (MFA) for privileged access and encourage MFA for all users.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">📊 Logging & Monitoring</h3>
                  <p className="text-sm text-gray-700">
                    Comprehensive logging, centralized log aggregation, and real-time monitoring are in place 
                    to detect anomalous behavior and support forensic investigations.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">🛡️ Network Security</h3>
                  <p className="text-sm text-gray-700">
                    Firewalls, network segmentation, intrusion detection/prevention systems (IDS/IPS), 
                    and secure VPC configurations are used to reduce attack surface.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">💻 Secure Development</h3>
                  <p className="text-sm text-gray-700">
                    Secure coding standards, dependency management, static analysis, and code reviews 
                    are integrated into the development lifecycle.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Security */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              Operational Security
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">🔍 Vulnerability Management</h3>
                  <p className="text-sm text-gray-700">
                    Regular vulnerability scanning, prioritized patching, and remediation workflows are 
                    maintained for infrastructure and application components.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">🧪 Penetration Testing</h3>
                  <p className="text-sm text-gray-700">
                    Periodic third-party penetration tests and internal red-team exercises are performed 
                    to validate controls and uncover weaknesses.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">💾 Backups & Recovery</h3>
                  <p className="text-sm text-gray-700">
                    Automated backups are maintained with tested restore procedures and secure offsite storage. 
                    Business continuity and disaster recovery plans are reviewed and tested periodically.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">⚙️ Change Management</h3>
                  <p className="text-sm text-gray-700">
                    Changes to production systems follow formal change control with testing, approval, 
                    and rollback procedures.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Protection & Privacy */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-indigo-600 font-bold">4</span>
              </div>
              Data Protection & Privacy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We design systems with privacy in mind. Personal data handling follows our Privacy Policy 
              and applicable legal requirements (including GDPR/CCPA/Applicable Privacy Laws). Data minimization, 
              pseudonymization where appropriate, and strict retention schedules are adopted.
            </p>
          </div>

          {/* Third-Party & Supply Chain Risk */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-orange-600 font-bold">5</span>
              </div>
              Third-Party & Supply Chain Risk
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Third-party services (cloud providers, analytics, market-data APIs, payment processors) are 
              assessed for security posture before engagement. Data processing agreements, least-privilege 
              access, and regular vendor reviews ensure supply chain risks are identified and managed.
            </p>
          </div>

          {/* Personnel Security & Training */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-teal-600 font-bold">6</span>
              </div>
              Personnel Security & Training
            </h2>
            <p className="text-gray-700 leading-relaxed">
              All employees and contractors undergo background checks and role-appropriate security training. 
              Regular awareness programs, phishing simulations, and technical training are provided to maintain 
              a security-aware culture.
            </p>
          </div>

          {/* Incident Response & Notification */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-red-600 font-bold">7</span>
              </div>
              Incident Response & Notification
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Vidality maintains a documented incident response plan detailing detection, containment, 
              eradication, recovery, and post-incident review. In the event of a data breach or security 
              incident that materially affects user data or service availability, we will notify affected 
              users and relevant authorities in accordance with applicable laws and contractual obligations.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-3">
                <strong>To report suspected security issues or vulnerabilities, contact our Security Team at:</strong>
              </p>
              <a 
                href="mailto:security@vidalitytrading.com" 
                className="text-blue-600 hover:underline font-medium"
              >
                security@vidalitytrading.com
              </a>
            </div>
          </div>

          {/* Certifications & Standards */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-emerald-600 font-bold">8</span>
              </div>
              Certifications & Standards
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Vidality seeks to align its security program with recognised frameworks and standards 
              (for example, ISO/IEC 27001, NIST Cybersecurity Framework, and industry best practices). 
              Where applicable, we pursue third-party audits and certifications to validate controls. 
              Specific certification claims will be published in this section when achieved.
            </p>
          </div>

          {/* Bug Bounty & Responsible Disclosure */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-yellow-600 font-bold">9</span>
              </div>
              Bug Bounty & Responsible Disclosure
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We welcome responsible security research. If you discover a vulnerability, please follow our 
              responsible disclosure process by contacting{' '}
              <a href="mailto:security@vidalitytrading.com" className="text-blue-600 hover:underline">
                security@vidalitytrading.com
              </a>. Do not exploit vulnerabilities or access data unnecessarily. We review reports promptly 
              and may offer recognition or rewards for valid findings at our discretion.
            </p>
          </div>

          {/* Legal & Liability */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-gray-600 font-bold">10</span>
              </div>
              Legal & Liability
            </h2>
            <p className="text-gray-700 leading-relaxed">
              While we implement strong security measures, no system is completely immune to compromise. 
              Vidality does not warrant absolute security, and liability related to security incidents 
              is governed by the Terms of Service and applicable law.
            </p>
          </div>

          {/* Continuous Improvement */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-pink-600 font-bold">11</span>
              </div>
              Continuous Improvement
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Our security programme is subject to continual improvement through audits, independent assessments, 
              technology upgrades, and security training. We regularly review controls to address new threats 
              and operational changes.
            </p>
          </div>

          {/* Contact & Escalation */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-cyan-600 font-bold">12</span>
              </div>
              Contact & Escalation
            </h2>
            <p className="text-gray-700 mb-4">
              <strong>Security inquiries and escalations:</strong>
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">📧 Email:</span>
                <a href="mailto:security@vidalitytrading.com" className="text-blue-600 hover:underline">
                  security@vidalitytrading.com
                </a>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">🆘 Support:</span>
                <a href="mailto:contact.support.vidality@gmail.com" className="text-blue-600 hover:underline">
                  contact.support.vidality@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-sm text-gray-500">
              © 2025 Vidality Pty Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
