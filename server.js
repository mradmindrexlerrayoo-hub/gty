const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;

// Keep secrets OUT of this file.
// Add INTA_SEND_SECRET_KEY in Render Environment Variables.
const INTASEND_SECRET_KEY =
    process.env.INTASEND_SECRET_KEY;

app.use(
    cors({
        origin: [
            "https://mradmindrexlerrayoo-hub.github.io"
        ],
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Accept"]
    })
);

app.use(express.json());


// ---------------------------------------
// HEALTH CHECK
// ---------------------------------------

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Ask a Friend payment server is online."
    });
});


// ---------------------------------------
// PAYMENT ENDPOINT
// ---------------------------------------

app.post("/api/payment", async (req, res) => {

    try {

        const {
            firstName,
            phone,
            amount,
            reason
        } = req.body;

        // Validate name
        if (!firstName) {
            return res.status(400).json({
                success: false,
                message: "Name is required."
            });
        }

        // Validate phone
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required."
            });
        }

        // Validate amount
        const numericAmount = Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount < 10
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount."
            });
        }

        // Validate reason
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Reason is required."
            });
        }

        // Check secret key
        if (!INTASEND_SECRET_KEY) {
            console.error(
                "INTASEND_SECRET_KEY is missing."
            );

            return res.status(500).json({
                success: false,
                message:
                    "Payment service is not configured on the server."
            });
        }


        // ---------------------------------------
        // INTASEND PAYMENT
        // ---------------------------------------

        const response = await fetch(
            "https://api.intasend.com/api/v1/payment/collection/",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${INTASEND_SECRET_KEY}`,

                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body: JSON.stringify({
                    amount: numericAmount,
                    currency: "KES",
                    phone_number: phone,
                    api_ref:
                        `ask-friend-${Date.now()}`,
                    comment:
                        `${firstName}: ${reason}`
                })
            }
        );


        const responseText =
            await response.text();

        console.log(
            "IntaSend status:",
            response.status
        );

        console.log(
            "IntaSend response:",
            responseText
        );


        let data;

        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                raw: responseText
            };
        }


        // IntaSend error
        if (!response.ok) {

            return res.status(response.status).json({
                success: false,
                message:
                    data.detail ||
                    data.message ||
                    data.error ||
                    "IntaSend rejected the payment request."
            });

        }


        // ---------------------------------------
        // SUCCESS
        // ---------------------------------------

        return res.json({
            success: true,

            message:
                "Payment request sent. Check the M-Pesa phone for the payment prompt.",

            data: data
        });


    } catch (error) {

        console.error(
            "Payment server error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to process the payment request."
        });

    }

});


// ---------------------------------------
// START SERVER
// ---------------------------------------

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Ask a Friend server running on port ${PORT}`
    );

});
