import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName = '', lastName = '' } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Check if Brevo API key is configured
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const BREVO_LIST_ID = process.env.BREVO_LIST_ID; // Optional: specific list ID

    if (!BREVO_API_KEY) {
      console.error('Brevo API key not configured');
      return NextResponse.json(
        { error: 'Newsletter service not configured' },
        { status: 500 }
      );
    }

    // Prepare contact data for Brevo
    const contactData = {
      email: email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName,
      },
      listIds: BREVO_LIST_ID ? [parseInt(BREVO_LIST_ID)] : undefined,
      updateEnabled: true, // Update contact if already exists
    };

    // Subscribe to Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(contactData),
    });

    const brevoResult = await brevoResponse.json();

    if (!brevoResponse.ok) {
      // Handle specific Brevo errors
      if (brevoResponse.status === 400 && brevoResult.code === 'duplicate_parameter') {
        // Contact already exists - this is okay
        console.log(`Contact already exists: ${email}`);
        return NextResponse.json(
          { 
            message: 'You are already subscribed to our newsletter',
            email 
          },
          { status: 200 }
        );
      }
      
      console.error('Brevo API error:', brevoResult);
      throw new Error(brevoResult.message || 'Failed to subscribe to newsletter');
    }

    console.log(`Successfully subscribed to newsletter: ${email}`);

    return NextResponse.json(
      { 
        message: 'Successfully subscribed to newsletter',
        email 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    return NextResponse.json(
      { error: 'Failed to subscribe to newsletter. Please try again.' },
      { status: 500 }
    );
  }
} 