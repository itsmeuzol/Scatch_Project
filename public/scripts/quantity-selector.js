function increaseQuantity(productId) {
  let quantityInput = document.getElementById(`quantity-${productId}`);
  let currentValue = parseInt(quantityInput.value, 10);
  quantityInput.value = currentValue + 1;
}

function decreaseQuantity(productId) {
  let quantityInput = document.getElementById(`quantity-${productId}`);
  let currentValue = parseInt(quantityInput.value, 10);
  if (currentValue > 1) {
    quantityInput.value = currentValue - 1;
  }
}
