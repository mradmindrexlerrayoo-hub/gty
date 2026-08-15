const API_URL = "https://gty-5vwh.onrender.com";

const form = document.getElementById("paymentForm");
const status = document.getElementById("status");
const payButton = document.querySelector(".pay-button");
const amountInput = document.getElementById("amount");

// Quick amount buttons
document.querySelectorAll(".amounts button").forEach((button) => {
  button.addEventListener("click", () => {
    amountInput.value = button.dataset.amount;
  });
});

// Payment form
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const firstName = document
    .getElementById("firstName")
    .value
    .trim();

  const phone = document
    .getElementById("phone")
    .value
    .trim();

  const amount = Number(amountInput.value);

  const reason = document
    .getElementById("reason")
    .value
    .trim();

  // Validate Kenyan phone number
  if (!/^07\d{8}$/.test(phone)) {
    status.textContent =
      "Please enter a valid Kenyan M-Pesa number, for example 0712345678.";
    return;
  }

  // Validate amount
  if (
    !Number.isInteger(amount) ||
    amount < 10 ||
    amount > 150000
  ) {
    status.textContent =
      "Please enter an amount between KSh 10 and KSh 150,000.";
    return;
  }

  if (!reason) {
    status.textContent =
      "Please enter the reason for the payment.";
    return;
  }

  payButton.disabled = true;

  status.textContent =
    "Starting M-Pesa payment... Please wait.";

  try {
    const response = await fetch(
      `${API_URL}/api/payment`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          firstName: firstName,
          phone: phone,
          amount: amount,
          reason: reason
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "The payment request could not be started."
      );
    }

    status.innerHTML = `
      <strong>M-Pesa request sent.</strong><br><br>
      Check your phone for the M-Pesa prompt.
      Confirm that the amount is correct before
      entering your M-Pesa PIN.
    `;

    console.log(
      "Payment reference:",
      data.reference
    );

  } catch (error) {
    console.error("Payment error:", error);

    status.textContent =
      error.message ||
      "Something went wrong while starting the payment.";
  } finally {
    payButton.disabled = false;
  }
});
