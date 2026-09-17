import { connectDB } from '@/lib/db';
import User from '@/models/User';
import EmergencyAlert from '@/models/EmergencyAlert';

function getArkeselConfig() {
  return {
    apiKey: process.env.ARKESEL_API_KEY || '',
    senderId: process.env.ARKESEL_SENDER_ID || 'Arkesel',
    apiUrl: 'https://sms.arkesel.com/api/v2/sms/send',
  };
}

/**
 * Format a phone number to standard international E.164 format for Arkesel API v2.
 * Arkesel v2 REST API expects E.164 formatted recipients: e.g. ["+233244000000"].
 * 
 * Handles:
 * - Local Ghana numbers: "0244123456" -> "+233244123456"
 * - Already prefixed Ghana numbers: "233244123456" or "+233244123456" -> "+233244123456"
 * - 9-digit subscriber numbers: "244123456" -> "+233244123456"
 * - International numbers: "+2348012345678" -> "+2348012345678"
 * - Formatted text with spaces/dashes: "+233 24 412 3456" -> "+233244123456"
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';

  const trimmed = phone.trim();
  if (!trimmed) return '';

  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // Local Ghana 10-digit number starting with '0' (e.g. '0241234567')
  if (digits.startsWith('0') && digits.length === 10) {
    return `+233${digits.substring(1)}`;
  }

  // Ghana number starting with '233' (12 digits, e.g. '233241234567')
  if (digits.startsWith('233') && digits.length === 12) {
    return `+${digits}`;
  }

  // Ghana 9-digit number without leading 0 (e.g. '241234567')
  if (digits.length === 9) {
    return `+233${digits}`;
  }

  // If originally had leading '+', preserve '+' and digits
  if (hasLeadingPlus) {
    return `+${digits}`;
  }

  // Default fallback if 10 digits
  if (digits.length === 10) {
    return `+233${digits.substring(1)}`;
  }

  return `+${digits}`;
}

/**
 * Validate that a recipient phone number conforms to the international E.164 standard.
 * Must start with '+' followed by country code and 9 to 14 digits (10 to 15 total digits).
 * Ghana numbers (+233XXXXXXXXX) are exactly 13 characters.
 */
export function isValidE164Number(phone: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}

/**
 * Send a single SMS via Arkesel API v2
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  const { apiKey, senderId, apiUrl } = getArkeselConfig();

  if (!apiKey) {
    const errorMsg = 'Arkesel API key is not configured in environment variables (ARKESEL_API_KEY)';
    console.error(`❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  const formattedNumber = formatPhoneNumber(to);

  if (!isValidE164Number(formattedNumber)) {
    const errorMsg = `Invalid recipient phone number format: "${to}" (formatted: "${formattedNumber}"). Expected international E.164 format (e.g. +233XXXXXXXXX).`;
    console.error(`❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        message: message,
        recipients: [formattedNumber],
      }),
    });

    const data = await response.json();

    if (response.ok && data.code === 'ok') {
      console.log(`✅ SMS sent to ${formattedNumber}`);
      return { success: true, response: data };
    } else {
      const errorMsg = data.message || `Arkesel HTTP ${response.status}: ${JSON.stringify(data)}`;
      console.error(`❌ SMS failed to ${formattedNumber}:`, data);
      return { success: false, response: data, error: errorMsg };
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
  error?: string;
}> {
  const { apiKey, senderId, apiUrl } = getArkeselConfig();

  if (!apiKey) {
    const errorMsg = 'Arkesel API key is not configured in environment variables (ARKESEL_API_KEY)';
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      sentCount: 0,
      failedCount: recipients.length,
      results: recipients.map((r) => ({
        number: r,
        success: false,
        error: errorMsg,
      })),
      error: errorMsg,
    };
  }

  // Format all phone numbers to standard E.164 and validate
  const formattedRecipients = recipients
    .map(formatPhoneNumber)
    .filter(isValidE164Number);

  // Remove duplicates
  const uniqueRecipients = [...new Set(formattedRecipients)];

  if (uniqueRecipients.length === 0) {
    const errorMsg = 'No valid recipient phone numbers provided. Expected E.164 format (e.g. +233XXXXXXXXX).';
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      sentCount: 0,
      failedCount: recipients.length,
      results: recipients.map((r) => ({
        number: r,
        success: false,
        error: errorMsg,
      })),
      error: errorMsg,
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
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
      const errorMsg = data.message || `Arkesel HTTP ${response.status}: ${JSON.stringify(data)}`;
      console.error(`❌ Bulk SMS failed from Arkesel:`, data);
      return {
        success: false,
        sentCount: 0,
        failedCount: uniqueRecipients.length,
        results: uniqueRecipients.map((r) => ({
          number: r,
          success: false,
          error: errorMsg,
        })),
        arkeselResponse: data,
        error: errorMsg,
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
      error: error.message,
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
    const allPhoneNumbers: string[] = [];

    if (user.phoneNumber && typeof user.phoneNumber === 'string' && user.phoneNumber.trim()) {
      allPhoneNumbers.push(user.phoneNumber.trim());
    }

    if (user.emergencyContacts && Array.isArray(user.emergencyContacts)) {
      user.emergencyContacts.forEach((contact: any) => {
        if (contact && contact.phoneNumber && typeof contact.phoneNumber === 'string' && contact.phoneNumber.trim()) {
          allPhoneNumbers.push(contact.phoneNumber.trim());
        }
      });
    }

    // Format and validate all phone numbers according to Arkesel international E.164 standard
    const validRecipients = [
      ...new Set(
        allPhoneNumbers
          .map(formatPhoneNumber)
          .filter(isValidE164Number)
      ),
    ];

    if (validRecipients.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        error: 'No valid phone numbers found for this user or emergency contacts. Expected international E.164 format (e.g. +233XXXXXXXXX).',
      };
    }

    const severityText = user.medicalNotes?.asthmaSeverity ? `\nSeverity level: ${user.medicalNotes.asthmaSeverity}.` : '';
    const message =
      customMessage ||
      `🚨 EMERGENCY ALERT from AsthmaGuard:\n${user.fullName} may be experiencing an asthma emergency.${severityText}\nDevice: ${deviceId}\nPlease check on them immediately or call emergency services.`;

    // Send SMS to all valid recipients
    const smsResult = await sendBulkSMS(validRecipients, message);

    // Determine overall status
    let status: 'sent' | 'failed' | 'partial';
    if (smsResult.sentCount === validRecipients.length) {
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
      recipients: validRecipients,
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


