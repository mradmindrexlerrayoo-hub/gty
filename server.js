require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
    origin: "https://mradmindrexlerrayoo-hub.github.io"
}));

app.use(express.json());

const {
    DARAJA_CONSUMER_KEY,
    DARAJA_CONSUMER_SECRET,
    DARAJA_SHORTCODE,
    DARAJA_PASSKEY,
    DARAJA_CALLBACK_URL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
} = process.env;

const DARAJA_BASE_URL = "https://sandbox.safaricom.co.ke";

const SUPABASE_TABLE_URL =
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/payments`;

// Check required environment variables
const requiredVariables = [
    "DARAJA_CONSUMER_KEY",
    "DARAJA_CONSUMER_SECRET",
    "DARAJA_SHORTCODE",
    "DARAJA_PASSKEY",
    "DARAJA_CALLBACK_URL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
];

for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        console.error(`Missing environment variable: ${variable}`);
    }
}

// Supabase headers
function supabaseHeaders(extra = {}) {
    return {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        ...extra
    };
}

// Save payment to Supabase
async function savePayment(payment) {
    const response = await fetch(SUPABASE_TABLE_URL, {
        method: "POST",
        headers: supabaseHeaders({
            Prefer: "return=representation"
        }),
        body: JSON.stringify(payment)
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Supabase insert error:", data);
        throw new Error("Could not save payment.");
    }

    return data[0];
}

// Update payment in Supabase
async function updatePayment(reference, updates) {
    const response = await fetch(
        `${SUPABASE_TABLE_URL}?reference=eq.${encodeURIComponent(reference)}`,
        {
            method: "PATCH",
            headers: supabaseHeaders({
                Prefer: "return=representation"
            }),
            body: JSON.stringify({
                ...updates,
                updated_at: new Date().toISOString()
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Supabase update error:", data);
        throw new Error("Could not update payment.");
    }

    return data;
}

// Find payment by reference
async function findPayment(reference) {
    const response = await fetch(
        `${SUPABASE_TABLE_URL}?reference=eq.${encodeURIComponent(reference)}&select=*`,
        {
            method: "GET",
            headers: supabaseHeaders()
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Supabase lookup error:", data);
        throw new Error("Could not retrieve payment.");
    }

    return data[0] || null;
}

// Find payment by CheckoutRequestID
async function findPaymentByCheckoutId(checkoutId) {
    const response = await fetch(
        `${SUPABASE_TABLE_URL}?checkout_request_id=eq.${encodeURIComponent(checkoutId)}&select=*`,
        {
            method: "GET",
            headers: supabaseHeaders()
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Supabase lookup error:", data);
        throw new Error("Could not retrieve payment.");
    }

    return data[0] || null;
}

// Normalize Kenyan phone numbers
function normalizePhone(phone) {
    let number = String(phone).replace(/\D/g, "");

    if (number.startsWith("0")) {
        number = "254" + number.substring(1);
    } else if (number.startsWith("7") || number.startsWith("1")) {
        number = "254" + number;
    }

    if (!/^254[71]\d{8}$/.test(number)) {
        throw new Error("Enter a valid Kenyan M-Pesa phone number.");
    }

    return number;
}

// Generate Daraja timestamp
function getTimestamp() {
    const date = new Date();

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);

    const values = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    }

    return (
        values.year +
        values.month +
        values.day +
        values.hour +
        values.minute +
        values.second
    );
}

// Get Daraja OAuth access token
async function getAccessToken() {
    const credentials = Buffer.from(
        `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`
    ).toString("base64");

    const response = await fetch(
        `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
            method: "GET",
            headers: {
                Authorization: `Basic ${credentials}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
        console.error("Daraja OAuth error:", data);
        throw new Error("Could not authenticate with M-Pesa.");
    }

    return data.access_token;
}

// Generate STK Push password
function generatePassword(timestamp) {
    return Buffer.from(
        `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`
    ).toString("base64");
}

// Initiate Daraja STK Push
async function initiateSTKPush(phone, amount, reference) {
    const token = await getAccessToken();
    const timestamp = getTimestamp();

    const payload = {
        BusinessShortCode: DARAJA_SHORTCODE,
        Password: generatePassword(timestamp),
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: phone,
        PartyB: DARAJA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: DARAJA_CALLBACK_URL,
        AccountReference: reference.substring(0, 12),
        TransactionDesc: "GTY Payment"
    };

    const response = await fetch(
        `${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }
    );

    const data = await response.json();

    if (!response.ok || data.ResponseCode !== "0") {
        console.error("STK Push error:", data);
        throw new Error(
            data.errorMessage ||
            data.ResponseDescription ||
            "M-Pesa STK Push failed."
        );
    }

    return data;
}

// Query STK transaction status with Daraja
async function querySTKStatus(checkoutRequestId) {
    const token = await getAccessToken();
    const timestamp = getTimestamp();

    const payload = {
        BusinessShortCode: DARAJA_SHORTCODE,
        Password: generatePassword(timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
    };

    const response = await fetch(
        `${DARAJA_BASE_URL}/mpesa/stkpushquery/v1/query`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }
    );

    return await response.json();
}

// Health check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "GTY Payment API is running."
    });
});

// API check
app.get("/api/payment", (req, res) => {
    res.json({
        success: true,
        message: "GTY Daraja M-Pesa API is ready."
    });
});

// Initiate payment
app.post("/api/payment", async (req, res) => {
    let reference;

    try {
        const { firstName, phone, amount, reason } = req.body;

        if (!firstName || !phone || !amount || !reason) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields."
            });
        }

        const paymentAmount = Number(amount);

        if (
            !Number.isFinite(paymentAmount) ||
            paymentAmount < 10 ||
            paymentAmount > 150000
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be between KES 10 and KES 150,000."
            });
        }

        const normalizedPhone = normalizePhone(phone);

        reference =
            "GTY-" + crypto.randomBytes(12).toString("hex").toUpperCase();

        // Save pending payment before sending STK Push
        await savePayment({
            reference,
            first_name: String(firstName).trim(),
            phone: normalizedPhone,
            amount: paymentAmount,
            reason: String(reason).trim(),
            status: "PENDING"
        });

        const stkResponse = await initiateSTKPush(
            normalizedPhone,
            paymentAmount,
            reference
        );

        await updatePayment(reference, {
            checkout_request_id: stkResponse.CheckoutRequestID,
            merchant_request_id: stkResponse.MerchantRequestID
        });

        return res.json({
            success: true,
            message: stkResponse.CustomerMessage ||
                "STK Push sent. Check your phone and enter your M-Pesa PIN.",
            reference,
            checkoutRequestId: stkResponse.CheckoutRequestID
        });

    } catch (error) {
        console.error("Payment initiation error:", error);

        if (reference) {
            try {
                await updatePayment(reference, {
                    status: "FAILED"
                });
            } catch (updateError) {
                console.error("Could not mark payment failed:", updateError);
            }
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Payment could not be started."
        });
    }
});

// Safaricom Daraja callback
app.post("/api/mpesa/callback", async (req, res) => {
    // Respond promptly to Safaricom
    res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted"
    });

    try {
        const callback = req.body?.Body?.stkCallback;

        if (!callback) {
            console.error("Invalid M-Pesa callback received.");
            return;
        }

        const checkoutId = callback.CheckoutRequestID;
        const resultCode = Number(callback.ResultCode);

        const payment = await findPaymentByCheckoutId(checkoutId);

        if (!payment) {
            console.error("No payment found for checkout:", checkoutId);
            return;
        }

        // Ignore duplicate callbacks for completed payments
        if (payment.status === "PAID" || payment.status === "FAILED") {
            return;
        }

        if (resultCode !== 0) {
            await updatePayment(payment.reference, {
                status: "FAILED"
            });

            console.log("M-Pesa payment failed:", callback.ResultDesc);
            return;
        }

        const items =
            callback.CallbackMetadata?.Item || [];

        const metadata = {};

        for (const item of items) {
            metadata[item.Name] = item.Value;
        }

        const receipt = metadata.MpesaReceiptNumber;
        const paidAmount = Number(metadata.Amount);
        const paidPhone = String(metadata.PhoneNumber || "");

        // Check callback details against the saved payment
        if (
            !receipt ||
            paidAmount !== Number(payment.amount) ||
            paidPhone !== payment.phone
        ) {
            console.error("Callback details did not match payment:", checkoutId);
            return;
        }

        // Ask Daraja to confirm the STK transaction
        const queryResult = await querySTKStatus(checkoutId);

        if (
            String(queryResult.ResultCode) !== "0"
        ) {
            console.error("STK query has not confirmed payment:", queryResult);
            return;
        }

        await updatePayment(payment.reference, {
            status: "PAID",
            mpesa_receipt_number: receipt
        });

        console.log(
            "Payment confirmed:",
            payment.reference,
            receipt
        );

    } catch (error) {
        console.error("M-Pesa callback processing error:", error);
    }
});

// Check payment status
app.get("/api/payment/status/:reference", async (req, res) => {
    try {
        const reference = req.params.reference;

        const payment = await findPayment(reference);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found."
            });
        }

        return res.json({
            success: true,
            reference: payment.reference,
            status: payment.status,
            receipt: payment.status === "PAID"
                ? payment.mpesa_receipt_number
                : null
        });

    } catch (error) {
        console.error("Payment status error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not check payment status."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`GTY Payment API running on port ${PORT}`);
});
