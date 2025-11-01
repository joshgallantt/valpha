// Content script to inject buttons next to each ticker on Finviz screener results

(function() {
  'use strict';

  // Function to extract ticker and exchange from a table row
  function getTickerAndExchangeFromRow(row) {
    let ticker = null;
    let exchange = null;
    
    // Look for links with quote.ashx?t=TICKER pattern
    const links = row.querySelectorAll('a[href*="quote.ashx"]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const tickerMatch = href.match(/[?&]t=([A-Z0-9]{1,6})/i);
      if (tickerMatch) {
        ticker = tickerMatch[1].toUpperCase();
      }
    }
    
    // Try to find exchange in table cells (look for NYSE, NASDAQ, etc.)
    const cells = row.querySelectorAll('td');
    for (const cell of cells) {
      const cellText = cell.textContent.trim().toUpperCase();
      // Check if cell contains exchange identifier
      if (cellText.includes('NYSE')) {
        exchange = 'nyse';
      } else if (cellText.includes('NASDAQ')) {
        exchange = 'nasdaq';
      } else if (cellText.includes('AMEX')) {
        exchange = 'amex';
      }
    }
    
    // Fallback: look for ticker in cells if not found in links
    if (!ticker && cells.length > 0) {
      // Check first cell (usually the ticker column)
      const firstCellText = cells[0].textContent.trim();
      if (firstCellText && firstCellText.length <= 6 && /^[A-Z0-9]+$/.test(firstCellText)) {
        ticker = firstCellText;
      }
      
      // Check second cell if first doesn't match
      if (!ticker && cells.length > 1) {
        const secondCellText = cells[1].textContent.trim();
        if (secondCellText && secondCellText.length <= 6 && /^[A-Z0-9]+$/.test(secondCellText)) {
          ticker = secondCellText;
        }
      }
    }
    
    // If exchange not found, try to infer from common patterns
    // Most US stocks are NYSE or NASDAQ, default to nyse if not found
    if (!exchange && ticker) {
      // Try to infer from ticker length or other heuristics
      // For now, default to trying nyse first (can be refined)
      exchange = 'nyse'; // Default, will try others if needed
    }
    
    return { ticker, exchange };
  }

  // Function to open a single ticker in AlphaSpread
  function openTickerInAlphaSpread(ticker, exchange = 'nyse') {
    if (!ticker) {
      return;
    }

    // Construct AlphaSpread URL to summary page using the correct format
    // Format: https://www.alphaspread.com/security/{exchange}/{ticker}/summary
    const alphaSpreadUrl = `https://www.alphaspread.com/security/${exchange}/${ticker.toLowerCase()}/summary`;
    
    // Open in a new tab
    window.open(alphaSpreadUrl, '_blank');
  }

  // Function to copy URL to clipboard (for opening in private/incognito windows to bypass paywalls)
  async function copyUrlToClipboard(ticker, exchange = 'nyse') {
    if (!ticker) {
      return false;
    }

    // Construct AlphaSpread URL to summary page
    const alphaSpreadUrl = `https://www.alphaspread.com/security/${exchange}/${ticker.toLowerCase()}/summary`;
    
    try {
      // Use Clipboard API to copy URL
      await navigator.clipboard.writeText(alphaSpreadUrl);
      return true;
    } catch (err) {
      // Fallback for browsers that don't support Clipboard API
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = alphaSpreadUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch (fallbackErr) {
        document.body.removeChild(textarea);
        return false;
      }
    }
  }

  // Function to create buttons for a single ticker
  function createTickerButtons(ticker, exchange) {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; gap: 4px; justify-content: center; align-items: center;';
    
    // First button: Opens in new tab
    const button1 = document.createElement('a');
    button1.href = '#';
    button1.className = 'alphaspread-ticker-button';
    button1.textContent = 'AS';
    button1.title = `Open ${ticker} in AlphaSpread (new tab)`;
    
    button1.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTickerInAlphaSpread(ticker, exchange);
    });
    
    // Second button: Copies URL to clipboard (for opening in private/incognito windows to bypass paywalls)
    const button2 = document.createElement('a');
    button2.href = '#';
    button2.className = 'alphaspread-ticker-button';
    button2.textContent = 'AS';
    button2.title = `Copy ${ticker} AlphaSpread URL to clipboard (paste in private window to bypass paywall)`;
    button2.style.cssText += 'background-color: #004080;'; // Slightly darker to differentiate
    
    button2.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const success = await copyUrlToClipboard(ticker, exchange);
      if (success) {
        // Visual feedback - briefly change button text and color
        const originalText = button2.textContent;
        button2.textContent = '✓';
        button2.style.backgroundColor = '#28a745';
        button2.title = `URL copied! Paste in Safari private window to bypass paywall`;
        setTimeout(() => {
          button2.textContent = originalText;
          button2.style.backgroundColor = '#004080';
          button2.title = `Copy ${ticker} AlphaSpread URL to clipboard (paste in private window to bypass paywall)`;
        }, 2000);
      }
    });
    
    container.appendChild(button1);
    container.appendChild(button2);
    
    return container;
  }

  // Function to find the Ticker column index
  function findTickerColumnIndex(headerRow) {
    const headers = headerRow.querySelectorAll('th');
    for (let i = 0; i < headers.length; i++) {
      const headerText = headers[i].textContent.trim().toLowerCase();
      if (headerText === 'ticker') {
        return i;
      }
    }
    // Fallback: assume it's the second column (index 1)
    return 1;
  }

  // Function to add AlphaSpread column header
  function addColumnHeader(screenerTable) {
    const thead = screenerTable.querySelector('thead');
    if (!thead) {
      return;
    }

    const headerRow = thead.querySelector('tr');
    if (!headerRow) {
      return;
    }

    // Check if header already exists
    const existingHeader = headerRow.querySelector('th[data-alphaspread-column]');
    if (existingHeader) {
      return;
    }

    // Find Ticker column
    const tickerColumnIndex = findTickerColumnIndex(headerRow);
    const headers = headerRow.querySelectorAll('th');
    
    if (tickerColumnIndex >= 0 && tickerColumnIndex < headers.length) {
      const tickerHeader = headers[tickerColumnIndex];
      
      // Create new header cell
      const newHeader = document.createElement('th');
      newHeader.className = 'table-header';
      newHeader.setAttribute('data-alphaspread-column', 'true');
      newHeader.textContent = 'AlphaSpread';
      newHeader.style.cssText = 'text-align: center; padding: 8px;';
      
      // Insert after Ticker column
      tickerHeader.parentNode.insertBefore(newHeader, tickerHeader.nextSibling);
    }
  }

  // Function to add buttons to ticker rows
  function addButtonsToRows() {
    // Find all table rows that contain tickers - target the screener table specifically
    const screenerTable = document.querySelector('.screener_table, table.screener_table, table.styled-table-new');
    if (!screenerTable) {
      return 0;
    }

    // First, ensure the header column exists
    addColumnHeader(screenerTable);
    
    const allRows = screenerTable.querySelectorAll('tbody tr');
    let buttonsAdded = 0;
    
    // Find Ticker column index from header
    const thead = screenerTable.querySelector('thead');
    const headerRow = thead ? thead.querySelector('tr') : null;
    const tickerColumnIndex = headerRow ? findTickerColumnIndex(headerRow) : 1;
    
    for (const row of allRows) {
      // Skip header rows
      if (row.querySelector('th')) {
        continue;
      }
      
      // Skip pagination rows
      if (row.closest('.screener_pagination, .screener-pages')) {
        continue;
      }
      
      // Skip if column already added
      if (row.querySelector('td[data-alphaspread-column]')) {
        continue;
      }
      
      // Get ticker and exchange from this row
      const { ticker, exchange } = getTickerAndExchangeFromRow(row);
      if (!ticker) {
        continue;
      }
      
      // Get all cells in the row
      const cells = row.querySelectorAll('td');
      
      // Find the ticker cell (should be at tickerColumnIndex)
      if (tickerColumnIndex >= cells.length) {
        continue;
      }
      
      const tickerCell = cells[tickerColumnIndex];
      if (!tickerCell) {
        continue;
      }
      
      // Create new cell for AlphaSpread buttons
      const newCell = document.createElement('td');
      newCell.setAttribute('data-alphaspread-column', 'true');
      newCell.align = 'center';
      newCell.style.cssText = 'padding: 4px;';
      
      // Create buttons (container with two buttons)
      const buttonsContainer = createTickerButtons(ticker, exchange);
      newCell.appendChild(buttonsContainer);
      
      // Insert the new cell right after the ticker cell
      tickerCell.parentNode.insertBefore(newCell, tickerCell.nextSibling);
      buttonsAdded++;
    }
    
    return buttonsAdded;
  }

  // Value investing filters that should have cash emojis
  // Based on filters used by Michael Burry, Seth A Klarman, Benjamin Graham, and Joel Greenblatt
  const valueInvestingFilters = [
    'P/E',
    'Forward P/E',
    'PEG',
    'P/S',
    'P/B',
    'Price/Cash',
    'Price/Free Cash Flow',
    'EV/EBITDA',
    'EV/Sales',
    'Dividend Yield',
    'Return on Assets',
    'Return on Equity',
    'Return on Invested Capital',
    'Current Ratio',
    'Quick Ratio',
    'LT Debt/Equity',
    'Debt/Equity',
    'Gross Margin',
    'Operating Margin',
    'Net Profit Margin',
    'Payout Ratio'
  ];

  // Function to normalize filter text for matching
  function normalizeFilterText(text) {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // Function to check if a filter is a value investing filter
  function isValueInvestingFilter(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    const normalized = normalizeFilterText(text);
    return valueInvestingFilters.some(filter => {
      const normalizedFilter = normalizeFilterText(filter);
      // Exact match
      if (normalized === normalizedFilter) {
        return true;
      }
      // Match if the text starts with the filter name (handles "P/E" matching "P/E" in "P/E Any")
      if (normalized.startsWith(normalizedFilter + ' ') || normalized === normalizedFilter) {
        return true;
      }
      // Match if filter text starts with the normalized text (handles variations)
      if (normalizedFilter.startsWith(normalized) || normalized.startsWith(normalizedFilter)) {
        return true;
      }
      return false;
    });
  }

  // Function to add cash emojis to value investing filters
  function addCashEmojisToFilters() {
    let emojisAdded = 0;

    // Method 1: Look for filter options in select elements
    const selectElements = document.querySelectorAll('select option');
    for (const option of selectElements) {
      let text = option.textContent.trim();
      // Remove "Any" or other common suffixes that might appear
      text = text.replace(/\s+Any\s*$/, '').trim();
      
      if (text && isValueInvestingFilter(text) && !option.textContent.includes('💰')) {
        // Update the option text with emoji
        option.textContent = option.textContent.replace(text, text + ' 💰');
        emojisAdded++;
      }
    }

    // Method 2: Look for filter labels in table cells (td elements with filter names)
    // Finviz typically displays filters in a table or list format
    const filterCells = document.querySelectorAll('td, div, span');
    for (const element of filterCells) {
      let text = element.textContent.trim();
      
      // Skip if already has emoji or is empty
      if (!text || text.includes('💰') || element.innerHTML.includes('💰')) {
        continue;
      }

      // Clean the text (remove common suffixes like "Any")
      const cleanText = text.replace(/\s+Any\s*$/i, '').trim();
      
      // Check if this contains a value investing filter name
      if (cleanText && isValueInvestingFilter(cleanText)) {
        // Only add if it looks like a filter label (not a data value or ticker)
        // Filter labels are usually short, don't start with numbers, and aren't ticker symbols
        const isNumericValue = /^[\d.,%+-]+$/.test(cleanText);
        const isTickerSymbol = /^[A-Z]{1,5}$/.test(cleanText);
        const isShortLabel = cleanText.length < 60;
        const startsWithNumber = /^\d/.test(cleanText);
        
        // Skip if it's clearly a data value, ticker, or very long
        if (isNumericValue || isTickerSymbol || startsWithNumber || !isShortLabel) {
          continue;
        }
        
        // Check if parent context suggests this is a filter label
        // Look for nearby elements that suggest this is part of a filter UI
        const parent = element.parentElement;
        const hasFilterContext = parent && (
          parent.tagName === 'TD' ||
          parent.classList.toString().toLowerCase().includes('filter') ||
          parent.id.toLowerCase().includes('filter') ||
          parent.querySelector('select') !== null
        );
        
        if (hasFilterContext || element.tagName === 'TD') {
          // Update innerHTML to add emoji while preserving any HTML structure
          const originalHTML = element.innerHTML;
          if (!originalHTML.includes('💰')) {
            // Try to add emoji after the text, preserving structure
            element.innerHTML = originalHTML.replace(
              new RegExp(`(${cleanText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'),
              '$1 💰'
            );
            // Fallback: if replacement didn't work, append emoji
            if (!element.innerHTML.includes('💰')) {
              element.innerHTML = cleanText + ' 💰';
            }
            emojisAdded++;
          }
        }
      }
    }

    // Method 3: Look for filter labels in links, buttons, or elements with title attributes
    const interactiveElements = document.querySelectorAll('a, button, [title]');
    for (const element of interactiveElements) {
      let text = element.textContent.trim();
      let title = (element.getAttribute('title') || '').trim();
      
      // Prefer title attribute if it exists and is more descriptive
      const checkText = title || text;
      if (!checkText) continue;
      
      const cleanText = checkText.replace(/\s+Any\s*$/i, '').trim();
      
      if (cleanText && isValueInvestingFilter(cleanText) && !checkText.includes('💰')) {
        // Check if it's a filter-related element
        const parent = element.parentElement;
        const isInFilterArea = parent && (
          parent.tagName === 'TD' ||
          parent.classList.toString().toLowerCase().includes('filter') ||
          parent.id.toLowerCase().includes('filter') ||
          parent.closest('[class*="filter"], [id*="filter"], table') !== null
        );
        
        if (isInFilterArea || element.tagName === 'OPTION' || element.tagName === 'BUTTON') {
          if (element.textContent && !element.textContent.includes('💰')) {
            element.textContent = element.textContent.replace(cleanText, cleanText + ' 💰');
            emojisAdded++;
          }
          if (title && !title.includes('💰')) {
            element.setAttribute('title', title.replace(cleanText, cleanText + ' 💰'));
            emojisAdded++;
          }
        }
      }
    }

    return emojisAdded;
  }

  // Main initialization function
  function init() {
    // Try to add buttons immediately
    addButtonsToRows();
    
    // Try to add cash emojis to filters immediately
    addCashEmojisToFilters();
    
    // Watch for dynamic content changes (Finviz loads content dynamically)
    const observer = new MutationObserver(() => {
      addButtonsToRows();
      addCashEmojisToFilters();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also retry periodically in case content loads in stages
    let retryCount = 0;
    const maxRetries = 5;
    const retryInterval = setInterval(() => {
      const added = addButtonsToRows();
      addCashEmojisToFilters();
      retryCount++;
      
      if (added === 0 && retryCount >= maxRetries) {
        clearInterval(retryInterval);
      }
    }, 1000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, start immediately
    setTimeout(init, 500); // Small delay to ensure table is rendered
  }
})();
