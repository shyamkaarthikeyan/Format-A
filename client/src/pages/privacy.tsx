import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-violet-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-purple-200 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            <span className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Privacy Policy
            </span>
          </h1>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Data Protection</h2>
              <p className="text-gray-700 leading-relaxed">
                We respect your privacy and protect your data. All document processing is done securely with industry-standard encryption. Your privacy is our priority, and we are committed to protecting your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect minimal information necessary to provide our service:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Document content for processing purposes</li>
                <li>Email addresses for document delivery</li>
                <li>Payment information for transaction processing</li>
                <li>Basic usage analytics for service improvement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Document Handling</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Documents are processed temporarily and automatically deleted after generation. We do not retain copies of your academic work.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Documents processed in secure, encrypted environment</li>
                <li>Automatic deletion within 24 hours of processing</li>
                <li>No permanent storage of user documents</li>
                <li>No access to document content by staff</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Personal Information</h2>
              <p className="text-gray-700 leading-relaxed">
                No personal data is stored beyond transaction records required for payment processing. We do not collect unnecessary personal information and follow data minimization principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Email Usage</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Email addresses are used only for document delivery and essential service notifications.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Document delivery to specified email address</li>
                <li>Service notifications and updates</li>
                <li>No marketing emails without explicit consent</li>
                <li>No sharing with third parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                All data transmission is encrypted using SSL/TLS protocols. Our servers are secured and regularly updated with security patches.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>End-to-end encryption for all data transmission</li>
                <li>Secure server infrastructure with regular updates</li>
                <li>Access controls and monitoring systems</li>
                <li>Regular security audits and assessments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Compliance</h2>
              <p className="text-gray-700 leading-relaxed">
                We comply with data protection regulations including GDPR, CCPA, and other applicable privacy laws. Users have rights regarding their personal data including access, correction, and deletion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed">
                We use minimal cookies for essential functionality only. No tracking cookies or third-party analytics that compromise your privacy are used without consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                For privacy-related questions or concerns, please contact us. We are committed to addressing any privacy issues promptly and transparently.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Policy Updates</h2>
              <p className="text-gray-700 leading-relaxed">
                This privacy policy may be updated to reflect changes in our practices or legal requirements. Users will be notified of significant changes.
              </p>
            </section>
          </div>


        </div>
      </div>
    </div>
  );
}