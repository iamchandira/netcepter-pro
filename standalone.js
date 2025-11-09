/**
 * NetCepter Pro - Standalone Panel Logic
 * 
 * © Copyright 2025 | Chandira Ekanayaka | https://iamchandira.com
 * 
 * Handles UI interactions, request display, and communication with background worker
 * Adapted for standalone window (not DevTools)
 */

let port = null;
let requests = new Map();
let selectedRequestId = null;
let interceptionEnabled = true;
let selectedTabId = null;
let filters = {
  url: '',
  method: '',
  type: ''
};

// Initialize panel
document.addEventListener('DOMContentLoaded', () => {
  // Setup UI event listeners
  setupEventListeners();
  
  // Restore settings from storage
  restoreSettings();
  
  // Show tab selector if no tab is selected
  showTabSelector();
});

// Show tab selector
function showTabSelector() {
  const tabSelector = document.getElementById('tab-selector');
  const mainContent = document.querySelector('.main-content');
  const filters = document.querySelector('.filters');
  
  if (!selectedTabId) {
    tabSelector.style.display = 'flex';
    mainContent.style.display = 'none';
    filters.style.display = 'none';
    loadTabs();
  } else {
    tabSelector.style.display = 'none';
    mainContent.style.display = 'grid';
    filters.style.display = 'flex';
  }
}

// Load available tabs
async function loadTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const tabsList = document.getElementById('tabs-list');
    tabsList.innerHTML = '';
    
    tabs.forEach(tab => {
      const tabItem = document.createElement('div');
      tabItem.className = 'tab-item';
      tabItem.innerHTML = `
        <div class="tab-item-icon">
          ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" alt="">` : '🌐'}
        </div>
        <div class="tab-item-info">
          <div class="tab-item-title">${escapeHtml(tab.title || 'Untitled')}</div>
          <div class="tab-item-url">${escapeHtml(tab.url || '')}</div>
        </div>
      `;
      
      tabItem.addEventListener('click', () => {
        selectTab(tab.id);
      });
      
      tabsList.appendChild(tabItem);
    });
  } catch (error) {
    console.error('Failed to load tabs:', error);
  }
}

// Select a tab
function selectTab(tabId) {
  selectedTabId = tabId;
  showTabSelector();
  connectToBackground();
}

// Connect to background script
function connectToBackground() {
  if (!selectedTabId) {
    return;
  }
  
  port = chrome.runtime.connect({ name: 'standalone-panel' });
  
  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'DEBUGGER_ATTACHED':
        updateStatus('Connected', 'connected');
        break;
        
      case 'DEBUGGER_DETACHED':
        updateStatus('Disconnected', 'error');
        break;
        
      case 'DEBUGGER_ERROR':
        updateStatus('Error: ' + msg.error, 'error');
        showNotification('Failed to attach debugger: ' + msg.error, 'error');
        break;
        
      case 'REQUEST_INTERCEPTED':
        handleRequestIntercepted(msg);
        break;
        
      case 'RESPONSE_INTERCEPTED':
        handleResponseIntercepted(msg);
        break;
        
      case 'RESPONSE_BODY':
        handleResponseBody(msg);
        break;
        
      case 'RESPONSE_BODY_ERROR':
        console.error('Failed to get response body:', msg.error);
        break;
    }
  });
  
  port.onDisconnect.addListener(() => {
    updateStatus('Disconnected', 'inactive');
  });
  
  // Attach debugger to selected tab
  port.postMessage({ type: 'ATTACH_DEBUGGER', tabId: selectedTabId });
}

// Setup event listeners
function setupEventListeners() {
  // Select tab button
  document.getElementById('select-tab-btn').addEventListener('click', () => {
    selectedTabId = null;
    showTabSelector();
  });
  
  // Refresh tabs button
  document.getElementById('refresh-tabs-btn').addEventListener('click', () => {
    loadTabs();
  });
  
  // Clear button
  document.getElementById('clear-btn').addEventListener('click', () => {
    clearRequests();
  });
  
  // Intercept toggle
  document.getElementById('intercept-toggle').addEventListener('change', (e) => {
    interceptionEnabled = e.target.checked;
    saveSettings();
  });
  
  // Filters
  document.getElementById('url-filter').addEventListener('input', (e) => {
    filters.url = e.target.value.toLowerCase();
    applyFilters();
  });
  
  document.getElementById('method-filter').addEventListener('change', (e) => {
    filters.method = e.target.value;
    applyFilters();
  });
  
  document.getElementById('type-filter').addEventListener('change', (e) => {
    filters.type = e.target.value;
    applyFilters();
  });
  
  // Close details button
  document.getElementById('close-details').addEventListener('click', () => {
    deselectRequest();
  });
  
  // Reconnect button
  document.getElementById('reconnect-btn').addEventListener('click', () => {
    reconnectDebugger();
  });
  
  // Action buttons
  document.getElementById('continue-btn').addEventListener('click', () => {
    continueRequest(false);
  });
  
  document.getElementById('continue-modified-btn').addEventListener('click', () => {
    continueRequest(true);
  });
  
  document.getElementById('block-btn').addEventListener('click', () => {
    blockRequest();
  });
}

// Handle intercepted request
function handleRequestIntercepted(data) {
  if (!interceptionEnabled) {
    port.postMessage({
      type: 'CONTINUE_REQUEST',
      requestId: data.requestId
    });
    return;
  }
  
  const request = {
    id: data.requestId,
    networkId: data.networkId,
    url: data.url,
    method: data.method,
    headers: data.headers,
    postData: data.postData,
    resourceType: data.resourceType || 'other',
    timestamp: data.timestamp,
    status: 'paused',
    type: 'request',
    isPaused: true
  };
  
  requests.set(data.requestId, request);
  addRequestToList(request);
  updateRequestCount();
}

// Handle intercepted response
function handleResponseIntercepted(data) {
  if (!interceptionEnabled) {
    port.postMessage({
      type: 'CONTINUE_RESPONSE',
      requestId: data.requestId
    });
    return;
  }
  
  const request = requests.get(data.requestId);
  
  if (request) {
    request.status = 'paused';
    request.responseStatus = data.status;
    request.responseStatusText = data.statusText;
    request.responseHeaders = data.headers;
    request.resourceType = data.resourceType || request.resourceType || 'other';
    request.type = 'response';
    request.isPaused = true;
    
    updateRequestInList(request);
  } else {
    const newRequest = {
      id: data.requestId,
      networkId: data.networkId,
      url: data.url,
      method: data.method,
      resourceType: data.resourceType || 'other',
      timestamp: data.timestamp,
      status: 'paused',
      responseStatus: data.status,
      responseStatusText: data.statusText,
      responseHeaders: data.headers,
      type: 'response',
      isPaused: true
    };
    
    requests.set(data.requestId, newRequest);
    addRequestToList(newRequest);
  }
  
  updateRequestCount();
}

// Handle response body
function handleResponseBody(data) {
  const request = requests.get(data.requestId);
  if (request) {
    if (data.notAvailable) {
      request.responseBody = '(Response body not available)';
    } else if (data.body) {
      try {
        request.responseBody = data.base64Encoded ? atob(data.body) : data.body;
      } catch (e) {
        console.error('Failed to decode response body:', e);
        request.responseBody = '(Failed to decode response body)';
      }
    } else {
      request.responseBody = '';
    }
    
    if (selectedRequestId === data.requestId) {
      displayRequestDetails(request);
    }
  }
}

// Add request to list
function addRequestToList(request) {
  const requestList = document.getElementById('request-list');
  const emptyState = document.getElementById('empty-state');
  
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  if (!matchesFilters(request)) {
    return;
  }
  
  const item = createRequestItem(request);
  requestList.insertBefore(item, requestList.firstChild);
}

// Create request item element
function createRequestItem(request) {
  const item = document.createElement('div');
  item.className = 'request-item';
  item.dataset.requestId = request.id;
  
  if (request.isPaused) {
    item.classList.add('paused');
  }
  
  if (selectedRequestId === request.id) {
    item.classList.add('selected');
  }
  
  const method = document.createElement('span');
  method.className = `request-method ${request.method}`;
  method.textContent = request.method;
  
  const info = document.createElement('div');
  info.className = 'request-info';
  
  const url = document.createElement('div');
  url.className = 'request-url';
  url.textContent = request.url;
  url.title = request.url;
  
  const meta = document.createElement('div');
  meta.className = 'request-meta';
  
  const time = document.createElement('span');
  time.textContent = new Date(request.timestamp).toLocaleTimeString();
  
  meta.appendChild(time);
  
  if (request.resourceType) {
    const type = document.createElement('span');
    type.textContent = request.resourceType.charAt(0).toUpperCase() + request.resourceType.slice(1);
    type.style.color = 'var(--text-tertiary)';
    meta.appendChild(type);
  }
  
  if (request.responseStatus) {
    const status = document.createElement('span');
    status.textContent = `${request.responseStatus} ${request.responseStatusText || ''}`;
    meta.appendChild(status);
  }
  
  info.appendChild(url);
  info.appendChild(meta);
  
  const statusIndicator = document.createElement('span');
  statusIndicator.className = `request-status ${request.status}`;
  statusIndicator.textContent = request.isPaused ? 'PAUSED' : request.status.toUpperCase();
  
  item.appendChild(method);
  item.appendChild(info);
  item.appendChild(statusIndicator);
  
  item.addEventListener('click', () => {
    selectRequest(request.id);
  });
  
  return item;
}

// Update request in list
function updateRequestInList(request) {
  const item = document.querySelector(`[data-request-id="${request.id}"]`);
  if (item) {
    item.replaceWith(createRequestItem(request));
  }
}

// Select request
function selectRequest(requestId) {
  selectedRequestId = requestId;
  
  document.querySelectorAll('.request-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  const selectedItem = document.querySelector(`[data-request-id="${requestId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
  
  const request = requests.get(requestId);
  if (request) {
    displayRequestDetails(request);
  }
}

// Deselect request
function deselectRequest() {
  selectedRequestId = null;
  
  document.querySelectorAll('.request-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  const detailsContent = document.getElementById('details-content');
  const detailsContainer = document.getElementById('details-container');
  
  detailsContainer.classList.remove('show');
  
  detailsContent.innerHTML = `
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18M15 3v18"/>
      </svg>
      <p>Select a request to view details</p>
    </div>
  `;
  
  document.getElementById('action-buttons').style.display = 'none';
}

// Display request details
function displayRequestDetails(request) {
  const detailsContent = document.getElementById('details-content');
  const detailsContainer = document.getElementById('details-container');
  const actionButtons = document.getElementById('action-buttons');
  
  detailsContainer.classList.add('show');
  
  let html = '';
  
  // Tabs
  html += '<div class="details-tabs">';
  html += '<button class="tab-btn active" data-tab="request">Request</button>';
  if (request.responseStatus) {
    html += '<button class="tab-btn" data-tab="response">Response</button>';
  }
  html += '</div>';
  
  // Request tab
  html += '<div class="tab-content active" data-tab-content="request">';
  
  // URL
  html += '<div class="detail-section">';
  html += '<div class="detail-field">';
  html += '<label>URL</label>';
  html += `<input type="text" id="edit-url" value="${escapeHtml(request.url)}" ${!request.isPaused ? 'disabled' : ''}>`;
  html += '</div>';
  html += '</div>';
  
  // Method
  html += '<div class="detail-section">';
  html += '<div class="detail-field">';
  html += '<label>Method</label>';
  html += `<select id="edit-method" ${!request.isPaused ? 'disabled' : ''}>`;
  ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].forEach(m => {
    html += `<option value="${m}" ${request.method === m ? 'selected' : ''}>${m}</option>`;
  });
  html += '</select>';
  html += '</div>';
  html += '</div>';
  
  // Headers
  html += '<div class="detail-section">';
  html += '<div class="detail-section-title">Request Headers</div>';
  html += '<div class="headers-editor" id="request-headers-editor">';
  
  const headers = request.headers || {};
  Object.entries(headers).forEach(([key, value]) => {
    html += createHeaderRowHtml(key, value, !request.isPaused);
  });
  
  if (request.isPaused) {
    html += '<button class="add-header-btn" data-editor="request-headers-editor">+ Add Header</button>';
  }
  html += '</div>';
  html += '</div>';
  
  // Body
  if (request.postData || request.method !== 'GET') {
    html += '<div class="detail-section">';
    html += '<div class="detail-field">';
    html += '<label>Request Body</label>';
    html += `<textarea id="edit-body" ${!request.isPaused ? 'disabled' : ''}>${escapeHtml(request.postData || '')}</textarea>`;
    html += '</div>';
    html += '</div>';
  }
  
  html += '</div>';
  
  // Response tab
  if (request.responseStatus) {
    html += '<div class="tab-content" data-tab-content="response">';
    
    // Status
    html += '<div class="detail-section">';
    html += '<div class="detail-field">';
    html += '<label>Status Code</label>';
    html += `<input type="number" id="edit-status" value="${request.responseStatus}" ${!request.isPaused ? 'disabled' : ''}>`;
    html += '</div>';
    html += '</div>';
    
    // Response Headers
    html += '<div class="detail-section">';
    html += '<div class="detail-section-title">Response Headers</div>';
    html += '<div class="headers-editor" id="response-headers-editor">';
    
    if (request.responseHeaders && request.responseHeaders.length > 0) {
      request.responseHeaders.forEach(header => {
        html += createHeaderRowHtml(header.name, header.value, !request.isPaused);
      });
    }
    
    if (request.isPaused) {
      html += '<button class="add-header-btn" data-editor="response-headers-editor">+ Add Header</button>';
    }
    html += '</div>';
    html += '</div>';
    
    // Response Body
    html += '<div class="detail-section">';
    html += '<div class="detail-field">';
    html += '<label>Response Body</label>';
    html += `<textarea id="edit-response-body" ${!request.isPaused ? 'disabled' : ''}>${escapeHtml(request.responseBody || 'Loading...')}</textarea>`;
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    // Fetch response body if not loaded
    if (!request.responseBody && request.isPaused) {
      port.postMessage({
        type: 'GET_RESPONSE_BODY',
        tabId: selectedTabId,
        requestId: request.id
      });
    }
  }
  
  detailsContent.innerHTML = html;
  
  // Setup tab switching
  setupTabs();
  
  // Setup header editor event listeners
  setupHeaderEditors();
  
  // Show/hide action buttons
  if (request.isPaused) {
    actionButtons.style.display = 'flex';
  } else {
    actionButtons.style.display = 'none';
  }
}

// Create header row HTML
function createHeaderRowHtml(key, value, disabled) {
  return `
    <div class="header-row">
      <input type="text" value="${escapeHtml(key)}" placeholder="Header name" ${disabled ? 'disabled' : ''}>
      <input type="text" value="${escapeHtml(value)}" placeholder="Header value" ${disabled ? 'disabled' : ''}>
      ${!disabled ? '<button class="btn-text remove-header-btn" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' : ''}
    </div>
  `;
}

// Setup header editor event listeners
function setupHeaderEditors() {
  // Add header buttons
  document.querySelectorAll('.add-header-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const editorId = btn.dataset.editor;
      const editor = document.getElementById(editorId);
      const addBtn = editor.querySelector('.add-header-btn');
      
      const newRow = document.createElement('div');
      newRow.innerHTML = createHeaderRowHtml('', '', false);
      const newRowElement = newRow.firstElementChild;
      
      // Setup remove button listener for new row
      const removeBtn = newRowElement.querySelector('.remove-header-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          newRowElement.remove();
        });
      }
      
      editor.insertBefore(newRowElement, addBtn);
    });
  });
  
  // Remove header buttons
  document.querySelectorAll('.remove-header-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.header-row').remove();
    });
  });
}

// Setup tabs
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      const content = document.querySelector(`[data-tab-content="${tabName}"]`);
      if (content) {
        content.classList.add('active');
      }
    });
  });
}

// Continue request with or without modifications
function continueRequest(withModifications) {
  const request = requests.get(selectedRequestId);
  if (!request || !request.isPaused) return;
  
  if (request.type === 'request') {
    const message = {
      type: 'CONTINUE_REQUEST',
      requestId: request.id
    };
    
    if (withModifications) {
      const modifications = {};
      let hasModifications = false;
      
      const url = document.getElementById('edit-url')?.value;
      if (url && url !== request.url) {
        modifications.url = url;
        hasModifications = true;
      }
      
      const method = document.getElementById('edit-method')?.value;
      if (method && method !== request.method) {
        modifications.method = method;
        hasModifications = true;
      }
      
      // Get headers from editor
      const headers = getHeadersFromEditor('request-headers-editor');
      // Compare with original headers to see if they changed
      const originalHeaders = request.headers || {};
      const originalHeadersArray = Object.entries(originalHeaders)
        .map(([name, value]) => ({ name: String(name).trim(), value: String(value).trim() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      if (headers && Object.keys(headers).length > 0) {
        // Convert to array format required by Fetch.continueRequest
        const headerArray = Object.entries(headers)
          .filter(([name, value]) => name && value) // Filter out empty headers
          .map(([name, value]) => ({ name: String(name).trim(), value: String(value).trim() }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        // Only add headers if they're different from original
        if (headerArray.length > 0) {
          // Check if headers changed
          const headersChanged = JSON.stringify(originalHeadersArray) !== JSON.stringify(headerArray);
          if (headersChanged) {
            modifications.headers = headerArray;
            hasModifications = true;
          }
        }
      }
      
      const body = document.getElementById('edit-body')?.value;
      const originalBody = request.postData || '';
      if (body !== undefined && body !== originalBody) {
        modifications.postData = body;
        hasModifications = true;
      }
      
      // Only send modifications if there are actual changes
      if (hasModifications && Object.keys(modifications).length > 0) {
        message.modifications = modifications;
      }
      // If no modifications, continue without modifications object
    }
    
    port.postMessage(message);
    
  } else if (request.type === 'response') {
    const message = {
      type: 'CONTINUE_RESPONSE',
      requestId: request.id
    };
    
    if (withModifications) {
      const modifications = {};
      
      const status = document.getElementById('edit-status')?.value;
      if (status && parseInt(status) !== request.responseStatus) {
        modifications.responseCode = parseInt(status);
      }
      
      const headers = getHeadersFromEditor('response-headers-editor');
      if (headers && Object.keys(headers).length > 0) {
        modifications.responseHeaders = Object.entries(headers).map(([name, value]) => ({ name, value }));
      }
      
      const body = document.getElementById('edit-response-body')?.value;
      if (body !== undefined && 
          body !== 'Loading...' && 
          body !== '(Response body not available)' &&
          body !== '(Failed to decode response body)') {
        modifications.body = body;
      }
      
      message.modifications = modifications;
    }
    
    port.postMessage(message);
  }
  
  request.isPaused = false;
  request.status = 'completed';
  updateRequestInList(request);
  displayRequestDetails(request);
}

// Block request
function blockRequest() {
  const request = requests.get(selectedRequestId);
  if (!request || !request.isPaused) return;
  
  port.postMessage({
    type: 'BLOCK_REQUEST',
    requestId: request.id
  });
  
  request.isPaused = false;
  request.status = 'blocked';
  updateRequestInList(request);
  displayRequestDetails(request);
}

// Get headers from editor
function getHeadersFromEditor(editorId) {
  const editor = document.getElementById(editorId);
  if (!editor) return null;
  
  const headers = {};
  const rows = editor.querySelectorAll('.header-row');
  
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0]?.value.trim();
    const value = inputs[1]?.value.trim();
    
    if (key && value) {
      headers[key] = value;
    }
  });
  
  return headers;
}

function clearRequests() {
  requests.clear();
  selectedRequestId = null;
  
  const requestList = document.getElementById('request-list');
  requestList.innerHTML = `
    <div class="empty-state" id="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h.01M12 10h.01M16 10h.01"/>
      </svg>
      <p>No requests intercepted yet</p>
      <small>Select a tab and browse the web to see requests appear here</small>
    </div>
  `;
  
  const detailsContent = document.getElementById('details-content');
  detailsContent.innerHTML = `
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18M15 3v18"/>
      </svg>
      <p>Select a request to view details</p>
    </div>
  `;
  
  document.getElementById('action-buttons').style.display = 'none';
  updateRequestCount();
}

function applyFilters() {
  const requestList = document.getElementById('request-list');
  const items = requestList.querySelectorAll('.request-item');
  
  let visibleCount = 0;
  
  items.forEach(item => {
    const requestId = item.dataset.requestId;
    const request = requests.get(requestId);
    
    if (request && matchesFilters(request)) {
      item.style.display = '';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    emptyState.style.display = visibleCount === 0 ? 'flex' : 'none';
  }
}

function matchesFilters(request) {
  if (filters.url && !request.url.toLowerCase().includes(filters.url)) {
    return false;
  }
  
  if (filters.method && request.method !== filters.method) {
    return false;
  }
  
  if (filters.type && request.resourceType) {
    const requestType = request.resourceType.toLowerCase();
    const filterType = filters.type.toLowerCase();
    
    if (requestType !== filterType) {
      return false;
    }
  }
  
  return true;
}

function updateRequestCount() {
  const count = requests.size;
  document.getElementById('request-count').textContent = count;
}

function updateStatus(text, state = 'connected') {
  const indicator = document.getElementById('status-indicator');
  const statusText = indicator.querySelector('.status-text');
  const reconnectBtn = document.getElementById('reconnect-btn');
  
  statusText.textContent = text;
  
  indicator.classList.remove('connected', 'error', 'inactive');
  indicator.classList.add(state);
  
  if (state === 'error' || state === 'inactive') {
    reconnectBtn.style.display = 'inline-flex';
  } else {
    reconnectBtn.style.display = 'none';
  }
}

function reconnectDebugger() {
  updateStatus('Reconnecting...', 'inactive');
  
  if (port) {
    try {
      port.disconnect();
    } catch (e) {
      // Port already disconnected
    }
  }
  
  requests.clear();
  selectedRequestId = null;
  clearRequests();
  
  try {
    connectToBackground();
    showNotification('Reconnecting to debugger...', 'info');
  } catch (error) {
    console.error('Failed to reconnect:', error);
    updateStatus('Reconnection failed', 'error');
    showNotification('Failed to reconnect debugger: ' + error.message, 'error');
  }
}

function showNotification(message, type = 'info') {
  if (type === 'error' || type === 'warning') {
    console.error(`[${type.toUpperCase()}] ${message}`);
  }
}

function saveSettings() {
  chrome.storage.local.set({
    interceptionEnabled: interceptionEnabled,
    filters: filters
  });
}

function restoreSettings() {
  chrome.storage.local.get(['interceptionEnabled', 'filters'], (result) => {
    if (result.interceptionEnabled !== undefined) {
      interceptionEnabled = result.interceptionEnabled;
      document.getElementById('intercept-toggle').checked = interceptionEnabled;
    }
    
    if (result.filters) {
      filters = result.filters;
      document.getElementById('url-filter').value = filters.url || '';
      document.getElementById('method-filter').value = filters.method || '';
      document.getElementById('type-filter').value = filters.type || '';
    }
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

