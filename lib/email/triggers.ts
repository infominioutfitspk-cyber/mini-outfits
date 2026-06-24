import { getSettings } from '@/lib/services/settings';
import { getProductById } from '@/lib/services/products';
import { updateOrderDetails } from '@/lib/services/orders';
import { sendTemplatedEmail } from './sendTemplatedEmail';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSiteUrl } from '@/lib/site-url-server';
import { CartItem, Order } from '@/lib/types';

// Helper to get admin email
async function getAdminEmail(): Promise<string> {
  const settings = await getSettings();
  return settings.admin_notification_email || settings.smtp_email || '';
}

// 1. Welcome template trigger
export async function onUserRegister(user: { name?: string; email: string }) {
  try {
    const adminEmail = await getAdminEmail();
    
    // Send welcome email to customer
    await sendTemplatedEmail('welcome', user.email, { user });
    
    // Notify admin
    await notifyAdminNewCustomer(user);
  } catch (error) {
    console.error('[Email Trigger] onUserRegister failed:', error);
  }
}

// 2. Admin notification on new customer
export async function notifyAdminNewCustomer(user: { name?: string; email: string }) {
  try {
    const adminEmail = await getAdminEmail();
    if (adminEmail) {
      await sendTemplatedEmail('admin_new_customer', adminEmail, { customer: user });
    }
  } catch (error) {
    console.error('[Email Trigger] notifyAdminNewCustomer failed:', error);
  }
}

// 3. Password reset link trigger
export async function onPasswordResetRequest(user: { name?: string; email: string }, resetToken: string) {
  try {
    const settings = await getSettings();
    const siteUrl = await getSiteUrl(settings);
    const resetLink = `${siteUrl}/reset-password?token=${resetToken}`;
    
    await sendTemplatedEmail('password_reset', user.email, { 
      user, 
      resetLink 
    });
  } catch (error) {
    console.error('[Email Trigger] onPasswordResetRequest failed:', error);
  }
}

// 4. Password changed notice
export async function onPasswordChanged(user: { name?: string; email: string }) {
  try {
    await sendTemplatedEmail('password_changed', user.email, { user });
  } catch (error) {
    console.error('[Email Trigger] onPasswordChanged failed:', error);
  }
}

// 5. Order Placed (checkout success) trigger
export async function onOrderPlaced(order: any, customer: any) {
  try {
    let customerEmail = customer?.email || order?.shipping_address?.email;
    let resolvedCustomer = customer || {};

    if (!customerEmail && order.customerId) {
      try {
        const { data: cust } = await supabaseAdmin
          .from('customers')
          .select('email, name, phone')
          .eq('id', order.customerId)
          .maybeSingle();
        if (cust?.email) {
          customerEmail = cust.email;
        }
        if (cust) {
          resolvedCustomer = { ...resolvedCustomer, name: cust.name, phone: cust.phone, email: cust.email };
        }
      } catch (err) {
        console.error('Failed to load customer details for order placed trigger:', err);
      }
    }

    // Fallback: Parse email from order notes if not found through customer record
    if (!customerEmail && order.notes) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const match = order.notes.match(emailRegex);
      if (match) {
        customerEmail = match[0];
        if (!resolvedCustomer.email) {
          resolvedCustomer.email = customerEmail;
        }
      }
    }

    if (customerEmail) {
      // Send Order Placed to customer
      await sendTemplatedEmail('order_placed', customerEmail, { order, customer: resolvedCustomer });
    }

    // Send New Order alert to admin
    await notifyAdminNewOrder(order, resolvedCustomer);

    // Run low stock checks on purchased items
    if (order.items && order.items.length > 0) {
      await checkLowStock(order.items);
    }
  } catch (error) {
    console.error('[Email Trigger] onOrderPlaced failed:', error);
  }
}

// 6. Admin notification on new order
export async function notifyAdminNewOrder(order: any, customer: any) {
  try {
    const adminEmail = await getAdminEmail();
    if (adminEmail) {
      await sendTemplatedEmail('admin_new_order', adminEmail, { order, customer });
    }
  } catch (error) {
    console.error('[Email Trigger] notifyAdminNewOrder failed:', error);
  }
}

// 7. Order Status Changed trigger
export async function onOrderStatusChange(order: any, customer: any, newStatus: string) {
  try {
    let customerEmail = customer?.email || order?.shipping_address?.email;
    let resolvedCustomer = customer || {};

    if (!customerEmail && order.customerId) {
      try {
        const { data: cust } = await supabaseAdmin
          .from('customers')
          .select('email, name, phone')
          .eq('id', order.customerId)
          .maybeSingle();
        if (cust?.email) {
          customerEmail = cust.email;
        }
        if (cust) {
          resolvedCustomer = { ...resolvedCustomer, name: cust.name, phone: cust.phone, email: cust.email };
        }
      } catch (err) {
        console.error('Failed to load customer details for order status trigger:', err);
      }
    }

    // Fallback: Parse email from order notes if not found through customer record
    if (!customerEmail && order.notes) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const match = order.notes.match(emailRegex);
      if (match) {
        customerEmail = match[0];
        if (!resolvedCustomer.email) {
          resolvedCustomer.email = customerEmail;
        }
      }
    }

    if (!customerEmail) {
      console.warn('[Email Trigger] onOrderStatusChange aborted: customer has no email address.');
      return;
    }

    // Map order status to templates
    const statusMap: Record<string, string> = {
      confirmed: 'order_confirmed',
      processing: 'order_processing',
      shipped: 'order_shipped',
      out_for_delivery: 'order_out_for_delivery',
      delivered: 'order_delivered',
      cancelled: 'order_cancelled',
      refunded: 'order_refunded'
    };

    const templateType = statusMap[newStatus];
    if (!templateType) {
      console.log(`[Email Trigger] No template registered for status: ${newStatus}`);
      return;
    }

    // Dispatch templated email to customer
    await sendTemplatedEmail(templateType, customerEmail, { order, customer: resolvedCustomer });

    // Handle extra side-effects per status type
    if (newStatus === 'delivered') {
      console.log(`[Email Trigger] Order delivered. Marking review request as pending.`);
      await updateOrderDetails(order.id, {
        reviewEmailPending: true,
        deliveredAt: new Date().toISOString()
      });
    } else if (newStatus === 'cancelled') {
      await notifyAdminOrderCancelled(order, resolvedCustomer);
    }
  } catch (error) {
    console.error('[Email Trigger] onOrderStatusChange failed:', error);
  }
}

// 8. Admin alert when order is cancelled
export async function notifyAdminOrderCancelled(order: any, customer: any) {
  try {
    const adminEmail = await getAdminEmail();
    if (adminEmail) {
      await sendTemplatedEmail('admin_order_cancelled', adminEmail, { order, customer });
    }
  } catch (error) {
    console.error('[Email Trigger] notifyAdminOrderCancelled failed:', error);
  }
}

// 9. Low stock check and alert trigger
export async function checkLowStock(items: CartItem[]) {
  try {
    const settings = await getSettings();
    const globalThreshold = settings.low_stock_threshold ?? 5;
    const adminEmail = await getAdminEmail();

    if (!adminEmail) return;

    for (const item of items) {
      const productId = item.product?.id;
      if (!productId) continue;

      const product = await getProductById(productId);
      if (!product || !product.active) continue;

      if (product.hasVariants && item.selectedVariant) {
        // Find the specific variant to check its updated stock
        const variant = product.variants.find(v => v.id === item.selectedVariant?.id);
        if (variant && variant.active) {
          const threshold = variant.inventoryThreshold !== undefined && variant.inventoryThreshold !== null && variant.inventoryThreshold > 0
            ? variant.inventoryThreshold
            : (product.inventoryThreshold !== undefined && product.inventoryThreshold !== null && product.inventoryThreshold > 0
               ? product.inventoryThreshold
               : globalThreshold);

          if (variant.stock <= threshold) {
            const variantInfo = [variant.color, variant.size, variant.material].filter(Boolean).join(' / ');
            const displayName = variantInfo ? `${product.name} (${variantInfo})` : product.name;
            console.log(`[Email Trigger] Low stock alert triggered for variant '${displayName}' (Stock: ${variant.stock}, Threshold: ${threshold})`);
            
            // Create a temporary product object for email placeholder injection
            const mockProduct = {
              ...product,
              name: displayName,
              stock: variant.stock
            };
            await sendTemplatedEmail('admin_low_stock', adminEmail, { product: mockProduct });
          }
        }
      } else {
        // Non-variant check
        const threshold = product.inventoryThreshold !== undefined && product.inventoryThreshold !== null && product.inventoryThreshold > 0
          ? product.inventoryThreshold
          : globalThreshold;

        if (product.stock <= threshold) {
          console.log(`[Email Trigger] Low stock alert triggered for '${product.name}' (Stock: ${product.stock}, Threshold: ${threshold})`);
          await sendTemplatedEmail('admin_low_stock', adminEmail, { product });
        }
      }
    }
  } catch (error) {
    console.error('[Email Trigger] checkLowStock failed:', error);
  }
}

// 10. New product review trigger
export async function onNewReview(review: any, product: any) {
  try {
    const adminEmail = await getAdminEmail();
    if (adminEmail) {
      await sendTemplatedEmail('admin_new_review', adminEmail, { review, product });
    }
  } catch (error) {
    console.error('[Email Trigger] onNewReview failed:', error);
  }
}

// 11. Contact Form Alert trigger
export async function onContactForm(formData: { name: string; email: string; subject: string; message: string }) {
  try {
    const adminEmail = await getAdminEmail();
    if (adminEmail) {
      await sendTemplatedEmail('admin_contact_form', adminEmail, { 
        contact: formData,
        customer: { name: formData.name, email: formData.email } // mock customer context for common layout compatibility
      });
    }
  } catch (error) {
    console.error('[Email Trigger] onContactForm failed:', error);
  }
}
