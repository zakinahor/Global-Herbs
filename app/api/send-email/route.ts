import { sendCustomerInquiryNotification } from '../../../lib/email/orderNotification';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message, type, productReference, orderReference } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return Response.json(
        { success: false, error: 'A valid client email is required.' },
        { status: 400 }
      );
    }

    const cleanName = (name || 'Valued Client').trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanSubject = (subject || 'Inquiry - Global Herbs Inc').trim();
    const cleanMessage = (message || '').trim();
    const inquiryType =
      type === 'welcome' || cleanSubject.toLowerCase().includes('account')
        ? 'Dispensary Account Registration Request'
        : type === 'sample_request' || cleanSubject.toLowerCase().includes('sample')
        ? 'Product Sample Pack Request'
        : 'Customer Support / Product Inquiry';

    const notificationResult = await sendCustomerInquiryNotification({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      type: inquiryType,
      productReference,
      orderReference,
    });

    return Response.json({
      success: true,
      message: `Your request has been received and dispatched to our admin desk! We will follow up directly at ${cleanEmail}.`,
      notification: notificationResult,
    });
  } catch (err: any) {
    console.error('[Inquiry API Error]', err);
    return Response.json(
      {
        success: false,
        error: 'An error occurred while processing your inquiry. Please try again.',
      },
      { status: 500 }
    );
  }
}
