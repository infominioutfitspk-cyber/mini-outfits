import { NextRequest, NextResponse } from 'next/server';
import { getEmailTemplate } from '@/lib/services/emailTemplates';
import { getSettings } from '@/lib/services/settings';
import { buildVariables, replaceVariables, renderOrderItemsTable } from '@/lib/email/variables';
import { getDefaultTemplate } from '@/lib/email/defaults/getDefaultTemplate';
import { getSiteUrl } from '@/lib/site-url-server';

const mockData: Record<string, any> = {
  customer: {
    name: 'Ali Khan',
    email: 'alikhan@gmail.com',
    phone: '+92 300 1234567'
  },
  user: {
    name: 'Ali Khan',
    email: 'alikhan@gmail.com'
  },
  resetLink: 'https://zaynahs.com/reset-password?token=mock_token_123',
  order: {
    id: 'ZE-1052',
    orderNumber: 'ZE-1052',
    createdAt: new Date().toISOString(),
    subtotal: 2900,
    shippingCost: 200,
    total: 3100,
    status: 'shipped',
    trackingNumber: 'TCS123456789',
    courierName: 'TCS Courier',
    trackingUrl: 'https://tcs.com.pk/track?num=TCS123456789',
    estimatedDelivery: '3-5 Business Days',
    cancelReason: 'Customer requested change of address',
    refundAmount: 3100,
    items: [
      {
        id: 'item-1',
        quantity: 2,
        total: 2400,
        unitPrice: 1200,
        product: {
          id: 'prod-1',
          name: 'Blue Cotton Kurta',
          price: 1200,
          images: [{ url: 'https://ziucrfpebpxijqhwmqre.supabase.co/storage/v1/object/public/product-images/sample1.webp', isPrimary: true }]
        },
        selectedVariant: {
          color: 'Blue',
          size: 'Medium'
        },
        selectedModifiers: []
      },
      {
        id: 'item-2',
        quantity: 1,
        total: 700,
        unitPrice: 700,
        product: {
          id: 'prod-2',
          name: 'Classic Leather Wallet',
          price: 700,
          images: [{ url: 'https://ziucrfpebpxijqhwmqre.supabase.co/storage/v1/object/public/product-images/sample2.webp', isPrimary: true }]
        },
        selectedVariant: {},
        selectedModifiers: [{ name: 'Gift Wrap' }]
      }
    ],
    shipping_address: {
      name: 'Ali Khan',
      phone: '+92 300 1234567',
      street: 'Flat 4B, Eden Heights, Gulberg III',
      city: 'Lahore',
      full: 'Ali Khan, Flat 4B, Eden Heights, Gulberg III, Lahore, +92 300 1234567'
    }
  },
  product: {
    name: 'Premium Peshawari Chappal',
    stock: 3
  },
  review: {
    rating: 5,
    comment: 'Exceptional quality! The fit is perfect and the leather feels extremely premium. Will definitely order again.',
    customerName: 'Ayesha Rahman'
  },
  contact: {
    name: 'Bilal Ahmed',
    subject: 'Bulk Inquiry',
    message: 'Hello, I am interested in purchasing 50 units of the Peshawari Chappal for an upcoming wedding event. Do you offer corporate or bulk discounts? Please let me know. Thanks!'
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const body = await request.json().catch(() => ({}));
    
    // Get custom template fields from body (if we want to preview unsaved editor changes) or fetch from DB
    let subject = body.subject;
    let customHtml = body.customHtml;
    let isDefaultMode = body.isDefaultMode;

    const template = await getEmailTemplate(type);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    if (subject === undefined) subject = template.subject;
    if (customHtml === undefined && !isDefaultMode) customHtml = template.customHtml;

    const settings = await getSettings();
    const siteUrl = settings.storeUrl || await getSiteUrl(settings);
    const dynamicResetLink = `${siteUrl.replace(/\/$/, '')}/reset-password?token=mock_token_123`;
    const mergedData = { ...mockData, settings, resetLink: dynamicResetLink };

    // Build variable values
    const variables = await buildVariables(type, mergedData);
    
    if (mockData.order?.items) {
      variables.order_items_html = renderOrderItemsTable(mockData.order.items, settings.currencySymbol);
    }

    // Resolve Subject and Body
    const resolvedSubject = replaceVariables(subject, variables);
    let resolvedHtml = '';

    if (isDefaultMode || (!customHtml && !template.customHtml)) {
      resolvedHtml = getDefaultTemplate(type, variables);
    } else {
      resolvedHtml = replaceVariables(customHtml || template.customHtml || '', variables);
    }

    return NextResponse.json({
      success: true,
      subject: resolvedSubject,
      html: resolvedHtml
    });
  } catch (error: any) {
    const { type } = await params;
    console.error(`[API email-templates/preview] POST for '${type}' failed:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
