/**
 * A very thin wrapper for sending WhatsApp messages.  The implementation here
 * is intentionally generic -- we don't assume a specific provider so that the
 * rest of the notification service can stay provider‑agnostic.  You can wire
 * it up to Twilio, MessageBird, or any other service by editing this file.
 *
 * For now the function simply logs and resolves immediately so the codebase
 * remains functional without third‑party dependencies.
 */
export async function sendWhatsapp(to: string, message: string): Promise<void> {
  // example stub; replace with a real API call
  console.log(`[notification] sending whatsapp to ${to}: ${message}`);
  // if you want to use Twilio, uncomment and install the SDK:
  //    npm install twilio
  // import Twilio from 'twilio';
  // const client = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  // await client.messages.create({
  //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
  //   to: `whatsapp:${to}`,
  //   body: message,
  // });
}
