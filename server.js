const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;
const INTASEND_SECRET_KEY = process.env.INTASEND_SECRET_KEY;

const INTASEND_LIVE =
    String(process.env.INTASEND_LIVE).toLowerCase() === "true";

const INTASEND_API_URL = INTASEND_LIVE
    ? "https://api.intasend.com"
    : "https://sandbox.intasend.com";

// =====================================================
// CORS
// =====================================================

const corsOptions = {
    origin: "https://mradmindrexlerrayoo-hub.github.io",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle browser preflight requests
app.options("*", cors(corsOptions));

// Parse JSON
app.use(express.json());

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Ask a Friend payment server is online."
    });
});

// =====================================================
// API CONNECTION TEST
// =====================================================

app.get("/api/payment", (req, res) => {
    res.json({
        success: true,
        message: "Payment API is reachable."
    });
});

// =====================================================
// PAYMENT
// =====================================================

app.post("/api/payment", async (req, res) => {
    try {
        console.log("================================");
        console.log("PAYMENT REQUEST RECEIVED");
        console.log("================================");

        const {
            firstName,
            phone,
            amount,
            reason
        } = req.body;

        // ---------------------------------------------
        // CHECK INTASEND KEY
        // ---------------------------------------------

        if (!INTASEND_SECRET_KEY) {
            console.error("INTASEND_SECRET_KEY is missing.");

            return res.status(500).json({
                success: false,
                message: "Payment service is not configured on the server."
            });
        }

        // ---------------------------------------------
        // NAME
        // ---------------------------------------------

        if (
            !firstName ||
            typeof firstName !== "string" ||
            !firstName.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter your name."
            });
        }

        // ---------------------------------------------
        // PHONE
        // ---------------------------------------------

        if (!phone || typeof phone !== "string") {
            return res.status(400).json({
                success: false,
                message: "Please enter the M-Pesa phone number."
            });
        }

        let cleanPhone = phone.trim().replace(/\s+/g, "");

        if (cleanPhone.startsWith("+254")) {
            cleanPhone = cleanPhone.substring(1);
        }

        if (cleanPhone.startsWith("07")) {
            cleanPhone = "254" + cleanPhone.substring(1);
        }

        if (!/^2547\d{8}$/.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid Kenyan M-Pesa number."
            });
        }

        // ---------------------------------------------
        // AMOUNT
        // ---------------------------------------------

        const numericAmount = Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount < 10
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter an amount of at least KSh 10."
            });
        }

        if (numericAmount > 150000) {
            return res.status(400).json({
                success: false,
                message: "The maximum amount is KSh 150,000."
            });
        }

        // ---------------------------------------------
        // REASON
        // ---------------------------------------------

        if (
            !reason ||
            typeof reason !== "string" ||
            !reason.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter the reason."
            });
        }

        // ---------------------------------------------
        // PAYMENT REFERENCE
        // ---------------------------------------------

        const apiRef = "ASKFRIEND-" + Date.now();

        console.log("Name:", firstName.trim());
        console.log("Phone:", cleanPhone);
        console.log("Amount:", numericAmount);
        console.log("Reason:", reason.trim());
        console.log("Reference:", apiRef);

        console.log(
            "Mode:",
            INTASEND_LIVE ? "LIVE" : "SANDBOX"
        );

        // ---------------------------------------------
        // INTASEND STK PUSH
        // ---------------------------------------------

        const intasendResponse = await fetch(
            INTASEND_API_URL +
            "/api/v1/payment/mpesa-stk-push/",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${INTASEND_SECRET_KEY}`,

                    "Content-Type": "application/json",

                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    amount: numericAmount,
                    phone_number: cleanPhone,
                    api_ref: apiRef,
                    mobile_tarrif: "BUSINESS-PAYS"
                })
            }
        );

        // ---------------------------------------------
        // READ INTASEND RESPONSE
        // ---------------------------------------------

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

        let intasendData;

        try {
            intasendData = JSON.parse(responseText);
        } catch {
            intasendData = {
                message: responseText
            };
        }

        // ---------------------------------------------
        // INTASEND ERROR
        // ---------------------------------------------

        if (!intasendResponse.ok) {
            return res.status(intasendResponse.status).json({
                success: false,
                message:
                    intasendData.message ||
                    intasendData.detail ||
                    intasendData.error ||
                    "IntaSend rejected the payment request."
            });
        }

        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        console.log(
            "IntaSend accepted the payment request."
        );

        return res.json({
            success: true,

            message:
                "Payment request sent. Check the M-Pesa phone for the payment prompt.",

            reference: apiRef
        });

    } catch (error) {
        console.error(
            "PAYMENT SERVER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Payment server error: " +
                (
                    error.message ||
                    "Unknown error"
                )
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

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Ask a Friend server running on port ${PORT}`
    );

    console.log(
        "IntaSend mode:",
        INTASEND_LIVE ? "LIVE" : "SANDBOX"
    );
});
