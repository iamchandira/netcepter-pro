/**
 * NetCepter Pro - DevTools Integration
 * 
 * © Copyright 2025 | Chandira Ekanayaka | https://iamchandira.com
 * 
 * Creates and initializes the NetCepter Pro panel
 */

// Create the panel
chrome.devtools.panels.create(
  'NetCepter Pro',
  'icons/icon48.png',
  'panel.html',
  (panel) => {
    // Panel created successfully
    // Panel lifecycle events are handled automatically
  }
);

