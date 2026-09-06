const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

exports.sendOTP = async (phone, otp) => {
    // If no credentials are found, fallback to console log (Development)
    if (!client) {
        console.log(`[WARNING] TWILIO: Credentials missing. Mocking SMS to ${phone}. OTP: ${otp}`);
        return { success: true, mocked: true };
    }

    try {
        console.log(`📤 Sending OTP via Twilio to ${phone}...`);

        // Ensure phone number has country code if missing (Basic heuristic for India/US)
        // Standardize: Twilio requires E.164 (+1234567890)
        let formattedPhone = phone;
        if (!formattedPhone.startsWith('+')) {
            // Assume India (+91) if 10 digits, or US (+1) if 10 digits? 
            // Better to default to India given the context (LabReportTracker usually implies local use). 
            // Or just prepend +91 for now if length is 10.
            if (formattedPhone.length === 10) formattedPhone = '+91' + formattedPhone;
        }

        const message = await client.messages.create({
            body: `Your HealthNexus verification code is: ${otp}. Do not share this code with anyone.`,
            from: fromPhone,
            to: formattedPhone
        });

        console.log(`[SUCCESS] SMS Sent via Twilio. SID: ${message.sid}`);
        return { success: true, sid: message.sid };

    } catch (error) {
        console.error("[ERROR] Twilio Error:", error.message);
        // Don't crash the app, just return failure so frontend can handle it or fallback
        return { success: false, error: error.message };
    }
};
