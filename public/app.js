const PRODUCT_ENDPOINT = '/products';
const DEFAULT_LIMIT = 10;

const state = {
  page: 1,
  limit: DEFAULT_LIMIT,
  totalRecords: 0,
  filters: {
    category: 'all',
    minPrice: '',
    maxPrice: '',
    stockStatus: 'all',
    search: ''
  },
  sort: {
    field: 'name',
    direction: 'asc'
  },
  activity: [],
  currentProductId: null,
  currentConfirmDelete: null
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  updateCurrentDate();
  loadDashboardStats();
  loadProducts();
});

function cacheElements() {
  elements.currentDate = document.getElementById('currentDate');
  elements.totalProductsValue = document.getElementById('totalProductsValue');
  elements.inventoryValueValue = document.getElementById('inventoryValueValue');
  elements.lowStockValue = document.getElementById('lowStockValue');
  elements.outOfStockValue = document.getElementById('outOfStockValue');

  elements.productTableBody = document.getElementById('productTableBody');
  elements.categoryFilter = document.getElementById('categoryFilter');
  elements.minPriceInput = document.getElementById('minPriceInput');
  elements.maxPriceInput = document.getElementById('maxPriceInput');
  elements.stockStatusFilter = document.getElementById('stockStatusFilter');
  elements.searchInput = document.getElementById('searchInput');
  elements.sortSelect = document.getElementById('sortSelect');
  elements.resetFiltersBtn = document.getElementById('resetFiltersBtn');
  elements.prevPageBtn = document.getElementById('prevPageBtn');
  elements.nextPageBtn = document.getElementById('nextPageBtn');
  elements.pageInfo = document.getElementById('pageInfo');
  elements.totalRecordsText = document.getElementById('totalRecordsText');
  elements.limitSelect = document.getElementById('limitSelect');
  elements.addProductBtn = document.getElementById('addProductBtn');
  elements.apiLogContainer = document.getElementById('apiLogContainer');
  elements.toastContainer = document.getElementById('toastContainer');

  elements.productModal = document.getElementById('productModal');
  elements.modalTitle = document.getElementById('modalTitle');
  elements.productForm = document.getElementById('productForm');
  elements.submitProductBtn = document.getElementById('submitProductBtn');
  elements.productNameInput = document.getElementById('productName');
  elements.categoryNameInput = document.getElementById('categoryName');
  elements.brandNameInput = document.getElementById('brandName');
  elements.priceInput = document.getElementById('priceInput');
  elements.stockInput = document.getElementById('stockInput');
  elements.descriptionInput = document.getElementById('descriptionInput');

  elements.detailModal = document.getElementById('detailModal');
  elements.detailModalTitle = document.getElementById('detailModalTitle');
  elements.detailContent = document.getElementById('detailContent');

  elements.stockUpdateModal = document.getElementById('stockUpdateModal');
  elements.currentStockDisplay = document.getElementById('currentStockDisplay');
  elements.newStockInput = document.getElementById('newStockInput');
  elements.stockUpdateForm = document.getElementById('stockUpdateForm');

  elements.confirmModal = document.getElementById('confirmModal');
  elements.confirmMessage = document.getElementById('confirmMessage');
  elements.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
}

function bindEvents() {
  elements.categoryFilter.addEventListener('change', () => {
    state.filters.category = elements.categoryFilter.value;
    resetToFirstPage();
    loadProducts();
  });

  elements.minPriceInput.addEventListener('input', debounce(() => {
    state.filters.minPrice = elements.minPriceInput.value.trim();
    resetToFirstPage();
    loadProducts();
  }, 400));

  elements.maxPriceInput.addEventListener('input', debounce(() => {
    state.filters.maxPrice = elements.maxPriceInput.value.trim();
    resetToFirstPage();
    loadProducts();
  }, 400));

  elements.stockStatusFilter.addEventListener('change', () => {
    state.filters.stockStatus = elements.stockStatusFilter.value;
    resetToFirstPage();
    loadProducts();
  });

  elements.searchInput.addEventListener('input', debounce(() => {
    state.filters.search = elements.searchInput.value.trim();
    resetToFirstPage();
    loadProducts();
  }, 450));

  elements.sortSelect.addEventListener('change', () => {
    const [field, direction] = elements.sortSelect.value.split('_');
    state.sort.field = field;
    state.sort.direction = direction;
    resetToFirstPage();
    loadProducts();
  });

  elements.limitSelect.addEventListener('change', () => {
    state.limit = Number(elements.limitSelect.value);
    resetToFirstPage();
    loadProducts();
  });

  elements.prevPageBtn.addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      loadProducts();
    }
  });

  elements.nextPageBtn.addEventListener('click', () => {
    const totalPages = getTotalPages();
    if (state.page < totalPages) {
      state.page += 1;
      loadProducts();
    }
  });

  elements.addProductBtn.addEventListener('click', openAddProductModal);

  elements.productForm.addEventListener('submit', handleProductSubmit);
  elements.stockUpdateForm.addEventListener('submit', handleStockUpdateSubmit);
  elements.confirmDeleteBtn.addEventListener('click', confirmDeleteProduct);
  elements.resetFiltersBtn.addEventListener('click', resetFilters);

  document.querySelectorAll('[data-close-modal="true"]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', closeProductModal);
  });

  document.querySelectorAll('[data-close-detail="true"]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', closeDetailModal);
  });

  document.querySelectorAll('[data-close-stock="true"]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', closeStockModal);
  });

  document.querySelectorAll('[data-close-confirm="true"]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', closeConfirmModal);
  });
}

function updateCurrentDate() {
  const now = new Date();
  elements.currentDate.textContent = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function debounce(callback, delay) {
  let timerId;
  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), delay);
  };
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2600);
}

function resetToFirstPage() {
  state.page = 1;
}

async function fetchWithLog(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const startedAt = new Date();
  const requestUrl = url;
  const body = options.body;

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const parsed = isJson ? await response.json() : await response.text();
    const success = response.ok;

    recordActivity(method, requestUrl, response.status, success ? 'Success' : 'Failure', startedAt);

    if (!success) {
      const message = typeof parsed === 'object' && parsed && parsed.message
        ? parsed.message
        : 'Request failed';
      throw new Error(message);
    }

    return {
      data: parsed,
      status: response.status,
      headers: response.headers,
      ok: success
    };
  } catch (error) {
    const message = error.message || 'Unexpected API error';
    recordActivity(method, requestUrl, 0, 'Failure', startedAt);

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      showToast('JSON Server is unavailable. Please make sure the server is running on localhost:3000.', 'error');
    } else {
      showToast(message, 'error');
    }

    throw error;
  }
}

function recordActivity(method, endpoint, status, result, startedAt) {
  const now = new Date();
  const item = {
    method,
    endpoint,
    status,
    requestTime: startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    result,
    timestamp: now.toISOString()
  };

  state.activity.unshift(item);
  state.activity = state.activity.slice(0, 12);
  renderActivityLog();
}

function renderActivityLog() {
  if (!elements.apiLogContainer) return;

  if (!state.activity.length) {
    elements.apiLogContainer.innerHTML = '<div class="empty-state">No API requests yet.</div>';
    return;
  }

  elements.apiLogContainer.innerHTML = state.activity
    .map((entry) => {
      const methodClass = entry.method.toLowerCase();
      const statusClass = entry.result === 'Success' ? 'success' : 'failure';
      return `
        <div class="log-item">
          <div class="log-head">
            <span class="method-badge ${methodClass}">${entry.method}</span>
            <span class="log-status ${statusClass}">${entry.result}</span>
          </div>
          <div class="log-meta">
            <span><strong>Endpoint:</strong> ${entry.endpoint}</span>
            <span><strong>Status:</strong> ${entry.status}</span>
            <span><strong>Time:</strong> ${entry.requestTime}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function getTotalPages() {
  if (state.totalRecords === 0) return 1;
  return Math.ceil(state.totalRecords / state.limit);
}

function buildQueryParams() {
  const params = new URLSearchParams();

  if (state.filters.category !== 'all') {
    params.set('category', state.filters.category);
  }

  if (state.filters.minPrice !== '') {
    params.set('price_gte', state.filters.minPrice);
  }

  if (state.filters.maxPrice !== '') {
    params.set('price_lte', state.filters.maxPrice);
  }

  if (state.filters.stockStatus === 'in_stock') {
    params.set('stock_gte', '11');
  } else if (state.filters.stockStatus === 'low_stock') {
    params.set('stock_gte', '1');
    params.set('stock_lte', '10');
  } else if (state.filters.stockStatus === 'out_of_stock') {
    params.set('stock', '0');
  }

  if (state.filters.search) {
    params.set('q', state.filters.search);
  }

  params.set('_sort', state.sort.field);
  params.set('_order', state.sort.direction);
  params.set('_page', String(state.page));
  params.set('_limit', String(state.limit));

  return params;
}

async function loadDashboardStats() {
  try {
    const result = await fetchWithLog(PRODUCT_ENDPOINT);
    const products = Array.isArray(result.data) ? result.data : [];

    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((product) => {
      totalInventoryValue += Number(product.price) * Number(product.stock || 0);

      if (product.stock === 0) {
        outOfStockCount += 1;
      } else if (product.stock >= 1 && product.stock <= 10) {
        lowStockCount += 1;
      }
    });

    elements.totalProductsValue.textContent = products.length;
    elements.inventoryValueValue.textContent = formatCurrency(totalInventoryValue);
    elements.lowStockValue.textContent = lowStockCount;
    elements.outOfStockValue.textContent = outOfStockCount;
  } catch (error) {
    elements.totalProductsValue.textContent = '0';
    elements.inventoryValueValue.textContent = '৳0';
    elements.lowStockValue.textContent = '0';
    elements.outOfStockValue.textContent = '0';
  }
}

async function loadProducts() {
  const params = buildQueryParams();
  const queryString = params.toString();
  const endpoint = queryString ? `${PRODUCT_ENDPOINT}?${queryString}` : PRODUCT_ENDPOINT;

  try {
    const result = await fetchWithLog(endpoint);
    const products = Array.isArray(result.data) ? result.data : [];
    const totalCount = Number(result.headers.get('X-Total-Count') || 0);
    state.totalRecords = totalCount;

    const totalPages = getTotalPages();

    if (state.page > totalPages) {
      state.page = Math.max(1, totalPages);
      return loadProducts();
    }

    renderProducts(products);
    renderPagination();
  } catch (error) {
    elements.productTableBody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">Unable to load products. Please check the JSON Server connection.</div>
        </td>
      </tr>
    `;
  }
}

function renderProducts(products) {
  if (!products.length) {
    elements.productTableBody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">No products found for the selected filters.</div>
        </td>
      </tr>
    `;
    return;
  }

  elements.productTableBody.innerHTML = products
    .map((product) => {
      const status = getStockStatus(product.stock);
      return `
        <tr>
          <td>#${product.id}</td>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(product.category)}</td>
          <td>${escapeHtml(product.brand)}</td>
          <td>${formatCurrency(product.price)}</td>
          <td>${product.stock}</td>
          <td><span class="status-badge ${status.className}">${status.label}</span></td>
          <td>${formatDate(product.updatedAt || product.createdAt)}</td>
          <td>
            <div class="action-buttons">
              <button type="button" class="link-btn primary-link" data-view-product="${product.id}">View Details</button>
              <button type="button" class="link-btn" data-edit-product="${product.id}">Edit Product</button>
              <button type="button" class="link-btn warning-link" data-stock-product="${product.id}">Quick Stock Update</button>
              <button type="button" class="link-btn danger-link" data-delete-product="${product.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  document.querySelectorAll('[data-view-product]').forEach((button) => {
    button.addEventListener('click', () => viewProductDetails(Number(button.dataset.viewProduct)));
  });

  document.querySelectorAll('[data-edit-product]').forEach((button) => {
    button.addEventListener('click', () => openEditProductModal(Number(button.dataset.editProduct)));
  });

  document.querySelectorAll('[data-stock-product]').forEach((button) => {
    button.addEventListener('click', () => openStockUpdateModal(Number(button.dataset.stockProduct)));
  });

  document.querySelectorAll('[data-delete-product]').forEach((button) => {
    button.addEventListener('click', () => confirmProductDelete(Number(button.dataset.deleteProduct)));
  });
}

function renderPagination() {
  const totalPages = getTotalPages();

  elements.prevPageBtn.disabled = state.page <= 1;
  elements.nextPageBtn.disabled = state.page >= totalPages;
  elements.pageInfo.textContent = `Page ${state.page} of ${totalPages}`;
  elements.totalRecordsText.textContent = `${state.totalRecords} records`;
}

function formatCurrency(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0
  }).format(numericValue);
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getStockStatus(stock) {
  const quantity = Number(stock || 0);

  if (quantity === 0) {
    return { label: 'Out of Stock', className: 'out-of-stock' };
  }

  if (quantity >= 1 && quantity <= 10) {
    return { label: 'Low Stock', className: 'low-stock' };
  }

  return { label: 'In Stock', className: 'in-stock' };
}

function openAddProductModal() {
  elements.modalTitle.textContent = 'Add New Product';
  elements.submitProductBtn.textContent = 'Save Product';
  elements.productForm.reset();
  state.currentProductId = null;
  elements.productModal.classList.remove('hidden');
}

function openEditProductModal(productId) {
  state.currentProductId = productId;
  elements.modalTitle.textContent = 'Edit Product';
  elements.submitProductBtn.textContent = 'Update Product';

  fetchWithLog(`${PRODUCT_ENDPOINT}/${productId}`)
    .then((result) => {
      const product = result.data;
      elements.productNameInput.value = product.name || '';
      elements.categoryNameInput.value = product.category || '';
      elements.brandNameInput.value = product.brand || '';
      elements.priceInput.value = product.price || '';
      elements.stockInput.value = product.stock || 0;
      elements.descriptionInput.value = product.description || '';
      elements.productModal.classList.remove('hidden');
    })
    .catch(() => {
      showToast('Unable to load product details for editing.', 'error');
    });
}

function closeProductModal() {
  elements.productModal.classList.add('hidden');
  elements.productForm.reset();
  state.currentProductId = null;
}

function continueProductFormSubmit() {
  const formData = new FormData(elements.productForm);
  const productData = {
    name: formData.get('name').toString().trim(),
    category: formData.get('category').toString().trim(),
    brand: formData.get('brand').toString().trim(),
    description: formData.get('description').toString().trim(),
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock'))
  };

  if (!productData.name || !productData.category || !productData.brand || !productData.description) {
    showToast('Please fill in all product fields.', 'error');
    return null;
  }

  if (!Number.isFinite(productData.price) || productData.price <= 0) {
    showToast('Price must be a valid number greater than zero.', 'error');
    return null;
  }

  if (!Number.isInteger(productData.stock) || productData.stock < 0) {
    showToast('Stock quantity must be a non-negative integer.', 'error');
    return null;
  }

  return productData;
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const productData = continueProductFormSubmit();
  if (!productData) return;

  const submitButton = elements.submitProductBtn;
  submitButton.disabled = true;

  const timestamp = new Date().toISOString();

  try {
    if (state.currentProductId) {
      const existing = await fetchWithLog(`${PRODUCT_ENDPOINT}/${state.currentProductId}`);
      const updatedProduct = {
        ...existing.data,
        ...productData,
        price: Number(productData.price),
        stock: Number(productData.stock),
        updatedAt: timestamp
      };

      await fetchWithLog(`${PRODUCT_ENDPOINT}/${state.currentProductId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProduct)
      });

      showToast('Product updated successfully.', 'success');
    } else {
      await fetchWithLog(PRODUCT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          ...productData,
          createdAt: timestamp,
          updatedAt: timestamp
        })
      });

      showToast('Product created successfully.', 'success');
    }

    closeProductModal();
    await loadDashboardStats();
    resetToFirstPage();
    await loadProducts();
  } catch (error) {
    showToast('Product operation failed. Please try again.', 'error');
  } finally {
    submitButton.disabled = false;
  }
}

function confirmProductDelete(productId) {
  state.currentConfirmDelete = productId;
  fetchWithLog(`${PRODUCT_ENDPOINT}/${productId}`)
    .then((result) => {
      const product = result.data;
      elements.confirmMessage.textContent = `Are you sure you want to delete "${product.name}"? This action cannot be undone.`;
      elements.confirmModal.classList.remove('hidden');
    })
    .catch(() => {
      showToast('Unable to load the selected product for deletion.', 'error');
    });
}

function closeConfirmModal() {
  elements.confirmModal.classList.add('hidden');
  state.currentConfirmDelete = null;
}

async function confirmDeleteProduct() {
  if (!state.currentConfirmDelete) return;

  const productId = state.currentConfirmDelete;
  elements.confirmDeleteBtn.disabled = true;

  try {
    await fetchWithLog(`${PRODUCT_ENDPOINT}/${productId}`, {
      method: 'DELETE'
    });

    showToast('Product deleted successfully.', 'success');
    closeConfirmModal();

    const totalPagesAfterDelete = getTotalPages();
    if (state.page > totalPagesAfterDelete) {
      state.page = Math.max(1, totalPagesAfterDelete);
    }

    await loadDashboardStats();
    await loadProducts();
  } catch (error) {
    showToast('Delete operation failed.', 'error');
  } finally {
    elements.confirmDeleteBtn.disabled = false;
  }
}

async function viewProductDetails(productId) {
  try {
    const result = await fetchWithLog(`${PRODUCT_ENDPOINT}/${productId}`);
    const product = result.data;

    elements.detailModalTitle.textContent = product.name;
    elements.detailContent.innerHTML = `
      <div class="detail-grid">
        <div class="detail-box">
          <strong>Category</strong>
          <span>${escapeHtml(product.category)}</span>
        </div>
        <div class="detail-box">
          <strong>Brand</strong>
          <span>${escapeHtml(product.brand)}</span>
        </div>
        <div class="detail-box">
          <strong>Price</strong>
          <span>${formatCurrency(product.price)}</span>
        </div>
        <div class="detail-box">
          <strong>Stock</strong>
          <span>${product.stock}</span>
        </div>
        <div class="detail-box">
          <strong>Status</strong>
          <span class="status-badge ${getStockStatus(product.stock).className}">${getStockStatus(product.stock).label}</span>
        </div>
        <div class="detail-box">
          <strong>Last Updated</strong>
          <span>${formatDate(product.updatedAt || product.createdAt)}</span>
        </div>
      </div>
      <div class="detail-box">
        <strong>Description</strong>
        <p>${escapeHtml(product.description || 'No description available.')}</p>
      </div>
    `;

    elements.detailModal.classList.remove('hidden');
  } catch (error) {
    showToast('Unable to fetch product details.', 'error');
  }
}

function closeDetailModal() {
  elements.detailModal.classList.add('hidden');
}

function openStockUpdateModal(productId) {
  fetchWithLog(`${PRODUCT_ENDPOINT}/${productId}`)
    .then((result) => {
      const product = result.data;
      elements.currentStockDisplay.value = product.stock;
      elements.newStockInput.value = product.stock;
      state.currentProductId = product.id;
      elements.stockUpdateModal.classList.remove('hidden');
    })
    .catch(() => {
      showToast('Unable to open stock update form.', 'error');
    });
}

function closeStockModal() {
  elements.stockUpdateModal.classList.add('hidden');
  elements.stockUpdateForm.reset();
  state.currentProductId = null;
}

async function handleStockUpdateSubmit(event) {
  event.preventDefault();

  if (!state.currentProductId) return;

  const newStock = Number(elements.newStockInput.value);
  if (!Number.isInteger(newStock) || newStock < 0) {
    showToast('Stock quantity must be a valid non-negative integer.', 'error');
    return;
  }

  try {
    await fetchWithLog(`${PRODUCT_ENDPOINT}/${state.currentProductId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stock: newStock,
        updatedAt: new Date().toISOString()
      })
    });

    showToast('Stock updated successfully.', 'success');
    closeStockModal();
    await loadDashboardStats();
    await loadProducts();
  } catch (error) {
    showToast('Unable to update stock quantity.', 'error');
  }
}

function resetFilters() {
  state.filters = {
    category: 'all',
    minPrice: '',
    maxPrice: '',
    stockStatus: 'all',
    search: ''
  };

  state.sort = {
    field: 'name',
    direction: 'asc'
  };

  state.page = 1;
  state.limit = DEFAULT_LIMIT;

  elements.categoryFilter.value = 'all';
  elements.minPriceInput.value = '';
  elements.maxPriceInput.value = '';
  elements.stockStatusFilter.value = 'all';
  elements.searchInput.value = '';
  elements.sortSelect.value = 'name_asc';
  elements.limitSelect.value = String(DEFAULT_LIMIT);

  loadProducts();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
