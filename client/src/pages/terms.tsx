import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
              Terms of Service
            </span>
          </h1>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Service Agreement</h2>
              <p className="text-gray-700 leading-relaxed">
                By using Format A, you agree to these terms and conditions. Our service provides IEEE document formatting for academic and research purposes. These terms constitute a legally binding agreement between you and Format A.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Payment Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Payment is required per page processed at ₹5 INR per page. Payment is processed securely and charged only for successful document generation.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Payment is charged per page of content processed</li>
                <li>No charges apply for failed document generation</li>
                <li>All payments are processed through secure payment gateways</li>
                <li>Pricing is subject to change with prior notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Document Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Documents are processed securely and temporarily. We do not store your documents permanently on our servers after processing is complete.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Documents are processed in real-time</li>
                <li>Temporary storage during processing only</li>
                <li>Automatic deletion after successful delivery</li>
                <li>No long-term storage of user content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Responsibilities</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Users are responsible for content accuracy, originality, and ensuring their documents comply with academic integrity standards.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Ensure content originality and proper citations</li>
                <li>Comply with academic integrity policies</li>
                <li>Verify document accuracy before submission</li>
                <li>Respect intellectual property rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Intended Use</h2>
              <p className="text-gray-700 leading-relaxed">
                Generated documents are intended for academic and research purposes. Users must comply with their institution's guidelines and IEEE standards. Commercial use requires separate licensing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Service Availability</h2>
              <p className="text-gray-700 leading-relaxed">
                We provide 24/7 automated processing but cannot guarantee 100% uptime. Service interruptions may occur for maintenance, updates, or technical issues.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                Format A is provided "as is" without warranties. We are not liable for any damages arising from the use of our service, including but not limited to document formatting errors or service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these terms at any time. Users will be notified of significant changes, and continued use constitutes acceptance of updated terms.
              </p>
            </section>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 text-sm">
              Last updated: December 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}