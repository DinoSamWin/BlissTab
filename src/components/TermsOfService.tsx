import React from 'react';

const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F0F] text-gray-800 dark:text-gray-200 p-8 md:p-16">
            <div className="max-w-3xl mx-auto space-y-8 animate-reveal">
                <header className="space-y-4 border-b border-gray-200 dark:border-white/10 pb-8">
                    <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated: 2026.02.14</p>
                </header>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
                    <p>By accessing or using StartlyTab ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
                    <p>StartlyTab is a browser start-page application designed to provide a mindful workspace and mental reset tools.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">2. AI Wrapper Disclosure & Disclaimer</h2>
                    <p>StartlyTab provides a custom interface and extended features for third-party AI models, including but not limited to models provided by Google (Gemini) and Anthropic (Claude).</p>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                        <p className="font-medium text-indigo-900 dark:text-indigo-300">Disclaimer:</p>
                        <p className="text-sm mt-2">StartlyTab is an independent product and is not affiliated with, endorsed by, or sponsored by Google, Anthropic, or any other AI model providers. We provide access to these models through our custom interface to enhance usability and provide additional features.</p>
                    </div>
                    <p>The Service is intended to provide helpful content, but we do not guarantee the accuracy, completeness, or usefulness of any AI-generated output.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">3. Subscription and Billing</h2>
                    <p>Some features of StartlyTab require a paid subscription ("Pro Plan" or "Lifetime Plan"). All payments are processed through Creem, our Merchant of Record (MoR).</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Subscriptions:</strong> Pro Plans may be billed on a monthly or yearly basis.</li>
                        <li><strong>One-Time Payments:</strong> Lifetime Plans grant access for the duration of the Service's existence.</li>
                        <li><strong>Pricing:</strong> We reserve the right to change our pricing upon notice.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">4. Refund Policy</h2>
                    <p>We want you to be happy with StartlyTab. If you are not satisfied with your purchase, please contact us within 14 days of your initial transaction.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Requests:</strong> All refund requests must be sent to <span className="font-medium text-indigo-600">support@startlytab.com</span>.</li>
                        <li><strong>Response Time:</strong> We commit to responding to all customer support and refund inquiries within 3 business days.</li>
                        <li><strong>Eligibility:</strong> Refunds are typically granted for technical issues or if the Service does not meet the features described on our website.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">5. User Conduct and Responsibilities</h2>
                    <p>You are responsible for your use of the Service and for any content you provide. You may not use the Service for any illegal or unauthorized purpose, including but not limited to:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Transmitting malware or viruses.</li>
                        <li>Attempting to reverse engineer or interfere with the Service's infrastructure.</li>
                        <li>Generating content that is abusive, harmful, or violates third-party intellectual property rights.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">6. Termination</h2>
                    <p>We reserve the right to suspend or terminate your access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users of the Service, us, or third parties, or for any other reason.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">7. Limitation of Liability</h2>
                    <p>StartlyTab is provided "as is" and "as available" without any warranties of any kind. In no event shall StartlyTab or its developers be liable for any damages arising out of the use or inability to use the Service.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">8. Changes to Terms</h2>
                    <p>We may modify these Terms at any time. We will notify users of any material changes by updating the "Last Updated" date at the top of this page.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">9. Contact Information</h2>
                    <p>For any questions regarding these Terms or our Service, please contact us at:</p>
                    <p className="font-medium text-lg text-indigo-600 dark:text-indigo-400">Email: support@startlytab.com</p>
                </section>
            </div>
        </div>
    );
};

export default TermsOfService;
