const API_URL = "https://gty-5vwn.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("paymentForm");
    const payButton = document.getElementById("payButton");
    const status = document.getElementById("status");

    const firstNameInput = document.getElementById("firstName");
    const phoneInput = document.getElementById("phone");
    const amountInput = document.getElementById("amount");
    const reasonInput = document.getElementById("reason");

    // Amount buttons
    const amountButtons = document.querySelectorAll("[data-amount]");

    amountButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const amount = button.dataset.amount;

            if (amountInput) {
                amountInput.value = amount;
            }

            amountButtons.forEach((btn) => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");
        });
    });

    if (!form || !payButton) {
        console.error("Payment form or payment button was not found.");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const firstName = firstNameInput?.value.trim() || "";
        const phone = phoneInput?.value.trim() || "";
        const amount = amountInput?.value.trim() || "";
        const reason = reasonInput?.value.trim() || "";

        if (!firstName) {
            showStatus("Please enter your name.", true);
            return;
        }

        if (!phone) {
            showStatus("Please enter the friend's M-Pesa number.", true);
            return;
        }

        if (!/^07\d{8}$/.test(phone)) {
            showStatus(
                "Please enter a valid Kenyan M-Pesa number, for example 0712345678.",
                true
            );
            return;
        }

        const numericAmount = Number(amount);

        if (!numericAmount || numericAmount <= 0) {
            showStatus("Please enter a valid amount.", true);
            return;
        }

        if (!reason) {
            showStatus("Please enter the reason for the payment request.", true);
            return;
        }

        payButton.disabled = true;

        showStatus("Starting M-Pesa payment... Please wait.", false);

        try {
            const response = await fetch(`${API_URL}/api/payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    firstName: firstName,
                    phone: phone,
                    amount: numericAmount,
                    reason: reason
                })
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    `Payment request failed (${response.status})`
                );
            }

            if (data.success === false) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "The payment request could not be created."
                );
            }

            showStatus(
                data.message ||
                "Payment request created. Check the M-Pesa phone for the payment prompt.",
                false
            );

        } catch (error) {
            console.error("Payment error:", error);

            showStatus(
                error.message ||
                "Failed to connect to the payment server. Please try again.",
                true
            );
        } finally {
            payButton.disabled = false;
        }
    });

    function showStatus(message, isError) {
        if (!status) return;

        status.textContent = message;

        if (isError) {
            status.classList.add("error");
        } else {
            status.classList.remove("error");
        }
    }
});
