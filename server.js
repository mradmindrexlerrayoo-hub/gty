require("dotenv").config();

const express = require("express");
const cors = require("cors");
const IntaSend = require("intasend-node");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*"
  })
);

const PORT = process.env.PORT || 10000;

// Keep this TRUE while testing.
// Change to false only after your IntaSend live account
// and payment flow have been properly verified.
const SANDBOX = true;

const intasend = new IntaSend(
  process.env.INTASEND_PUBLISHABLE_KEY,
  process.env.INTASEND_SECRET_KEY,
  SANDBOX
);

const collection = intasend.collection();


// --------------------------------------------------
// HOME
// --------------------------------------------------

app.get("/", (req, res) => {
  res.send("Money Request API is online.");
});


// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/health", (req, res) => {
  res.json({
    online: true
  });
});


// --------------------------------------------------
// START M-PESA PAYMENT
// --------------------------------------------------

app.post("/api/payment", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      amount,
      reason
    } = req.body;

    // Check required information
    if (!firstName || !phone || !amount) {
      return res.status(400).json({
        success: false,
        error: "Name, phone number and amount are required."
      });
    }

    // Clean phone number
    const cleanPhone = String(phone)
      .trim()
      .replace(/\s/g, "");

    let mpesaPhone;

    // 0712345678
    if (/^07\d{8}$/.test(cleanPhone)) {
      mpesaPhone = "254" + cleanPhone.substring(1);
    }

    // +254712345678
    else if (/^\+2547\d{8}$/.test(cleanPhone)) {
      mpesaPhone = cleanPhone.substring(1);
    }

    // 254712345678
    else if (/^2547\d{8}$/.test(cleanPhone)) {
      mpesaPhone = cleanPhone;
    }

    else {
      return res.status(400).json({
        success: false,
        error:
          "Enter a valid Kenyan M-Pesa number, for example 0712345678."
      });
    }


    // Validate amount
    const numericAmount = Number(amount);

    if (
      !Number.isInteger(numericAmount) ||
      numericAmount < 10 ||
      numericAmount > 150000
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Amount must be between KSh 10 and KSh 150,000."
      });
    }


    // Generate unique reference
    const reference =
      "REQUEST-" + Date.now();


    // Start IntaSend M-Pesa STK Push
    const payment =
      await collection.mpesaStkPush({
        first_name: firstName,
        last_name: lastName || "Customer",
        email: "customer@example.com",
        host:
          process.env.FRONTEND_URL ||
          "https://example.com",
        amount: numericAmount,
        phone_number: mpesaPhone,
        api_ref: reference
      });


    console.log("Payment started:", {
      reference,
      phone: mpesaPhone,
      amount: numericAmount,
      reason: reason || ""
    });


    res.json({
      success: true,
      reference: reference,
      payment: payment
    });

  } catch (error) {

    console.error(
      "IntaSend payment error:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        "Unable to start the M-Pesa payment. Please try again."
    });
  }
});


// --------------------------------------------------
// INTASEND WEBHOOK
// --------------------------------------------------

app.post("/api/webhook", (req, res) => {

  console.log(
    "IntaSend webhook received:"
  );

  console.log(
    JSON.stringify(req.body, null, 2)
  );

  res.status(200).json({
    received: true
  });
});


// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
