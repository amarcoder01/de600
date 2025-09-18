'use client'

import Link from 'next/link'
import { 
  Shield, 
  ArrowUp,
  ExternalLink,
  FileText,
  Lock,
  Scale,
  Building2,
  MapPin,
  Globe,
  AlertTriangle
} from 'lucide-react'
import { VidalityLogo } from '@/components/ui/VidalityLogo'

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800">
      <div className="w-full px-2 sm:px-4 lg:px-6 py-12">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <VidalityLogo size="md" variant="minimal" className="text-white" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Professional trading solutions for modern investors. 
              Advanced analytics, real-time data, and AI-powered insights.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Platform Online</span>
            </div>
            
            {/* Company Details */}
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center">
                <Building2 className="w-3 h-3 mr-2" />
                Vidality Pty Ltd (ACN 685 187 679)
              </p>
              <p className="flex items-center">
                <MapPin className="w-3 h-3 mr-2" />
                Perth, WA, Australia
              </p>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide flex items-center">
              <Scale className="w-4 h-4 mr-2" />
              Legal & Compliance
            </h3>
            <div className="space-y-2">
              <Link 
                href="/terms" 
                className="block text-slate-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <FileText className="w-3 h-3 mr-2" />
                Terms of Service
              </Link>
              <Link 
                href="/privacy" 
                className="block text-slate-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <Lock className="w-3 h-3 mr-2" />
                Privacy Policy
              </Link>
              <Link 
                href="/cookies" 
                className="block text-slate-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <Shield className="w-3 h-3 mr-2" />
                Cookie Policy
              </Link>
              <Link 
                href="/disclaimer" 
                className="block text-slate-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <AlertTriangle className="w-3 h-3 mr-2" />
                Risk Disclosure
              </Link>
              <Link 
                href="/regulatory" 
                className="block text-slate-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <Scale className="w-3 h-3 mr-2" />
                Regulatory Information
              </Link>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              Platform
            </h3>
            <div className="space-y-2">
              <Link 
                href="/compliance" 
                className="block text-slate-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <Shield className="w-3 h-3 mr-2" />
                Compliance
              </Link>
              <Link 
                href="/security-info" 
                className="block text-slate-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <Lock className="w-3 h-3 mr-2" />
                Security
              </Link>
              <Link 
                href="/how-it-works" 
                className="block text-slate-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <Globe className="w-3 h-3 mr-2" />
                How It Works
              </Link>
            </div>
          </div>


        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-sm text-slate-400">
                © {currentYear} <span className="font-medium text-white">Vidality Trading Platform</span>. All rights reserved.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ACN 685 187 679 • Perth, Western Australia
              </p>
            </div>
            <div className="flex items-center space-x-6 text-xs text-slate-500">
              <span>v1.0.0</span>
              <span>•</span>
              <span>August 2025</span>
              <span>•</span>
              <a
                href="https://t.me/VidalityPulse_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-white transition-colors"
                aria-label="Follow Vidality Pulse on Telegram"
              >
                <Globe className="w-3 h-3" />
                Telegram
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 z-50"
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </footer>
  )
}
