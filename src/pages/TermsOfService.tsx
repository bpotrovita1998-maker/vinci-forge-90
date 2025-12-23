import { ArrowLeft, FileText, Scale, AlertTriangle, Users, Ban, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Title */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
                <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <section className="prose prose-invert max-w-none">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Welcome to VinciAI. By accessing or using our AI-powered content generation platform, you agree to be bound 
              by these Terms of Service. Please read them carefully before using our services.
            </p>
          </section>

          {/* Acceptance of Terms */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Acceptance of Terms</h2>
            </div>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6 space-y-4">
              <p className="text-muted-foreground text-sm">
                By creating an account or using VinciAI services, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not 
                use our services.
              </p>
              <p className="text-muted-foreground text-sm">
                You must be at least 18 years old or have parental consent to use our services. By using VinciAI, 
                you represent and warrant that you meet these age requirements.
              </p>
            </div>
          </section>

          {/* Service Description */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Description of Services</h2>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <p className="text-muted-foreground text-sm mb-4">
                VinciAI provides AI-powered content generation services including but not limited to:
              </p>
              <ul className="text-muted-foreground text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Image generation from text prompts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Video generation and editing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>3D model creation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>AI-powered content enhancement and upscaling</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Intellectual Property Rights */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Intellectual Property Rights</h2>
            </div>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">Your Content</h3>
                <p className="text-muted-foreground text-sm">
                  You retain ownership of any original content you provide to VinciAI (such as text prompts and 
                  uploaded images). By using our services, you grant VinciAI a limited, non-exclusive license to 
                  process your content for the purpose of generating AI outputs.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Generated Content</h3>
                <p className="text-muted-foreground text-sm">
                  Subject to your compliance with these Terms and your subscription plan, you are granted rights 
                  to use AI-generated content for personal and commercial purposes. The specific usage rights 
                  depend on your subscription tier.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">VinciAI Platform</h3>
                <p className="text-muted-foreground text-sm">
                  All intellectual property rights in the VinciAI platform, including software, algorithms, designs, 
                  and trademarks, are owned by VinciAI or its licensors. Nothing in these Terms grants you rights 
                  to use our trademarks, logos, or brand features.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Third-Party Content</h3>
                <p className="text-muted-foreground text-sm">
                  You are responsible for ensuring that any content you upload or reference does not infringe on 
                  third-party intellectual property rights. VinciAI is not liable for any infringement claims 
                  arising from your use of copyrighted materials.
                </p>
              </div>
            </div>
          </section>

          {/* Acceptable Use Policy */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Acceptable Use Policy</h2>
            </div>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6 space-y-4">
              <p className="text-muted-foreground text-sm">
                You agree to use VinciAI services responsibly and in compliance with all applicable laws. 
                The following activities are strictly prohibited:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground text-sm">Prohibited Content</h4>
                  <ul className="text-muted-foreground text-sm space-y-1">
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Illegal or harmful content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Child exploitation material</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Non-consensual intimate imagery</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Harassment or hate speech</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Violent or graphic content</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground text-sm">Prohibited Activities</h4>
                  <ul className="text-muted-foreground text-sm space-y-1">
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Circumventing security measures</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Reverse engineering our systems</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Automated scraping or abuse</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Sharing account credentials</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Impersonating others</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Terms */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Payment Terms</h2>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">Subscription Plans</h3>
                <p className="text-muted-foreground text-sm">
                  VinciAI offers various subscription plans with different features and usage limits. 
                  Subscription fees are billed in advance on a recurring basis according to your selected plan.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Refunds</h3>
                <p className="text-muted-foreground text-sm">
                  Subscription fees are generally non-refundable. However, we may provide refunds at our 
                  discretion in cases of service issues or other exceptional circumstances.
                </p>
              </div>
            </div>
          </section>

          {/* Termination */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Termination</h2>
            </div>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <p className="text-muted-foreground text-sm mb-4">
                VinciAI reserves the right to suspend or terminate your account at any time for:
              </p>
              <ul className="text-muted-foreground text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Violation of these Terms of Service</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Engaging in prohibited activities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Non-payment of subscription fees</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Suspicious or fraudulent activity</span>
                </li>
              </ul>
              <p className="text-muted-foreground text-sm mt-4">
                You may cancel your account at any time through your account settings. Upon termination, 
                your right to use the service will immediately cease.
              </p>
            </div>
          </section>

          {/* Disclaimers */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Disclaimers & Limitation of Liability</h2>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <p className="text-muted-foreground text-sm mb-4">
                VINCIAI SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE 
                THAT OUR SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR MEET YOUR SPECIFIC REQUIREMENTS.
              </p>
              <p className="text-muted-foreground text-sm">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, VINCIAI SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OUR SERVICES.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Contact Us</h2>
            <div className="bg-card/50 border border-border/30 rounded-xl p-6">
              <p className="text-muted-foreground text-sm">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-foreground mt-2">
                <a href="mailto:legal@vinciai.com" className="text-primary hover:underline">
                  legal@vinciai.com
                </a>
              </p>
              <p className="text-muted-foreground text-sm mt-4">
                Or visit our{' '}
                <Link to="/contact" className="text-primary hover:underline">
                  Contact Page
                </Link>{' '}
                for other inquiries.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
