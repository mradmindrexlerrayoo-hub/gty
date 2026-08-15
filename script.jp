const API_URL = "https://gty-5vwn.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Ask a Friend: JavaScript loaded");

    const form = document.getElementById("paymentForm");
    const status = document.getElementById("status");

    const firstNameInput = document.getElementById("firstName");
    const phoneInput = document.getElementById("phone");
    const amountInput = document.getElementById("amount");
    const reasonInput = document.getElementById("reason");

    const payButton =
        document.getElementById("payButton") ||
        document.querySelector(".pay-button") ||
        document.querySelector('button[type="submit"]');

    if (!form) {
        console.error("paymentForm was not found");
        return;
    }

    // -------------------------------
    // QUICK AMOUNT BUTTONS
    // -------------------------------

    document.querySelectorAll("[data-amount]").forEach((button) => {
        button.addEventListener("click", () => {
            const selectedAmount = button.dataset.amount;

            if (amountInput) {
                amountInput.value = selectedAmount;
            }

            document
                .querySelectorAll("[data-amount]")
                .forEach((btn) => btn.classList.remove("selected"));

            button.classList.add("selected");

            setStatus(
                `Amount selected: KSh ${Number(selectedAmount).toLocaleString()}`,
                false
            );
        });
    });

    // -------------------------------
    // FORM SUBMISSION
    // -------------------------------

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const firstName = firstNameInput?.value.trim() || "";
        const phone = phoneInput?.value.trim() || "";
        const amount = amountInput?.value.trim() || "";
        const reason = reasonInput?.value.trim() || "";

        // Name
        if (!firstName) {
            setStatus("Please enter your name.", true);
            return;
        }

        // Phone
        if (!phone) {
            setStatus("Please enter the friend's M-Pesa number.", true);
            return;
        }

        if (!/^07\d{8}$/.test(phone)) {
            setStatus(
                "Enter a valid Kenyan number, for example 0712345678.",
                true
            );
            return;
        }

        // Amount
        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount < 10) {
            setStatus("Enter an amount of at least KSh 10.", true);
            return;
        }

        if (numericAmount > 150000) {
            setStatus("The maximum amount is KSh 150,000.", true);
            return;
        }

        // Reason
        if (!reason) {
            setStatus("Please enter the reason.", true);
            return;
        }

        if (payButton) {
            payButton.disabled = true;
        }

        setStatus(
            "Connecting to payment server...",
            false
        );

        try {
            console.log(
                "Sending request to:",
                API_URL + "/api/payment"
            );

            const response = await fetch(
                API_URL + "/api/payment",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },

                    body: JSON.stringify({
                        firstName,
                        phone,
                        amount: numericAmount,
                        reason
                    })
                }
            );

            const text = await response.text();

            console.log("HTTP status:", response.status);
            console.log("Server response:", text);

            let data;

            try {
                data = JSON.parse(text);
            } catch {
                data = {
                    message: text
                };
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    `Server returned HTTP ${response.status}`
                );
            }

            if (data.success === false) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "The payment request was rejected."
                );
            }

            setStatus(
                data.message ||
                "Payment request sent. Check the M-Pesa phone for the payment prompt.",
                false
            );

        } catch (error) {
            console.error("PAYMENT ERROR:", error);

            let message = error.message || "Unknown error";

            if (
                message === "Failed to fetch" ||
                message.includes("NetworkError") ||
                message.includes("CORS")
            ) {
                message =
                    "Cannot connect to the payment server. Your Render backend needs to be checked.";
            }

            setStatus(
                "Payment connection failed: " + message,
                true
            );

        } finally {
            if (payButton) {
                payButton.disabled = false;
            }
        }
    });

    // -------------------------------
    // STATUS
    // -------------------------------

    function setStatus(message, isError) {
        if (!status) {
            console.log(message);
            return;
        }

        status.textContent = message;

        status.classList.remove("error", "success", "loading");

        if (isError) {
            status.classList.add("error");
        } else {
            status.classList.add("success");
        }
    }

    console.log("Ask a Friend: Ready");
});
