const API_URL = "https://gty-5vvn.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
console.log("GTY: JavaScript loaded");

```
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

    status.classList.remove(
        "error",
        "success",
        "loading"
    );

    if (type === "error") status.classList.add("error");
    if (type === "success") status.classList.add("success");
    if (type === "loading") status.classList.add("loading");
}

// Quick amount buttons
document.querySelectorAll("[data-amount]").forEach(button => {
    button.addEventListener("click", () => {
        const selectedAmount = button.getAttribute("data-amount");

        if (!amountInput) return;

        amountInput.value = selectedAmount;

        document.querySelectorAll("[data-amount]").forEach(btn => {
            btn.classList.remove("selected");
        });

        button.classList.add("selected");

        setStatus(
            `Amount selected: KSh ${Number(selectedAmount).toLocaleString()}`,
            "success"
        );
    });
});

// Check payment status until completed or timeout
async function monitorPayment(reference) {
```
