import { getSiteUrl } from '@/lib/site-url-server';
import { formatPrice } from '@/lib/utils/whatsapp';
import { CartItem } from '@/lib/types';

export function renderOrderItemsTable(items: CartItem[], currencySymbol = 'Rs.'): string {
  if (!items || items.length === 0) return '';
  return items.map(item => {
    // Get product thumbnail
    let imgUrl = '';
    if (item.selectedVariant?.imageUrl) {
      imgUrl = item.selectedVariant.imageUrl;
    } else if (item.product.images && item.product.images.length > 0) {
      // Find primary image or use first one
      const primary = item.product.images.find(img => img.isPrimary);
      imgUrl = primary ? primary.url : item.product.images[0].url;
    }

    const variantDetails = item.selectedVariant
      ? [
          item.selectedVariant.color,
          item.selectedVariant.size,
          item.selectedVariant.material,
          item.selectedVariant.customValue
        ].filter(Boolean).join(', ')
      : '';

    const modifierDetails = item.selectedModifiers && item.selectedModifiers.length > 0
      ? item.selectedModifiers.map(m => m.name).join(', ')
      : '';

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; vertical-align: top; width: 60px;">
          ${imgUrl ? `<img src="${imgUrl}" alt="${item.product.name}" width="50" height="50" style="border-radius: 8px; object-fit: cover;" />` : `<div style="width: 50px; height: 50px; border-radius: 8px; background-color: #f3f4f6;"></div>`}
        </td>
        <td style="padding: 12px 8px; vertical-align: top; text-align: left;">
          <div style="font-weight: 600; color: #1a1a2e; font-size: 14px;">${item.product.name}</div>
          ${variantDetails ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${variantDetails}</div>` : ''}
          ${modifierDetails ? `<div style="font-size: 12px; color: #10b981; margin-top: 2px;">+ ${modifierDetails}</div>` : ''}
        </td>
        <td style="padding: 12px 8px; vertical-align: top; text-align: center; color: #4b5563; font-size: 14px;">
          x${item.quantity}
        </td>
        <td style="padding: 12px 8px; vertical-align: top; text-align: right; font-weight: 700; color: #1a1a2e; font-size: 14px;">
          ${formatPrice(item.total, currencySymbol)}
        </td>
      </tr>
    `;
  }).join('');
}

export async function buildVariables(emailType: string, data: Record<string, any>): Promise<Record<string, any>> {
  const settings = data.settings || {};
  const currencySymbol = settings.currencySymbol || 'Rs.';

  // Start with standard variables
  const vars: Record<string, any> = {
    brand_name: settings.storeName || 'Zaynahs E-Store',
    site_url: await getSiteUrl(settings),
    customer_name: data.customer?.name || data.user?.name || 'Customer',
    customer_email: data.customer?.email || data.user?.email || '',
    contact_email: settings.headerTopBarEmail || settings.smtp_email || '',
    currency: currencySymbol,
    current_year: new Date().getFullYear().toString()
  };

  // If order details exist, populate order-related variables
  if (data.order) {
    const order = data.order;
    vars.order_id = order.orderNumber || order.id;
    vars.order_date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    vars.order_total = formatPrice(order.total, currencySymbol);
    vars.order_subtotal = formatPrice(order.subtotal || order.total, currencySymbol);
    vars.order_shipping_fee = formatPrice(order.shippingCost || 0, currencySymbol);
    vars.order_status = order.status;

    // Address
    const address = order.shipping_address || data.customer || {};
    let addressName = order.customerName || address.name || data.customer?.name || data.user?.name || 'Customer';
    let street = address.street || address.address || '';
    let city = address.city || '';
    let postalCode = address.postalCode || '';
    let phone = address.phone || order.customerPhone || data.customer?.phone || '';

    // Parse specific address fields from formatted notes if present
    if (order.notes) {
      const addressMatch = order.notes.match(/Address:\s*(.+)/i);
      const aptMatch = order.notes.match(/Apt\/Suite:\s*(.+)/i);
      const cityMatch = order.notes.match(/City:\s*(.+)/i);
      const postalMatch = order.notes.match(/Postal:\s*(.+)/i);
      const phoneMatch = order.notes.match(/Phone:\s*(.+)/i);

      if (addressMatch) {
        street = addressMatch[1].trim();
        if (aptMatch) {
          street += `, ${aptMatch[1].trim()}`;
        }
      }
      if (cityMatch) city = cityMatch[1].trim();
      if (postalMatch) postalCode = postalMatch[1].trim();
      if (phoneMatch) phone = phoneMatch[1].trim();
    }

    vars['shipping_address.name'] = addressName;
    vars['shipping_address.phone'] = phone;
    vars['shipping_address.street'] = street;
    vars['shipping_address.city'] = city;
    vars['shipping_address.postal_code'] = postalCode;
    vars['shipping_address.full'] = address.full || 
      [addressName, street, city, postalCode, phone].filter(Boolean).join(', ');

    // Shipping
    vars.tracking_number = order.trackingNumber || '';
    vars.courier_name = order.courierName || '';
    vars.tracking_url = order.trackingUrl || '';
    vars.estimated_delivery = order.estimatedDelivery || '';

    // Cancel/Refund
    vars.cancel_reason = order.cancelReason || '';
    vars.refund_amount = order.refundAmount ? formatPrice(order.refundAmount, currencySymbol) : '';
  }

  // Auth reset
  if (data.resetLink) {
    vars.reset_link = data.resetLink;
  }

  // Admin and other custom variables
  vars.admin_panel_url = `${vars.site_url}/admin`;
  
  if (data.product) {
    vars.product_name = data.product.name || '';
    vars.product_stock = data.product.stock !== undefined ? data.product.stock.toString() : '0';
  }
  
  if (data.review) {
    vars.review_rating = '★'.repeat(data.review.rating || 0) + '☆'.repeat(5 - (data.review.rating || 0));
    vars.review_text = data.review.comment || '';
    vars.review_author = data.review.customerName || '';
  }

  if (data.contact) {
    vars.contact_name = data.contact.name || '';
    vars.contact_subject = data.contact.subject || '';
    vars.contact_message = data.contact.message || '';
  }

  return vars;
}

export function replaceVariables(text: string, variables: Record<string, any>): string {
  if (!text) return '';
  return text.replace(/\{\{([a-zA-Z0-9_\.]+)\}\}/g, (match, key) => {
    // Check direct key or dotted path
    const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], variables);
    // If not found in variables, check direct dotted key in the flat variables object (e.g. 'shipping_address.full')
    if (value !== undefined) {
      return String(value);
    }
    const flatValue = variables[key];
    if (flatValue !== undefined) {
      return String(flatValue);
    }
    return match;
  });
}
