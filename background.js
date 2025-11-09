/**
 * NetCepter Pro - Background Service Worker
 * 
 * © Copyright 2025 | Chandira Ekanayaka | https://iamchandira.com
 * 
 * Uses Chrome Debugger API to intercept network requests and responses
 */

const attachedTabs = new Map(); // Track debugger attachments
const pendingRequests = new Map(); // Store paused requests
const requestData = new Map(); // Store request information

// Helper function to safely send messages through port
function safePostMessage(port, message) {
  if (!port) {
    return false;
  }
  
  try {
    port.postMessage(message);
    return true;
  } catch (error) {
    if (error.message && error.message.includes('disconnected')) {
      return false;
    }
    throw error;
  }
}

// Listen for messages from DevTools panel
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    
    switch (msg.type) {
      case 'ATTACH_DEBUGGER':
        await attachDebugger(msg.tabId, port);
        break;
        
      case 'DETACH_DEBUGGER':
        await detachDebugger(msg.tabId);
        break;
        
      case 'CONTINUE_REQUEST':
        continueRequest(msg.requestId, msg.modifications);
        break;
        
      case 'CONTINUE_RESPONSE':
        continueResponse(msg.requestId, msg.modifications);
        break;
        
      case 'BLOCK_REQUEST':
        blockRequest(msg.requestId);
        break;
        
      case 'GET_RESPONSE_BODY':
        await getResponseBody(msg.tabId, msg.requestId, port);
        break;
    }
  });
  
  port.onDisconnect.addListener(() => {
    // Clean up on disconnect
  });
});

// Attach debugger to a tab
async function attachDebugger(tabId, port) {
  try {
    const target = { tabId: tabId };
    
    // Check if already attached
    if (attachedTabs.has(tabId)) {
      try {
        port.postMessage({ type: 'DEBUGGER_ATTACHED', tabId });
      } catch (e) {
        // Port disconnected, clean up
        attachedTabs.delete(tabId);
      }
      return;
    }
    
    await chrome.debugger.attach(target, '1.3');
    
    // Enable Network domain
    await chrome.debugger.sendCommand(target, 'Network.enable');
    
    // Enable Fetch domain for request interception
    await chrome.debugger.sendCommand(target, 'Fetch.enable', {
      patterns: [{ urlPattern: '*', requestStage: 'Request' }, { urlPattern: '*', requestStage: 'Response' }]
    });
    
    attachedTabs.set(tabId, { port, target });
    
    try {
      port.postMessage({ type: 'DEBUGGER_ATTACHED', tabId });
    } catch (e) {
      // Port disconnected during attachment, clean up
      if (e.message && e.message.includes('disconnected')) {
        attachedTabs.delete(tabId);
        await chrome.debugger.detach(target);
      }
    }
    
  } catch (error) {
    console.error('Failed to attach debugger:', error);
    try {
      port.postMessage({ type: 'DEBUGGER_ERROR', error: error.message });
    } catch (e) {
      // Port disconnected, can't send error
    }
  }
}

// Detach debugger from a tab
async function detachDebugger(tabId) {
  try {
    if (!attachedTabs.has(tabId)) {
      return;
    }
    
    const target = { tabId: tabId };
    await chrome.debugger.detach(target);
    attachedTabs.delete(tabId);
    pendingRequests.clear();
    requestData.clear();
  } catch (error) {
    console.error('Failed to detach debugger:', error);
  }
}

// Listen to debugger events
chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  const tabData = attachedTabs.get(tabId);
  
  if (!tabData || !tabData.port) {
    return;
  }
  
  switch (method) {
    case 'Fetch.requestPaused':
      handleRequestPaused(tabId, params, tabData.port);
      break;
      
    case 'Network.responseReceived':
      handleResponseReceived(tabId, params, tabData.port);
      break;
  }
});

// Handle paused request/response
async function handleRequestPaused(tabId, params, port) {
  const { requestId, request, responseStatusCode, responseHeaders, networkId, resourceType } = params;
  
  // Store pending request
  pendingRequests.set(requestId, { tabId, params });
  
  // Check if port is still connected
  if (!port) {
    console.error('Port is not available for tab', tabId);
    return;
  }
  
  try {
    if (responseStatusCode) {
      // This is a response interception
      const data = {
        type: 'RESPONSE_INTERCEPTED',
        requestId: requestId,
        networkId: networkId,
        url: request.url,
        method: request.method,
        status: responseStatusCode,
        statusText: getStatusText(responseStatusCode),
        headers: responseHeaders || [],
        resourceType: resourceType || 'other',
        timestamp: Date.now()
      };
      
      port.postMessage(data);
    } else {
      // This is a request interception
      // Fetch API sends headers as array of {name, value} objects
      // Convert to object format for easier editing in UI
      let headersObj = {};
      let headersArray = [];
      
      if (request.headers) {
        try {
          if (Array.isArray(request.headers)) {
            // Headers are already in array format
            headersArray = request.headers;
            request.headers.forEach(header => {
              if (header && typeof header === 'object' && header.name && header.value !== undefined) {
                headersObj[header.name] = header.value;
              }
            });
          } else if (typeof request.headers === 'object' && request.headers !== null) {
            // Headers are in object format {key: value}
            headersObj = request.headers;
            headersArray = Object.entries(request.headers).map(([name, value]) => ({ name, value }));
          }
        } catch (headerError) {
          console.error('Error processing headers:', headerError, 'Headers:', request.headers);
          // Continue with empty headers if processing fails
          headersObj = {};
          headersArray = [];
        }
      }
      
      const data = {
        type: 'REQUEST_INTERCEPTED',
        requestId: requestId,
        networkId: networkId,
        url: request.url,
        method: request.method,
        headers: headersObj,
        headersArray: headersArray, // Keep original format for reference
        postData: request.postData,
        resourceType: resourceType || 'other',
        timestamp: Date.now()
      };
      
      // Store request data for later reference
      requestData.set(requestId, data);
      
      port.postMessage(data);
    }
  } catch (error) {
    // Port might be disconnected
    if (error.message && error.message.includes('disconnected')) {
      console.error('Port disconnected, cleaning up tab', tabId);
      // Clean up the disconnected tab
      if (attachedTabs.has(tabId)) {
        attachedTabs.delete(tabId);
      }
    } else {
      console.error('Error sending message to port:', error);
    }
  }
}

// Handle response received
function handleResponseReceived(tabId, params, port) {
  const { requestId, response } = params;
  
  // Store response metadata
  if (requestData.has(requestId)) {
    requestData.get(requestId).response = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  }
}

// Continue request with or without modifications
async function continueRequest(requestId, modifications) {
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    console.error('No pending request found:', requestId);
    return;
  }
  
  const { tabId, params } = pending;
  const target = { tabId };
  
  try {
    const command = {
      requestId: requestId
    };
    
    // Apply modifications if provided
    if (modifications) {
      if (modifications.url) {
        command.url = modifications.url;
      }
      if (modifications.method) {
        command.method = modifications.method;
      }
      if (modifications.headers !== undefined) {
        // Headers are provided - ensure they're in the correct format (array of {name, value})
        if (Array.isArray(modifications.headers)) {
          // Filter out any invalid headers
          command.headers = modifications.headers.filter(h => h && h.name && h.value !== undefined);
        } else if (typeof modifications.headers === 'object' && modifications.headers !== null) {
          // Convert object to array format
          command.headers = Object.entries(modifications.headers)
            .filter(([name, value]) => name && value !== undefined)
            .map(([name, value]) => ({ name: String(name).trim(), value: String(value).trim() }));
        } else {
          // Invalid format, use empty array
          command.headers = [];
        }
      }
      if (modifications.postData !== undefined) {
        // postData must be base64 encoded for Fetch.continueRequest
        try {
          command.postData = btoa(unescape(encodeURIComponent(modifications.postData)));
        } catch (e) {
          console.error('Failed to encode postData:', e);
          // If encoding fails, try direct base64
          try {
            command.postData = btoa(modifications.postData);
          } catch (e2) {
            console.error('Failed to base64 encode postData:', e2);
            // Continue without postData if encoding fails
            console.warn('Skipping postData due to encoding error');
          }
        }
      }
    }
    
    await chrome.debugger.sendCommand(target, 'Fetch.continueRequest', command);
    pendingRequests.delete(requestId);
  } catch (error) {
    console.error('Failed to continue request:', error);
  }
}

// Continue response with or without modifications
async function continueResponse(requestId, modifications) {
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    console.error('No pending response found:', requestId);
    return;
  }
  
  const { tabId, params } = pending;
  const target = { tabId };
  
  try {
    // IMPORTANT: Fetch.fulfillRequest requires mandatory fields
    // responseCode and responseHeaders are REQUIRED
    const command = {
      requestId: requestId,
      responseCode: params.responseStatusCode || 200,
      responseHeaders: params.responseHeaders || []
    };
    
    // Apply modifications if provided
    if (modifications) {
      if (modifications.responseCode) {
        command.responseCode = modifications.responseCode;
      }
      if (modifications.responseHeaders) {
        command.responseHeaders = modifications.responseHeaders;
      }
      if (modifications.body !== undefined) {
        // Encode body to base64
        try {
          command.body = btoa(unescape(encodeURIComponent(modifications.body)));
        } catch (e) {
          console.error('Failed to encode body:', e);
          // If encoding fails, try direct base64
          command.body = btoa(modifications.body);
        }
      }
    }
    
    await chrome.debugger.sendCommand(target, 'Fetch.fulfillRequest', command);
    pendingRequests.delete(requestId);
  } catch (error) {
    console.error('Failed to continue response:', error);
  }
}

// Block request
async function blockRequest(requestId) {
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    console.error('No pending request found:', requestId);
    return;
  }
  
  const { tabId } = pending;
  const target = { tabId };
  
  try {
    await chrome.debugger.sendCommand(target, 'Fetch.failRequest', {
      requestId: requestId,
      errorReason: 'BlockedByClient'
    });
    
    pendingRequests.delete(requestId);
  } catch (error) {
    console.error('Failed to block request:', error);
  }
}

// Get response body
async function getResponseBody(tabId, requestId, port) {
  const target = { tabId };
  
  // Check if port is still connected
  if (!port) {
    console.error('Port is not available for getting response body');
    return;
  }
  
  try {
    // Try Fetch.getResponseBody first (for intercepted responses)
    try {
      const result = await chrome.debugger.sendCommand(target, 'Fetch.getResponseBody', {
        requestId: requestId
      });
      
      try {
        port.postMessage({
          type: 'RESPONSE_BODY',
          requestId: requestId,
          body: result.body,
          base64Encoded: result.base64Encoded
        });
      } catch (portError) {
        if (portError.message && portError.message.includes('disconnected')) {
          console.error('Port disconnected while sending response body');
        } else {
          throw portError;
        }
      }
      return;
    } catch (fetchError) {
      // Fallback to Network API
    }
    
    // Fallback to Network.getResponseBody
    const result = await chrome.debugger.sendCommand(target, 'Network.getResponseBody', {
      requestId: requestId
    });
    
    try {
      port.postMessage({
        type: 'RESPONSE_BODY',
        requestId: requestId,
        body: result.body,
        base64Encoded: result.base64Encoded
      });
    } catch (portError) {
      if (portError.message && portError.message.includes('disconnected')) {
        console.error('Port disconnected while sending response body');
      } else {
        throw portError;
      }
    }
  } catch (error) {
    console.error('Failed to get response body:', error);
    // Send a message indicating body is not available (only if port is still connected)
    try {
      port.postMessage({
        type: 'RESPONSE_BODY',
        requestId: requestId,
        body: '',
        base64Encoded: false,
        notAvailable: true
      });
    } catch (portError) {
      // Port is disconnected, can't send error message
      if (portError.message && !portError.message.includes('disconnected')) {
        console.error('Unexpected error:', portError);
      }
    }
  }
}

// Helper function to get status text
function getStatusText(code) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };
  
  return statusTexts[code] || 'Unknown';
}

// Handle debugger detach (e.g., user closes DevTools)
chrome.debugger.onDetach.addListener((source, reason) => {
  const tabId = source.tabId;
  
  if (attachedTabs.has(tabId)) {
    const tabData = attachedTabs.get(tabId);
    try {
      tabData.port.postMessage({ type: 'DEBUGGER_DETACHED', reason });
    } catch (e) {
      // Port already disconnected, that's fine
    }
    attachedTabs.delete(tabId);
  }
  
  // Clean up
  pendingRequests.clear();
  requestData.clear();
});

