```javascript
const API_URL =
  "https://YOUR-BACKEND-DOMAIN.com";


const form =
  document.getElementById("paymentForm");

const status =
  document.getElementById("status");

const payButton =
  document.querySelector(".pay-button");

const amountInput =
  document.getElementById("amount");


/*
  Quick amount buttons
*/

document
  .querySelectorAll(".amounts button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        amountInput.value =
          button.dataset.amount;

      }
    );

  });


/*
  Payment
*/

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const firstName =
      document
        .getElementById("firstName")
        .value
        .trim();


    const phone =
      document
        .getElementById("phone")
        .value
        .trim();


    const amount =
      Number(amountInput.value);


    const reason =
      document
        .getElementById("reason")
        .value
        .trim();


    /*
      Basic validation
    */

    if (!/^07\d{8}$/.test(phone)) {

      status.textContent =
        "Enter a valid Kenyan phone number, e.g. 0712345678.";

      return;
    }


    if (
      !Number.isInteger(amount) ||
      amount < 10 ||
      amount > 150000
    ) {

      status.textContent =
        "Enter an amount between KSh 10 and KSh 150,000.";

      return;
    }


    payButton.disabled =
      true;


    status.textContent =
      "Starting M-Pesa payment...";


    try {

      const response =
        await fetch(
          `${API_URL}/api/payment`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              firstName,

              phone,

              amount,

              reason

            })

          }
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
          "Payment could not be started."
        );

      }


      status.innerHTML =
        `
        <strong>M-Pesa request sent.</strong><br>
        Check your phone for the payment prompt
        and confirm the amount before entering
        your PIN.
        `;


      console.log(
        "Payment reference:",
        data.reference
      );


    } catch (error) {

      console.error(error);

      status.textContent =
        error.message ||
        "Something went wrong.";

    } finally {

      payButton.disabled =
        false;

    }

  }
);
```
