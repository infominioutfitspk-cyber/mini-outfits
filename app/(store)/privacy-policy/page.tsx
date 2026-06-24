import React from 'react';
import { getSettings } from '@/lib/services/settings';
import { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const storeName = settings.storeName || 'Store';
  return {
    title: `Privacy Policy | ${storeName}`,
    description: `Read our privacy policy to understand how ${storeName} collects, uses, and protects your personal data.`,
  };
}

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const storeName = settings.storeName || 'Zaynahs E-Store';
  
  let supportEmail = settings.headerTopBarEmail;
  if (!supportEmail) {
    let domain = 'store.com';
    if (settings.storeUrl) {
      try {
        const parsed = new URL(settings.storeUrl);
        domain = parsed.hostname.replace('www.', '');
      } catch (e) {}
    }
    supportEmail = `support@${domain}`;
  }

  const supportPhone = settings.headerTopBarPhone || '0328-4114551';
  const privacyContent = settings.privacyPolicyContent;

  return (
    <div className="min-h-[60vh] bg-gray-50 dark:bg-[#0f0f1b] py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#16162a] rounded-3xl border border-gray-200 dark:border-gray-800 p-8 sm:p-10 shadow-sm">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
          Privacy Policy
        </h1>
        <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-6">
          {privacyContent ? (
            <div dangerouslySetInnerHTML={{ __html: privacyContent }} />
          ) : (
            <>
              <p>
                At <strong>{storeName}</strong>, we are committed to maintaining the trust and confidence of our visitors and customers.
                This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our services.
              </p>

              <h2 className="text-xl font-bold mt-6 text-gray-900 dark:text-white">1. Information We Collect</h2>
              <p>
                When you visit the site, place an order via WhatsApp, or create an account, we may collect the following information:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Personal details:</strong> Your name, email address, phone number, and shipping address.</li>
                <li><strong>Order details:</strong> The products you buy, quantities, total amount, and shopping cart history.</li>
                <li><strong>Device details:</strong> Your IP address, browser type, and cookie data to optimize the store experience.</li>
              </ul>

              <h2 className="text-xl font-bold mt-6 text-gray-900 dark:text-white">2. How We Use Your Information</h2>
              <p>
                We use your personal data to provide a seamless e-commerce service:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Processing orders, managing deliveries, and sending order confirmation updates via WhatsApp.</li>
                <li>Allowing you to track order history under your user account profile.</li>
                <li>Optimizing website speed, layouts, and tracking pixels (e.g. Meta Pixel) to improve user interactions.</li>
                <li>Sending newsletter updates if you explicitly subscribe via our footer form.</li>
              </ul>

              <h2 className="text-xl font-bold mt-6 text-gray-900 dark:text-white">3. Data Retention and WhatsApp Orders</h2>
              <p>
                Since Zaynahs E-Store processes final order transactions through WhatsApp, your checkout data is securely forwarded to our support representative to complete fulfillment. We do not sell, rent, or lease your personal information to third parties.
              </p>

              <h2 className="text-xl font-bold mt-6 text-gray-900 dark:text-white">4. Cookies and Customizer Toggles</h2>
              <p>
                We use functional cookies to save items in your shopping cart (stored locally via your browser) and remember your preferences like dark/light mode toggles.
              </p>

              <h2 className="text-xl font-bold mt-6 text-gray-900 dark:text-white">5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, your personal data, or wish to request data deletion, please contact us:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Email:</strong> {supportEmail}</li>
                <li><strong>Phone/WhatsApp:</strong> {supportPhone}</li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
