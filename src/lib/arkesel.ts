import { connectDB } from '@/lib/db';
import User from '@/models/User';
import EmergencyAlert from '@/models/EmergencyAlert';

const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY || '';
const ARKESEL_SENDER_ID = process.env.ARKESEL_SENDER_ID || 'AsthmaGrd';
const ARKESEL_API_URL = 'https://sms.arkesel.com/api/v2/sms/send';

/**
 * Format a phone number to international format for Arkesel (Ghana-focused)
 * Arkesel expects numbers like 233XXXXXXXXX
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // If it starts with '0', assume Ghana local number — replace leading 0 with 233
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '233' + digits.substring(1);
  }

  // If it starts with '+', the plus was already stripped by replace above
  // If it already starts with '233', keep as is
  // If it doesn't start with '233' and isn't 12 digits, prepend '233'
  if (!digits.startsWith('233') && digits.length <= 10) {
    digits = '233' + digits;
  }

  return digits;
}

/**
 * Send a single SMS via Arkesel API v2
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  if (!ARKESEL_API_KEY) {
    console.error('❌ ARKESEL_API_KEY is not configured');
    return { success: false, error: 'Arkesel API key not configured' };
  }

  const formattedNumber = formatPhoneNumber(to);

  try {
    const response = await fetch(ARKESEL_API_URL, {
      method: 'POST',
      headers: {
        'api-key': ARKESEL_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: ARKESEL_SENDER_ID,
        message: message,
        recipients: [formattedNumber],
      }),
    });

    const data = await response.json();

    if (response.ok && data.code === 'ok') {
      console.log(`✅ SMS sent to ${formattedNumber}`);
      return { success: true, response: data };
    } else {
      console.error(`❌ SMS failed to ${formattedNumber}:`, data);
      return { success: false, response: data, error: data.message || 'SMS send failed' };
    }
  } catch (error: any) {
    console.error(`❌ SMS error to ${formattedNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS to multiple recipients via Arkesel API v2
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string
): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  results: Array<{ number: string; success: boolean; error?: string }>;
  arkeselResponse?: any;
}> {
  if (!ARKESEL_API_KEY) {
    console.error('❌ ARKESEL_API_KEY is not configured');
    return {
      success: false,
      sentCount: 0,
      failedCount: recipients.length,
      results: recipients.map((r) => ({
        number: r,
        success: false,
        error: 'API key not configured',
      })),
    };
  }

  // Format all phone numbers
  const formattedRecipients = recipients.map(formatPhoneNumber);

  // Remove duplicates
  const uniqueRecipients = [...new Set(formattedRecipients)];

  try {
    const response = await fetch(ARKESEL_API_URL, {
      method: 'POST',
      headers: {
        'api-key': ARKESEL_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: ARKESEL_SENDER_ID,
        message: message,
        recipients: uniqueRecipients,
      }),
    });

    const data = await response.json();

    if (response.ok && data.code === 'ok') {
      console.log(`✅ Bulk SMS sent to ${uniqueRecipients.length} recipients`);
      return {
        success: true,
        sentCount: uniqueRecipients.length,
        failedCount: 0,
        results: uniqueRecipients.map((r) => ({ number: r, success: true })),
        arkeselResponse: data,
      };
    } else {
      console.error('❌ Bulk SMS failed:', data);
      return {
        success: false,
        sentCount: 0,
        failedCount: uniqueRecipients.length,
        results: uniqueRecipients.map((r) => ({
          number: r,
          success: false,
          error: data.message || 'Send failed',
        })),
        arkeselResponse: data,
      };
    }
  } catch (error: any) {
    console.error('❌ Bulk SMS error:', error.message);
    return {
      success: false,
      sentCount: 0,
      failedCount: uniqueRecipients.length,
      results: uniqueRecipients.map((r) => ({
        number: r,
        success: false,
        error: error.message,
      })),
    };
  }
}

/**
 * Send emergency alert SMS to a user and all their emergency contacts.
 * Looks up the user, collects all phone numbers, sends bulk SMS, and logs the alert.
 */
export async function sendEmergencyAlert(
  userId: string,
  deviceId: string,
  sensorData?: Record<string, any>,
  customMessage?: string
): Promise<{
  success: boolean;
  alertId?: string;
  sentCount: number;
  failedCount: number;
  error?: string;
}> {
  try {
    // Connect to database
    await connectDB();

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return { success: false, sentCount: 0, failedCount: 0, error: 'User not found' };
    }

    // Collect all phone numbers: user's own + emergency contacts
    const allPhoneNumbers: string[] = [user.phoneNumber];

    if (user.emergencyContacts && user.emergencyContacts.length > 0) {
      user.emergencyContacts.forEach((contact) => {
        if (contact.phoneNumber) {
          allPhoneNumbers.push(contact.phoneNumber);
        }
      });
    }

    const severityText = user.medicalNotes?.asthmaSeverity ? `\nSeverity level: ${user.medicalNotes.asthmaSeverity}.` : '';
    const message =
      customMessage ||
      `🚨 EMERGENCY ALERT from AsthmaGuard:\n${user.fullName} may be experiencing an asthma emergency.${severityText}\nDevice: ${deviceId}\nPlease check on them immediately or call emergency services.`;

    // Send SMS to all recipients
    const smsResult = await sendBulkSMS(allPhoneNumbers, message);

    // Determine overall status
    let status: 'sent' | 'failed' | 'partial';
    if (smsResult.sentCount === allPhoneNumbers.length) {
      status = 'sent';
    } else if (smsResult.sentCount === 0) {
      status = 'failed';
    } else {
      status = 'partial';
    }

    // Log the emergency alert in the database
    const alert = new EmergencyAlert({
      userId,
      deviceId: deviceId.toUpperCase(),
      recipients: allPhoneNumbers.map(formatPhoneNumber),
      message,
      status,
      sensorData: sensorData || null,
      arkeselResponse: smsResult.arkeselResponse || null,
    });

    await alert.save();

    console.log(`🚨 Emergency alert logged: ${alert._id} — Status: ${status}`);

    return {
      success: status !== 'failed',
      alertId: alert._id.toString(),
      sentCount: smsResult.sentCount,
      failedCount: smsResult.failedCount,
    };
  } catch (error: any) {
    console.error('❌ Emergency alert error:', error.message);
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      error: error.message,
    };
  }
}

// Made with Bob

