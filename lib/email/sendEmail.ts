import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { getSettings } from '@/lib/services/settings';
import { getSiteUrl } from '@/lib/site-url-server';
import React from 'react';

interface SendEmailParams {
  to: string;
  subject: string;
  template?: React.ReactElement;
  html?: string;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style([\s\S]*?)<\/style>/gi, '')
    .replace(/<script([\s\S]*?)<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function sendEmail({
  to,
  subject,
  template,
  html,
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getSettings();

    if (!settings.smtp_email || !settings.smtp_app_password) {
      console.error('[Email] SMTP is not configured in settings.');
      return { success: false, error: 'SMTP not configured' };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: settings.smtp_email,
        pass: settings.smtp_app_password.replace(/\s+/g, ''), // strip any spaces in app password
      },
    });

    // Render React Email template to plain HTML string if available
    let htmlContent = html;
    if (template) {
      htmlContent = await render(template);
    }

    if (!htmlContent) {
      console.error('[Email] No email content provided.');
      return { success: false, error: 'No email content' };
    }

    // Dynamic Message-ID Domain Resolution to prevent spam filtering on localhost/invalid domains
    const siteUrl = await getSiteUrl();
    let emailDomain = 'zaynahs.com';
    try {
      if (siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
        const parsed = new URL(siteUrl);
        emailDomain = parsed.hostname.replace('www.', '');
      } else if (settings.storeName) {
        const cleaned = settings.storeName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleaned) {
          emailDomain = `${cleaned}.com`;
        }
      }
    } catch (e) {
      console.warn('[Email] Error parsing site domain for Message-ID:', e);
    }

    const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const customMessageId = `${randomId}@${emailDomain}`;

    const info = await transporter.sendMail({
      from: `"${settings.smtp_from_name || settings.storeName}" <${settings.smtp_email}>`,
      to,
      replyTo: settings.smtp_email,
      subject,
      text: htmlToText(htmlContent),
      html: htmlContent,
      messageId: customMessageId,
      headers: {
        'X-Mailer': 'Nodemailer',
        'X-Priority': '3', // Normal Priority
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
      }
    });

    console.log(`[Email] Message sent successfully: ${info.messageId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send email via SMTP transporter:', error);
    return { success: false, error: error.message || 'SMTP delivery failed' };
  }
}
