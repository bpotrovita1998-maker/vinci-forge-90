import { ArrowLeft, Shield, Cookie, Eye, Lock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';
import { SEO } from '@/components/SEO';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export default function PrivacyPolicy() {
  return (
    <>
      <SEO 
        title="Privacy Policy"
        description="VinciAI's privacy policy explains how we collect, use, and protect your personal information when you use our AI content generation platform."
        keywords="VinciAI privacy, data protection, privacy policy"
      />
      <div className="min-h-screen bg-background">
        {/* Spacer for fixed global navigation */}
        <div className="h-20" />
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Breadcrumbs />
        </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Title */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <section className="prose prose-invert max-w-none">
            <p className="text-muted-foreground text-lg leading-relaxed">
              At VinciAI, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website 
              and use our AI-powered content generation services.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
            </div>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">Personal Information</h3>
                <p className="text-muted-foreground text-sm">
                  When you create an account, we may collect your name, email address, and payment information 
                  for subscription services.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Usage Data</h3>
                <p className="text-muted-foreground text-sm">
                  We automatically collect information about how you interact with our services, including 
                  the prompts you use, generated content, and feature usage patterns.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Device Information</h3>
                <p className="text-muted-foreground text-sm">
                  We collect information about the device you use to access our services, including IP address, 
                  browser type, operating system, and device identifiers.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies and Advertising */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Cookie className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Cookies and Advertising</h2>
            </div>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">What Are Cookies?</h3>
                <p className="text-muted-foreground text-sm">
                  Cookies are small text files stored on your device when you visit our website. They help us 
                  provide you with a better experience by remembering your preferences and understanding how 
                  you use our services.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Google AdSense</h3>
                <p className="text-muted-foreground text-sm">
                  We use Google AdSense to display advertisements on our website. Google AdSense uses cookies 
                  to serve ads based on your prior visits to our website and other websites on the Internet. 
                  This is known as interest-based or personalized advertising.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Types of Cookies We Use</h3>
                <ul className="text-muted-foreground text-sm space-y-2 list-disc list-inside">
                  <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
                  <li><strong>Advertising Cookies:</strong> Used by Google AdSense to display relevant advertisements</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Managing Your Cookie Preferences</h3>
                <p className="text-muted-foreground text-sm">
                  You can manage your cookie preferences through our cookie consent banner when you first visit 
                  our website. You can also opt out of personalized advertising by visiting{' '}
                  <a 
                    href="https://www.google.com/settings/ads" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google's Ad Settings
                  </a>{' '}
                  or{' '}
                  <a 
                    href="https://www.aboutads.info/choices" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    aboutads.info
                  </a>.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">How We Use Your Information</h2>
            </div>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <ul className="text-muted-foreground text-sm space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>To provide and maintain our AI content generation services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>To process your transactions and manage your subscription</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>To improve our services and develop new features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>To display personalized advertisements through Google AdSense</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>To communicate with you about updates, offers, and support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>To comply with legal obligations and protect our rights</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Your Rights (GDPR)</h2>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <p className="text-muted-foreground text-sm mb-4">
                If you are located in the European Economic Area (EEA), you have certain rights under the 
                General Data Protection Regulation (GDPR):
              </p>
              <ul className="text-muted-foreground text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Right to Access:</strong> Request a copy of your personal data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Right to Rectification:</strong> Request correction of inaccurate data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Right to Erasure:</strong> Request deletion of your personal data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Right to Restrict Processing:</strong> Request limitation of data processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Right to Data Portability:</strong> Request transfer of your data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Right to Object:</strong> Object to processing of your personal data</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Contact Us</h2>
            </div>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <p className="text-muted-foreground text-sm">
                If you have any questions about this Privacy Policy or wish to exercise your rights, 
                please contact us at:
              </p>
              <p className="text-foreground mt-2">
                <a href="mailto:privacy@vinciai.com" className="text-primary hover:underline">
                  privacy@vinciai.com
                </a>
              </p>
            </div>
          </section>

          {/* Updates */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Changes to This Policy</h2>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <p className="text-muted-foreground text-sm">
                We may update this Privacy Policy from time to time. We will notify you of any changes by 
                posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage 
                you to review this Privacy Policy periodically for any changes.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
    </>
  );
}
