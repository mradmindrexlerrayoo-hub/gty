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

const PORT = process.env.PORT || 3000;

const SANDBOX = true;

const intasend = new IntaSend(
  process.env.INTASEND_PUBLISHABLE_KEY,
  process.env.INTASEND_SECRET_KEY,
  SANDBOX
);

const collection = intasend.collection();


app.get("/health", (req, res) => {
  res.json({
    online: true
  });
});


app.post("/api/payment", async (req, res) => {

  try {

    const {
      firstName,
      lastName,
      phone,
      amount
    } = req.body;

    if (!firstName || !phone || !amount) {
      return res.status(400).json({
        success: false,
        error: "Name, phone and amount are required."
      });
    }

    const cleanPhone =
      String(phone)
        .trim()
        .replace(/\s/g, "");

    let mpesaPhone;

    if (/^07\d{8}$/.test(cleanPhone)) {
      mpesaPhone = "254" + cleanPhone.substring(1);
    } else if (/^\+2547\d{8}$/.test(cleanPhone)) {
      mpesaPhone = cleanPhone.substring(1);
    } else if (/^2547\d{8}$/.test(cleanPhone)) {
      mpesaPhone = cleanPhone;
    } else {
      return res.status(400).json({
        success: false,
        error: "Enter a valid Kenyan M-Pesa number."
      });
    }

    const numericAmount = Number(amount);

    if (
      !Number.isInteger(numericAmount) ||
      numericAmount < 10 ||
      numericAmount > 150000
    ) {
      return res.status(400).json({
        success: false,
        error: "Amount must be between KSh 10 and KSh 150,000."
      });
    }

    const reference =
      "REQUEST-" +
      Date.now();

    const payment =
      await collection.mpesaStkPush({
        first_name: firstName,
        last_name: lastName || "Customer",
        email: "customer@example.com",
        host: process.env.FRONTEND_URL,
        amount: numericAmount,
        phone_number: mpesaPhone,
        api_ref: reference
      });

    res.json({
      success: true,
      reference: reference,
      payment: payment
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: "Could not start the payment."
    });

  }

});


app.post("/api/webhook", (req, res) => {

  console.log(
    "IntaSend webhook:",
    JSON.stringify(req.body, null, 2)
  );

  res.status(200).json({
    received: true
  });

});


app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
