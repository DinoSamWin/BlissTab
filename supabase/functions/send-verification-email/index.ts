import { Resend } from "npm:resend";
import admin from "npm:firebase-admin";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, displayName, lang = 'en' } = await req.json();

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: Deno.env.get("FIREBASE_PROJECT_ID"),
          clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL"),
          privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, '\n'),
        }),
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const continueUrl = Deno.env.get("APP_URL") || "http://localhost:3000/auth/action"; 
    const link = await admin.auth().generateEmailVerificationLink(email, { url: continueUrl, handleCodeInApp: true });
    const urlObj = new URL(link);
    const customVerifyLink = `${continueUrl}?mode=verifyEmail&oobCode=${urlObj.searchParams.get('oobCode')}`;

    const isZh = lang === 'zh';
    const subject = isZh ? '✦ 激活您的 StartlyTab 账户' : 'One last step, then you’re in';
    const logoUrl = "https://www.startlytab.com/icons/icon-512x512.png";

    // Premium Adobe-inspired Template with robust button rendering
    const html = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${subject}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 40px 20px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; border-collapse: collapse;">
                <!-- Header -->
                <tr>
                  <td align="left" style="padding: 0 0 32px 0;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle">
                          <img src="${logoUrl}" alt="Logo" width="36" height="36" style="display: block; border-radius: 8px;" />
                        </td>
                        <td valign="middle" style="padding-left: 12px; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
                          StartlyTab
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 26px; padding-bottom: 32px;">
                    <p style="margin: 0 0 20px 0; font-weight: 600;">Hi,</p>
                    <p style="margin: 0 0 20px 0;">StartlyTab is designed to give you a small mental buffer when work feels heavy— quiet, simple, and never pushy.</p>
                    <p style="margin: 0 0 40px 0;">To finish signing up and sync your emotional workspace, please confirm your email below:</p>
                    
                    <!-- Robust Black Button -->
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="border-radius: 6px;" bgcolor="#000000">
                          <a href="${customVerifyLink}" target="_blank" style="font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block; background-color: #000000; border: 1px solid #000000; -webkit-text-fill-color: #ffffff;">Confirm my email</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 24px; padding-bottom: 48px;">
                     — StartlyTab
                  </td>
                </tr>

                <!-- Gray Footer Section -->
                <tr>
                  <td style="background-color: #f4f4f5; padding: 32px; border-radius: 12px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #4b5563; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 20px; padding-bottom: 24px;">
                          If you have any questions or need a mental reset, we're here for you.
                        </td>
                      </tr>
                      <tr>
                        <td align="left">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td>
                                <a href="mailto:support@startlytab.com" style="background-color: #ffffff; border: 1px solid #e5e7eb; color: #1a1a1a !important; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">Contact Support</a>
                              </td>
                              <td style="padding-left: 12px;">
                                <a href="https://startlytab.featurebase.app/" target="_blank" style="background-color: #ffffff; border: 1px solid #e5e7eb; color: #1a1a1a !important; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">Provide Feedback</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 32px 0; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px;">
                    © ${new Date().getFullYear()} StartlyTab. Building a calmer internet.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'StartlyTab <no-reply@startlytab.com>',
      to: [email],
      subject: subject,
      html: html,
    });

    if (result.error) throw result.error;
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
