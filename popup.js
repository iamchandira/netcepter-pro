/**
 * NetCepter Pro - Popup Script
 * 
 * © Copyright 2025 | Chandira Ekanayaka | https://iamchandira.com
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize tabs
  initTabs();
  
  // Initialize standalone button
  initStandaloneButton();
});

// Initialize tab switching
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      btn.classList.add('active');
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// Initialize standalone window button
function initStandaloneButton() {
  const openStandaloneBtn = document.getElementById('open-standalone-btn');
  
  if (openStandaloneBtn) {
    openStandaloneBtn.addEventListener('click', () => {
      chrome.windows.create({
        url: chrome.runtime.getURL('standalone.html'),
        type: 'popup',
        width: 1200,
        height: 800
      });
    });
  }
}

