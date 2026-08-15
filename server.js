const express = require("express");
const cors = require("cors");

const app = express();

// =====================================================
// SETTINGS
// =====================================================

const PORT = process.env.PORT || 10000;

// IntaSend API
const INTASEND_SECRET_KEY = process.env.INTASEND_SECRET_KEY;

// Set INTASEND_LIVE=true on Render for live payments.
// Leave it false for sandbox/testing.
const INTASEND_LIVE =
    String(process.env.INTASEND_LIVE).toLowerCase() === "true";

const INTASEND_API_URL = INTASEND_LIVE
    ? "https://api.intasend.com"
    : "https://sandbox.intasend.com";

// =====================================================
// MIDDLEWARE
// =====================================================

// Allow your website to communicate with this backend.
app.use(
    cors({
        origin: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Accept",
            "Authorization"
        ]
    })
);

app.use(express.json());

// =====================================================
// HOME / HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Ask a Friend payment server is online."
    });
});

// =====================================================
// PAYMENT ENDPOINT
// =====================================================

app.post("/api/payment", async (req, res) => {
    try {
        console.log("----------------------------------------");
        console.log("Payment request received");
        console.log("----------------------------------------");

        const {
            firstName,
            phone,
            amount,
            reason
        } = req.body;

        // -------------------------------------------------
        // CHECK INTASEND KEY
        // -------------------------------------------------

        if (!INTASEND_SECRET_KEY) {
            console.error(
                "INTASEND_SECRET_KEY is missing."
            );

            return res.status(500).json({
                success: false,
                message:
                    "Payment server is not configured. Add INTASEND_SECRET_KEY to Render environment variables."
            });
        }

        // -------------------------------------------------
        // VALIDATE NAME
        // -------------------------------------------------

        if (
            !firstName ||
            typeof firstName !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide your name."
            });
        }

        const cleanFirstName =
            firstName.trim();

        if (!cleanFirstName) {
            return res.status(400).json({
                success: false,
                message: "Please provide your name."
            });
        }

        // -------------------------------------------------
        // VALIDATE PHONE
        // -------------------------------------------------

        if (
            !phone ||
            typeof phone !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide the M-Pesa phone number."
            });
        }

        let cleanPhone =
            phone.trim().replace(/\s+/g, "");

        // Accept:
        // 0712345678
        // 254712345678
        // +254712345678

        if (cleanPhone.startsWith("+254")) {
            cleanPhone =
                cleanPhone.substring(1);
        }

        if (cleanPhone.startsWith("07")) {
            cleanPhone =
                "254" + cleanPhone.substring(1);
        }

        if (!/^2547\d{8}$/.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message:
                    "Enter a valid Kenyan M-Pesa number."
            });
        }

        // -------------------------------------------------
        // VALIDATE AMOUNT
        // -------------------------------------------------

        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount < 10
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Enter an amount of at least KSh 10."
            });
        }

        if (numericAmount > 150000) {
            return res.status(400).json({
                success: false,
                message:
                    "The maximum amount is KSh 150,000."
            });
        }

        // -------------------------------------------------
        // VALIDATE REASON
        // -------------------------------------------------

        if (
            !reason ||
            typeof reason !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide the reason for the payment."
            });
        }

        const cleanReason =
            reason.trim();

        if (!cleanReason) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide the reason for the payment."
            });
        }

        // -------------------------------------------------
        // CREATE PAYMENT REFERENCE
        // -------------------------------------------------

        const apiRef =
            `ASKFRIEND-${Date.now()}`;

        console.log("Name:", cleanFirstName);
        console.log("Phone:", cleanPhone);
        console.log("Amount:", numericAmount);
        console.log("Reason:", cleanReason);
        console.log("Reference:", apiRef);
        console.log(
            "Environment:",
            INTASEND_LIVE
                ? "LIVE"
                : "SANDBOX"
        );

        // -------------------------------------------------
        // INTASEND STK PUSH
        // -------------------------------------------------

        const intasendResponse =
            await fetch(
                INTASEND_API_URL +
                    "/api/v1/payment/mpesa-stk-push/",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${INTASEND_SECRET_KEY}`
                    },

                    body: JSON.stringify({
                        amount:
                            numericAmount,

                        phone_number:
                            cleanPhone,

                        api_ref:
                            apiRef,

                        mobile_tarrif:
                            "BUSINESS-PAYS"
                    })
                }
            );

        // -------------------------------------------------
        // READ INTASEND RESPONSE
        // -------------------------------------------------

        const responseText =
            await intasendResponse.text();

        console.log(
            "IntaSend HTTP status:",
            intasendResponse.status
        );

        console.log(
            "IntaSend response:",
            responseText
        );

        let intasendData = {};

        try {
            intasendData =
                JSON.parse(responseText);
        } catch {
            intasendData = {
                message: responseText
            };
        }

        // -------------------------------------------------
        // INTASEND ERROR
        // -------------------------------------------------

        if (!intasendResponse.ok) {
            console.error(
                "IntaSend payment failed:",
                intasendData
            );

            return res.status(
                intasendResponse.status
            ).json({
                success: false,

                message:
                    intasendData.message ||
                    intasendData.detail ||
                    intasendData.error ||
                    "IntaSend rejected the payment request.",

                intasend: intasendData
            });
        }

        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

        console.log(
            "STK Push request accepted by IntaSend."
        );

        return res.json({
            success: true,

            message:
                "Payment request sent. Check the M-Pesa phone for the payment prompt.",

            reference: apiRef,

            intasend: intasendData
        });

    } catch (error) {
        console.error(
            "PAYMENT SERVER ERROR:"
        );

        console.error(error);

        return res.status(500).json({
            success: false,

            message:
                "Payment server error: " +
                (error.message ||
                    "Unknown error.")
        });
    }
});

// =====================================================
// 404
// =====================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found."
    });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Ask a Friend server running on port ${PORT}`
        );

        console.log(
            `IntaSend mode: ${
                INTASEND_LIVE
                    ? "LIVE"
                    : "SANDBOX"
            }`
        );
    }
);
