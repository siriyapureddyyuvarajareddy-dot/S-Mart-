// S Mart Portal - Staff Inventory Control Hub AJAX Controller Script

// Global state to store products
let currentProducts = [];

// 1. DOM Elements
const tableBody = document.getElementById('inventory-table-body');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const registrationForm = document.getElementById('product-registration-form');

const totalProductsCount = document.getElementById('total-products-count');
const lowStockCount = document.getElementById('low-stock-count');
const outOfStockCount = document.getElementById('out-of-stock-count');
const toastContainer = document.getElementById('toast-container');

// 2. Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast-slide-in pointer-events-auto flex items-center gap-3 w-full bg-white custom-shadow border-l-4 rounded-xl p-4 transition-all duration-300';
  
  let borderClass = 'border-emerald-500';
  let iconHtml = `
    <div class="p-1 bg-emerald-50 text-emerald-500 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
  `;

  if (type === 'delete') {
    borderClass = 'border-rose-500';
    iconHtml = `
      <div class="p-1 bg-rose-50 text-rose-500 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </div>
    `;
  } else if (type === 'warning') {
    borderClass = 'border-amber-500';
    iconHtml = `
      <div class="p-1 bg-amber-50 text-amber-500 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
    `;
  }

  toast.className += ` ${borderClass}`;
  toast.innerHTML = `
    ${iconHtml}
    <div class="flex-grow">
      <p class="text-sm font-semibold text-slate-800">${message}</p>
    </div>
    <button class="text-slate-400 hover:text-slate-600 transition-colors pointer-events-auto cursor-pointer" onclick="this.parentElement.remove();">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-[-10px]');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// 3. Compute and Update Summary Statistics Cards
function updateSummaryCards(productsList) {
  const total = productsList.length;
  const lowStock = productsList.filter(p => p.quantity > 0 && p.quantity <= 15).length;
  const outOfStock = productsList.filter(p => p.quantity === 0).length;

  totalProductsCount.textContent = total;
  lowStockCount.textContent = lowStock;
  outOfStockCount.textContent = outOfStock;
}

// 4. Determine Stock Status Badge Design
function getStatusBadge(qty) {
  if (qty === 0) {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100/80">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        Out of Stock
      </span>
    `;
  } else if (qty <= 15) {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100/80">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Low Stock
      </span>
    `;
  } else {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/80">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        In Stock
      </span>
    `;
  }
}

// 5. Fetch all products from API
function fetchProducts() {
  fetch('/api/products')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    })
    .then(products => {
      currentProducts = products;
      renderTable();
      updateSummaryCards(products);
    })
    .catch(err => {
      console.error(err);
      showToast('Error connecting to Server API', 'delete');
    });
}

// 6. Main Render Loop (filters currentProducts array locally for instant feedback)
function renderTable() {
  const query = searchInput.value.toLowerCase().trim();
  const filteredProducts = currentProducts.filter(product => 
    product.name.toLowerCase().includes(query)
  );

  if (filteredProducts.length === 0) {
    tableBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    return;
  } else {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
  }

  tableBody.innerHTML = filteredProducts.map(product => {
    return `
      <tr class="hover:bg-slate-50/50 transition-colors duration-150">
        <!-- Product Details -->
        <td class="px-6 py-4.5 whitespace-nowrap">
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-slate-800">${product.name}</span>
            <span class="text-[11px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">Unit: ${product.unit}</span>
          </div>
        </td>
        
        <!-- Stock Status Badge -->
        <td class="px-6 py-4.5 whitespace-nowrap align-middle">
          <div class="flex items-center">
            ${getStatusBadge(product.quantity)}
          </div>
        </td>

        <!-- Unit Price -->
        <td class="px-6 py-4.5 whitespace-nowrap align-middle text-center font-bold text-slate-800">
          ₹${parseFloat(product.price).toFixed(2)}
        </td>

        <!-- Quantity Control Buttons -->
        <td class="px-6 py-4.5 whitespace-nowrap align-middle text-center">
          <div class="flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100/60 border border-slate-200/50 rounded-xl px-2 py-1 w-fit mx-auto transition-all">
            <!-- Decrement Button -->
            <button 
              onclick="adjustQty(${product.id}, -1)" 
              class="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 hover:border-slate-300 active:scale-95 transition-all shadow-sm cursor-pointer"
              aria-label="Decrease quantity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
              </svg>
            </button>
            
            <!-- Quantity Indicator -->
            <span class="font-bold text-slate-800 tabular-nums min-w-[72px] text-center text-xs select-none">
              ${product.quantity} ${product.unit}
            </span>
            
            <!-- Increment Button -->
            <button 
              onclick="adjustQty(${product.id}, 1)" 
              class="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 hover:border-slate-300 active:scale-95 transition-all shadow-sm cursor-pointer"
              aria-label="Increase quantity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </td>

        <!-- Actions -->
        <td class="px-6 py-4.5 whitespace-nowrap align-middle text-right">
          <div class="flex items-center justify-end gap-2">
            <!-- Confirm Button -->
            <button 
              onclick="confirmQuantity(${product.id})" 
              class="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-xl transition-colors border border-emerald-100/50 shadow-sm cursor-pointer"
              title="Confirm Quantity Status"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>

            <!-- Delete Button -->
            <button 
              onclick="deleteProduct(${product.id})" 
              class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-colors border border-rose-100/50 shadow-sm cursor-pointer"
              title="Delete Product"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 7. Quantity Adjustment API Handler
window.adjustQty = function(id, amount) {
  const product = currentProducts.find(p => p.id === id);
  if (!product) return;

  const originalQty = product.quantity;
  const newQty = Math.max(0, originalQty + amount);
  if (originalQty === newQty) return; 

  fetch(`/api/products/${id}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  })
  .then(res => {
    if (!res.ok) throw new Error('Quantity update failed');
    return res.json();
  })
  .then(updatedProduct => {
    const getStatusType = (qty) => qty === 0 ? 'out' : (qty <= 15 ? 'low' : 'in');
    if (getStatusType(originalQty) !== getStatusType(updatedProduct.quantity)) {
      let msg = `"${updatedProduct.name}" status changed to `;
      let type = 'success';
      if (updatedProduct.quantity === 0) {
        msg += 'Out of Stock!';
        type = 'delete';
      } else if (updatedProduct.quantity <= 15) {
        msg += 'Low Stock warning.';
        type = 'warning';
      } else {
        msg += 'In Stock.';
      }
      showToast(msg, type);
    }
    
    fetchProducts();
  })
  .catch(err => {
    console.error(err);
    showToast('Failed to adjust stock on server', 'delete');
  });
};

// 8. Action: Confirm quantity status
window.confirmQuantity = function(id) {
  fetch(`/api/products/${id}/confirm`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      showToast(data.message || 'Product verified successfully.');
    })
    .catch(err => {
      console.error(err);
      showToast('Connection error during confirmation', 'delete');
    });
};

// 9. Action: Delete Product from DB
window.deleteProduct = function(id) {
  const product = currentProducts.find(p => p.id === id);
  if (!product) return;

  if (confirm(`Are you sure you want to delete "${product.name}" from inventory?`)) {
    fetch(`/api/products/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Deletion failed');
        return res.json();
      })
      .then(data => {
        showToast(data.message, 'delete');
        fetchProducts();
      })
      .catch(err => {
        console.error(err);
        showToast('Failed to delete product', 'delete');
      });
  }
};

// 10. Action: Register New Product
registrationForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const nameInput = document.getElementById('product-name-input');
  const qtyInput = document.getElementById('product-qty-input');
  const priceInput = document.getElementById('product-price-input');
  const unitSelect = document.getElementById('product-unit-select');

  const name = nameInput.value.trim();
  const quantity = parseInt(qtyInput.value, 10);
  const price = parseFloat(priceInput.value);
  const unit = unitSelect.value;

  if (!name || isNaN(quantity) || quantity < 0 || isNaN(price) || price < 0) {
    showToast('Invalid product details.', 'warning');
    return;
  }

  const nameExists = currentProducts.some(p => p.name.toLowerCase() === name.toLowerCase());
  if (nameExists) {
    showToast(`A product named "${name}" already exists.`, 'warning');
    return;
  }

  fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, quantity, price, unit })
  })
  .then(res => {
    if (!res.ok) return res.json().then(d => { throw new Error(d.error || 'Server registration failed') });
    return res.json();
  })
  .then(newProduct => {
    registrationForm.reset();
    showToast(`"${newProduct.name}" registered successfully.`);
    fetchProducts();
  })
  .catch(err => {
    console.error(err);
    showToast(err.message || 'Connection error during registration', 'delete');
  });
});

// 11. Search Event Listener
searchInput.addEventListener('input', () => {
  renderTable();
});

// 12. Initial Load Hook
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
});
