import { NextRequest, NextResponse } from 'next/server';
import { getPendingAbandonmentEmails, markAbandonmentEmailSent } from '@/lib/services/abandonedCarts';
import { sendEmail } from '@/lib/email/sendEmail';
import { getSettings } from '@/lib/services/settings';
import { buildAbandonedCartEmailHTML, buildAbandonedCartEmailText } from '@/lib/email/abandonedCartEmail';
import { getSiteUrl } from '@/lib/site-url-server';

/**
 * GET /api/cron/abandoned-cart
 * Vercel Cron job — runs every minute.
 * Finds carts idle > 5 mins with customer email → sends abandonment email.
 * 
 * Add to vercel.json:
 * { "crons": [{ "path": "/api/cron/abandoned-cart", "schedule": "* * * * *" }] }
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET || process.env.REVALIDATE_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    const siteUrl = await getSiteUrl(settings);

    // If abandoned cart emails are disabled in settings → skip
    if (settings.abandonedCartEmailEnabled === false) {
      return NextResponse.json({ skipped: true, reason: 'Abandoned cart emails disabled' });
    }

    const pendingCarts = await getPendingAbandonmentEmails();

    if (pendingCarts.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const cart of pendingCarts) {
      if (!cart.customerEmail) continue;

      try {
        const html = buildAbandonedCartEmailHTML({
          customerName: cart.customerName,
          items: cart.items,
          subtotal: cart.subtotal,
          currency: cart.currency,
          currencySymbol: settings.currencySymbol || 'Rs.',
          storeName: settings.storeName || "Zaynah's E-Store",
          storeWhatsapp: settings.whatsappNumber,
          checkoutUrl: cart.checkoutUrl || `${siteUrl}/cart?step=checkout`,
          logoUrl: settings.logoUrl,
        });

        const text = buildAbandonedCartEmailText({
          customerName: cart.customerName,
          items: cart.items,
          subtotal: cart.subtotal,
          currency: cart.currency,
          currencySymbol: settings.currencySymbol || 'Rs.',
          storeName: settings.storeName || "Zaynah's E-Store",
          checkoutUrl: cart.checkoutUrl || `${siteUrl}/cart?step=checkout`,
        });

        // Use template from settings if provided
        const emailSubject = settings.abandonedCartEmailSubject
          || `You left something behind at ${settings.storeName || "Zaynah's E-Store"}!`;

        const result = await sendEmail({
          to: cart.customerEmail,
          subject: emailSubject,
          html: settings.abandonedCartEmailTemplate
            ? `<div style="font-family: sans-serif; line-height: 1.6; color: #1a1a2e; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
                <h2 style="color: #1a1a2e; margin-top: 0;">Complete Your Order</h2>
                <div style="font-size: 15px; color: #4b5563;">
                  ${settings.abandonedCartEmailTemplate
                    .replace(/{{customer_name}}/g, cart.customerName?.split(' ')[0] || 'Customer')
                    .replace(/{{name}}/g, cart.customerName?.split(' ')[0] || 'Customer')
                    .replace(/{{checkout_url}}/g, `<br/><a href="${cart.checkoutUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/cart?step=checkout`}" style="display: inline-block; background-color: #e94560; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; margin-top: 12px; margin-bottom: 12px;">Complete Checkout →</a><br/>`)
                    .replace(/{{store_name}}/g, settings.storeName || "Zaynah's E-Store")
                    .replace(/\n/g, '<br />')}
                </div>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">
                  You received this email because you started checkout on our store.
                </p>
              </div>`
            : html,
          template: undefined,
        });

        if (result.success) {
          await markAbandonmentEmailSent(cart.id);
          sent++;

          // Also notify admin if admin email configured
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
          if (adminEmail && settings.abandonedCartAdminNotify !== false) {
            await sendEmail({
              to: adminEmail,
              subject: `🛒 Abandoned Cart — ${cart.customerName || cart.customerEmail}`,
              html: `
                <div style="font-family:sans-serif;padding:20px;max-width:500px;">
                  <h2 style="color:#1a1a2e;">Abandoned Cart Detected</h2>
                  <p><strong>Customer:</strong> ${cart.customerName || 'Unknown'}</p>
                  <p><strong>Email:</strong> ${cart.customerEmail}</p>
                  <p><strong>Phone:</strong> ${cart.customerPhone || '—'}</p>
                  <p><strong>Cart Value:</strong> ${settings.currencySymbol || 'Rs.'}${cart.subtotal.toLocaleString()}</p>
                  <p><strong>Items:</strong> ${cart.items.length}</p>
                  <p><strong>Last Activity:</strong> ${new Date(cart.lastActivity).toLocaleString()}</p>
                  <p><a href="${siteUrl}/admin/abandoned-carts" style="color:#e94560;">View in Admin →</a></p>
                </div>
              `,
            }).catch(e => console.error('[abandoned-cart cron] Admin notify failed:', e));
          }
        } else {
          console.error(`[abandoned-cart cron] Email failed for cart ${cart.id}:`, result.error);
          failed++;
        }
      } catch (err) {
        console.error(`[abandoned-cart cron] Error processing cart ${cart.id}:`, err);
        failed++;
      }
    }

    console.log(`[abandoned-cart cron] Processed ${pendingCarts.length} carts: ${sent} sent, ${failed} failed`);
    return NextResponse.json({ processed: pendingCarts.length, sent, failed });
  } catch (err: any) {
    console.error('[abandoned-cart cron] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
