import type { Handler } from 'aws-lambda';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import QRCode from 'qrcode';
import { TABLE_NAME, keys } from '@event-tickets/shared-types';

const sesClient = new SESv2Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const FROM_EMAIL = process.env['FROM_EMAIL'] || '';

interface EmailEvent {
  type: 'TICKET_CONFIRMATION' | 'COMP_TICKET';
  ticketId: string;
  eventId: string;
  userId?: string;
  qrToken: string;
  email: string;
  userName?: string;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
}

export const handler: Handler<EmailEvent> = async (event) => {
  if (!FROM_EMAIL) {
    console.log('Email not configured, skipping');
    return;
  }

  try {
    let eventName = event.eventName || '';
    let eventDate = event.eventDate || '';
    let eventLocation = event.eventLocation || '';

    // If we don't have event details, fetch them
    if (!eventName) {
      const eventResult = await dynamoClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: keys.event.pk(event.eventId), SK: keys.event.sk() },
      }));
      if (eventResult.Item) {
        eventName = eventResult.Item['name'] as string;
        eventDate = eventResult.Item['date'] as string;
        eventLocation = eventResult.Item['location'] as string;
      }
    }

    // Generate QR code as base64 PNG
    const qrBuffer = await QRCode.toBuffer(event.qrToken, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    const qrBase64 = qrBuffer.toString('base64');

    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const isComp = event.type === 'COMP_TICKET';
    const subject = isComp
      ? `Complimentary Ticket: ${eventName}`
      : `Ticket Confirmation: ${eventName}`;

    const boundary = `boundary_${Date.now()}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px; background: #1e3a5f; color: white; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">First Baptist Church of Pittsfield</h1>
    <p style="margin: 5px 0 0;">Event Tickets</p>
  </div>
  
  <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <h2>${isComp ? 'Complimentary Ticket' : 'Ticket Confirmed!'}</h2>
    ${event.userName ? `<p>Hello ${event.userName},</p>` : ''}
    <p>${isComp ? 'You have received a complimentary ticket for the following event:' : 'Your ticket has been confirmed for the following event:'}</p>
    
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <h3 style="margin: 0 0 10px;">${eventName}</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin: 5px 0;"><strong>Location:</strong> ${eventLocation}</p>
      <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${event.ticketId}</p>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <p><strong>Your QR Code:</strong></p>
      <img src="cid:qrcode" alt="QR Code" style="width: 250px; height: 250px;" />
      <p style="color: #6b7280; font-size: 14px;">Present this QR code at the door for entry.</p>
    </div>
  </div>
  
  <div style="text-align: center; padding: 15px; color: #6b7280; font-size: 12px;">
    <p>First Baptist Church of Pittsfield, MA</p>
  </div>
</body>
</html>`;

    // Build MIME message with inline QR image
    const rawMessage = [
      `From: Event Tickets <${FROM_EMAIL}>`,
      `To: ${event.email}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/related; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlBody,
      '',
      `--${boundary}`,
      'Content-Type: image/png',
      'Content-Transfer-Encoding: base64',
      'Content-ID: <qrcode>',
      'Content-Disposition: inline; filename="qrcode.png"',
      '',
      qrBase64,
      '',
      `--${boundary}--`,
    ].join('\r\n');

    await sesClient.send(new SendEmailCommand({
      Content: {
        Raw: {
          Data: Buffer.from(rawMessage),
        },
      },
    }));

    console.log(`Email sent to ${event.email} for ticket ${event.ticketId}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};
