const API_URL = "https://gty-5vvn.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Ask a Friend: JavaScript loaded");

    // -----------------------------------------
    // GET ELEMENTS
    // -----------------------------------------

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

    // -----------------------------------------
    // CHECK PAGE
    // -----------------------------------------

    if (!form) {
        console.error("ERROR: #paymentForm not found.");
        return;
    }

    if (!status) {
        console.warn("WARNING: #status not found.");
    }

    // -----------------------------------------
    // STATUS FUNCTION
    // -----------------------------------------

    function setStatus(message, type = "info") {
        console.log("[STATUS]", message);

        if (!status) {
            return;
        }

        status.textContent = message;

        status.classList.remove(
            "error",
            "success",
            "loading"
        );

        if (type === "error") {
            status.classList.add("error");
        }

        if (type === "success") {
            status.classList.add("success");
        }

        if (type === "loading") {
            status.classList.add("loading");
        }
    }

    // -----------------------------------------
    // QUICK AMOUNT BUTTONS
    // -----------------------------------------

    const amountButtons =
        document.querySelectorAll("[data-amount]");

    amountButtons.forEach((button) => {
        button.addEventListener("click", () => {

            const selectedAmount =
                button.getAttribute("data-amount");

            if (!amountInput) {
                return;
            }

            amountInput.value = selectedAmount;

            amountButtons.forEach((btn) => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");

            setStatus(
                "Amount selected: KSh " +
                Number(selectedAmount).toLocaleString(),
                "success"
            );
        });
    });

    // -----------------------------------------
    // FORM SUBMIT
    // -----------------------------------------

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        console.log("--------------------------------");
        console.log("PAYMENT FORM SUBMITTED");
        console.log("--------------------------------");

        // -----------------------------------------
        // READ VALUES
        // -----------------------------------------

        const firstName =
            firstNameInput?.value.trim() || "";

        const phone =
            phoneInput?.value.trim() || "";

        const amount =
            amountInput?.value.trim() || "";

        const reason =
            reasonInput?.value.trim() || "";

        console.log("Name:", firstName);
        console.log("Phone:", phone);
        console.log("Amount:", amount);
        console.log("Reason:", reason);

        // -----------------------------------------
        // VALIDATE NAME
        // -----------------------------------------

        if (!firstName) {
            setStatus(
                "Please enter your name.",
                "error"
            );

            firstNameInput?.focus();
            return;
        }

        // -----------------------------------------
        // VALIDATE PHONE
        // -----------------------------------------

        if (!phone) {
            setStatus(
                "Please enter the friend's M-Pesa number.",
                "error"
            );

            phoneInput?.focus();
            return;
        }

        /*
         * Accept:
         * 0712345678
         *
         * Also accept:
         * +254712345678
         *
         * The number is converted to 254 format
         * before being sent to the backend.
         */

        let formattedPhone =
            phone.replace(/\s+/g, "");

        if (formattedPhone.startsWith("07")) {

            if (!/^07\d{8}$/.test(formattedPhone)) {
                setStatus(
                    "Enter a valid Kenyan number, e.g. 0712345678.",
                    "error"
                );

                phoneInput?.focus();
                return;
            }

            formattedPhone =
                "254" + formattedPhone.substring(1);

        } else if (formattedPhone.startsWith("+254")) {

            formattedPhone =
                formattedPhone.substring(1);

            if (!/^2547\d{8}$/.test(formattedPhone)) {
                setStatus(
                    "Enter a valid Kenyan M-Pesa number.",
                    "error"
                );

                phoneInput?.focus();
                return;
            }

        } else if (formattedPhone.startsWith("254")) {

            if (!/^2547\d{8}$/.test(formattedPhone)) {
                setStatus(
                    "Enter a valid Kenyan M-Pesa number.",
                    "error"
                );

                phoneInput?.focus();
                return;
            }

        } else {

            setStatus(
                "Enter a valid Kenyan number, e.g. 0712345678.",
                "error"
            );

            phoneInput?.focus();
            return;
        }

        // -----------------------------------------
        // VALIDATE AMOUNT
        // -----------------------------------------

        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount < 10
        ) {
            setStatus(
                "Enter an amount of at least KSh 10.",
                "error"
            );

            amountInput?.focus();
            return;
        }

        if (numericAmount > 150000) {
            setStatus(
                "The maximum amount is KSh 150,000.",
                "error"
            );

            amountInput?.focus();
            return;
        }

        // -----------------------------------------
        // VALIDATE REASON
        // -----------------------------------------

        if (!reason) {
            setStatus(
                "Please enter the reason.",
                "error"
            );

            reasonInput?.focus();
            return;
        }

        // -----------------------------------------
        // DISABLE PAYMENT BUTTON
        // -----------------------------------------

        if (payButton) {
            payButton.disabled = true;
        }

        setStatus(
            "Connecting to payment server...",
            "loading"
        );

        // -----------------------------------------
        // REQUEST DATA
        // -----------------------------------------

        const requestData = {
            firstName: firstName,
            phone: formattedPhone,
            amount: numericAmount,
            reason: reason
        };

        console.log(
            "Backend URL:",
            API_URL + "/api/payment"
        );

        console.log(
            "Request data:",
            requestData
        );

        // -----------------------------------------
        // SEND REQUEST
        // -----------------------------------------

        try {

            const response = await fetch(
                API_URL + "/api/payment",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },

                    body: JSON.stringify(requestData)
                }
            );

            console.log(
                "HTTP STATUS:",
                response.status
            );

            const responseText =
                await response.text();

            console.log(
                "SERVER RESPONSE:",
                responseText
            );

            // -----------------------------------------
            // PARSE RESPONSE
            // -----------------------------------------

            let data = {};

            if (responseText) {

                try {
                    data =
                        JSON.parse(responseText);

                } catch (parseError) {

                    data = {
                        message: responseText
                    };
                }
            }

            console.log(
                "PARSED DATA:",
                data
            );

            // -----------------------------------------
            // SERVER ERROR
            // -----------------------------------------

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    data.error ||
                    "Server returned HTTP " +
                    response.status
                );
            }

            // -----------------------------------------
            // PAYMENT FAILED
            // -----------------------------------------

            if (
                data.success === false ||
                data.status === "failed"
            ) {

                throw new Error(
                    data.message ||
                    data.error ||
                    "The payment request was rejected."
                );
            }

            // -----------------------------------------
            // SUCCESS
            // -----------------------------------------

            setStatus(
                data.message ||
                "Payment request sent successfully. Check the M-Pesa phone for the payment prompt.",
                "success"
            );

            console.log(
                "PAYMENT REQUEST SUCCESSFUL"
            );

        } catch (error) {

            console.error(
                "PAYMENT ERROR:",
                error
            );

            let errorMessage =
                error?.message ||
                "Unknown error";

            // -----------------------------------------
            // FAILED TO FETCH
            // -----------------------------------------

            if (
                errorMessage === "Failed to fetch" ||
                errorMessage.includes("NetworkError")
            ) {

                errorMessage =
                    "Cannot connect to the payment server. Please check the Render service and CORS settings.";
            }

            // -----------------------------------------
            // SHOW ERROR
            // -----------------------------------------

            setStatus(
                "Payment connection failed: " +
                errorMessage,
                "error"
            );

        } finally {

            if (payButton) {
                payButton.disabled = false;
            }
        }
    });

    // -----------------------------------------
    // PAGE READY
    // -----------------------------------------

    console.log(
        "Ask a Friend: Ready"
    );
});
