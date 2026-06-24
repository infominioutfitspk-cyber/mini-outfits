import { getEmailTemplate } from '@/lib/services/emailTemplates';
import { getSettings } from '@/lib/services/settings';
import { buildVariables, replaceVariables, renderOrderItemsTable } from './variables';
import { getDefaultTemplate } from './defaults/getDefaultTemplate';
import { sendEmail } from './sendEmail';

export async function sendTemplatedEmail(
  emailType: string,
  to: string,
  data: Record<string, any>
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    // 1. Fetch template from database
    const template = await getEmailTemplate(emailType);
    if (!template) {
      console.error(`[Email] Template for type '${emailType}' not found in database.`);
      return { success: false, error: `Template not found: ${emailType}` };
    }

    // 2. Retrieve settings to inject into variables and verify toggle
    const settings = await getSettings();
    const isEnabledInSettings = settings.email_notifications
      ? settings.email_notifications[emailType] !== false
      : true;

    if (!template.enabled || !isEnabledInSettings) {
      console.log(`[Email] Notification type '${emailType}' is disabled (template: ${template.enabled}, settings: ${isEnabledInSettings}). Skipping.`);
      return { success: false, skipped: true };
    }

    const mergedData = { ...data, settings };

    // 4. Build variable mappings
    const variables = await buildVariables(emailType, mergedData);

    // 5. Pre-render order items table if items are present
    if (data.order?.items) {
      variables.order_items_html = renderOrderItemsTable(data.order.items, settings.currencySymbol);
    }

    // 6. Resolve Subject Line
    const subject = replaceVariables(template.subject, variables);

    // 7. Resolve HTML Body (custom vs default fallback)
    let html: string;
    if (template.customHtml) {
      html = replaceVariables(template.customHtml, variables);
    } else {
      html = getDefaultTemplate(emailType, variables);
    }

    // 8. Dispatch via core sender
    return await sendEmail({ to, subject, html });
  } catch (error: any) {
    console.error(`[Email] sendTemplatedEmail failed for '${emailType}':`, error);
    return { success: false, error: error.message || 'Templated send failed' };
  }
}
