// filepath: /e:/learning process/jenishProject/fyp/public/js/khalti-payment.js
document.getElementById("khalti-button").addEventListener("click", function () {
  new KhaltiCheckout({
    publicKey: "test_public_key_dc74b93b7b124b3e83e6a03a8f312b22", // Replace with your live key
    productIdentity: "cart_checkout",
    productName: "Cart Items",
    productUrl: window.location.href,
    eventHandler: {
      onSuccess(payload) {
        alert("Payment Successful!");
        window.location.href = "/success";
      },
      onError(error) {
        console.error(error);
        alert("Payment Failed!");
      },
    },
  }).show({ amount: 1000 * 100 }); // Replace 1000 with cart total
});
