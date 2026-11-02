const API_URL = "https://gty-5vvn.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  console.log("GTY: JavaScript loaded");

  const form = document.getElementById("paymentForm");
  const status = document.getElementById("status");

  const firstNameInput = document.getElementById("firstName");
  const phoneInput = document.getElementById("phone");
  const amountInput = document.getElementById("amount");
  const reasonInput = document.getElementById("reason");

  const payButton =
    document.getElementById("payButton") ||
    document.querySelector(".pay-button") ||
    form?.querySelector('button[type="submit"]');

  if (!form) {
    console.error("Payment form not found.");
    return;
  }

  function setStatus(message, type = "info") {
    console.log("[STATUS]", message);

    if (!status) return;

    status.textContent = message;
    status.classList.remove("error", "success", "loading");

    if (type === "error") status.classList.add("error");
    if (type === "success") status.classList.add("success");
    if (type === "loading") status.classList.add("loading");
  }

  async function readJsonResponse(response) {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error("Invalid JSON from server:", text);
      throw new Error("The server returned an invalid response.");
    }
  }

  document.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedAmount = button.getAttribute("data-amount");

      if (!amountInput) return;

      amountInput.value = selectedAmount;

      document.querySelectorAll("[data-amount]").forEach((btn) => {
        btn.classList.remove("selected");
      });

      button.classList.add("selected");

      setStatus(
        `Amount selected: KSh ${Number(selectedAmount).toLocaleString()}`,
        "success"
      );
    });
  });

  async function monitorPayment(reference) {
    console.log("Monitoring payment:", reference);
    return reference;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!firstNameInput || !phoneInput || !amountInput || !reasonInput) {
      setStatus("Form is missing required fields.", "error");
      return;
    }

    const firstName = firstNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const amount = Number(amountInput.value);
    const reason = reasonInput.value.trim();

    if (!firstName || !phone || !reason || !Number.isFinite(amount) || amount < 10) {
      setStatus("Please complete all fields with a valid amount.", "error");
      return;
    }

    setStatus("Sending payment request...", "loading");

    try {
      const response = await fetch(`${API_URL}/api/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, phone, amount, reason })
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Payment request failed.");
      }

      setStatus(
        `Payment request sent successfully. Reference: ${data.reference || "N/A"}`,
        "success"
      );

      form.reset();
    } catch (error) {
      console.error("Payment request error:", error);
      setStatus(error.message || "Something went wrong.", "error");
    }
  });

  if (payButton) {
    payButton.addEventListener("click", () => {
      setStatus("Processing payment request...", "loading");
    });
  }
});
