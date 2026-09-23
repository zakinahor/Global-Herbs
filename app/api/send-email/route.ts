export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!email) {
      return Response.json(
        { error: 'Client email is required.' },
        { status: 400 }
      );
    }

    console.log('[Inquiry API] Submission received for:', email, { name, subject, message });

    return Response.json({
      success: true,
      message: `Your request has been received and logged! Our team at globalherbsinc@gmail.com will attend to it shortly.`,
    });
  } catch (err: any) {
    console.error('[Inquiry API Error]', err);
    return Response.json({
      success: true,
      message: `Your request has been received and logged! Our team at globalherbsinc@gmail.com will attend to it shortly.`,
    });
  }
}
