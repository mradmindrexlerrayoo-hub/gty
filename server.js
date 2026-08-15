const API_URL = "https://gty-5vwn.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Ask a Friend: JavaScript loaded");

    const form = document.getElementById("paymentForm");
    const status = document.getElementById("status");

    const firstNameInput = document.getElementById("firstName");
    const phoneInput = document.getElementById("phone");
    const amountInput = document.getElementById("amount");
    const reasonInput = document.getElementById("reason");

    // Find the payment button using either common ID/class
    const payButton =
        document.getElementById("payButton") ||
        document.querySelector(".pay-button") ||
        document.querySelector('button[type="submit"]');

    // Check that the page contains the expected elements
    if (!form) {
        console.error("paymentForm was not found");
        return;
    }

    if (!amountInput) {
        console.error("amount input was not found");
        return;
    }

    if (!status) {
        console.error("status element was not found");
    }

    // --------------------------------------------------
    // QUICK AMOUNT BUTTONS
    // --------------------------------------------------

    const amountButtons = document.querySelectorAll("[data-amount]");

    amountButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedAmount = button.getAttribute("data-amount");

            amountInput.value = selectedAmount;

            amountButtons.forEach((btn) => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");

            setStatus(
                "Amount selected: KSh " + selectedAmount,
                false
            );
        });
    });

    // --------------------------------------------------
    // PAYMENT FORM
    // --------------------------------------------------

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        console.log("Payment form submitted");

        const firstName = firstNameInput
            ? firstNameInput.value.trim()
            : "";

        const phone = phoneInput
            ? phoneInput.value.trim()
            : "";

        const amount = amountInput
            ? amountInput.value.trim()
            : "";

        const reason = reasonInput
            ? reasonInput.value.trim()
            : "";

        // Validate name
        if (!firstName) {
            setStatus("Please enter your name.", true);
            return;
        }

        // Validate phone
        if (!phone) {
            setStatus(
                "Please enter the friend's M-Pesa number.",
                true
            );
            return;
        }

        if (!/^07\d{8}$/.test(phone)) {
            setStatus(
                "Enter a valid Kenyan number, for example 0712345678.",
                true
            );
            return;
        }

        // Validate amount
        const numericAmount = Number(amount);

        if (!numericAmount || numericAmount <= 0) {
            setStatus(
                "Please enter a valid amount.",
                true
            );
            return;
        }

        // Validate reason
        if (!reason) {
            setStatus(
                "Please enter the reason.",
                true
            );
            return;
        }

        // Disable button while processing
        if (payButton) {
            payButton.disabled = true;
        }

        setStatus(
            "Connecting to the payment server...",
            false
        );

        console.log("Sending payment request to:", API_URL);

        try {
            const response = await fetch(
                API_URL + "/api/payment",
                {
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
                }
            );

            console.log(
                "Server response:",
                response.status
            );

            const responseText = await response.text();

            console.log(
                "Server response body:",
                responseText
            );

            let data = {};

            try {
                data = JSON.parse(responseText);
            } catch (jsonError) {
                data = {
                    message: responseText
                };
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Server error: HTTP " + response.status
                );
            }

            if (data.success === false) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Payment request was not accepted."
                );
            }

            setStatus(
                data.message ||
                "Payment request submitted successfully. Check the M-Pesa phone for the payment prompt.",
                false
            );

        } catch (error) {
            console.error(
                "Payment error:",
                error
            );

            setStatus(
                "Payment connection failed: " +
                error.message,
                true
            );

        } finally {
            if (payButton) {
                payButton.disabled = false;
            }
        }
    });

    // --------------------------------------------------
    // STATUS MESSAGE
    // --------------------------------------------------

    function setStatus(message, isError) {
        if (!status) {
            console.log(message);
            return;
        }

        status.textContent = message;

        if (isError) {
            status.classList.add("error");
        } else {
            status.classList.remove("error");
        }
    }

    console.log("Ask a Friend: Ready");
});
