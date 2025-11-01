# valpha
Brave Browser Extension for Finviz and AlphaSpread

A browser extension that adds a button on Finviz screener results pages to quickly open the selected tickers in AlphaSpread.

## Features

- Adds an "Open in AlphaSpread" button to Finviz screener results pages
- Automatically extracts ticker symbols from the screener table
- Opens tickers in a new AlphaSpread tab with the selected stocks

## Installation

### For Brave Browser (or Chrome)

1. **Load the extension:**
   - Open Brave browser
   - Navigate to `brave://extensions/` (or `chrome://extensions/` for Chrome)
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `valpha` directory (this folder)

2. **Verify installation:**
   - The extension should appear in your extensions list
   - You should see the extension icon (if icons are added)

## Usage

1. Go to [Finviz Screener](https://finviz.com/screener.ashx)
2. Set up your screening criteria and click "Run"
3. Once results are displayed, you'll see an "Open in AlphaSpread" button
4. Click the button to open all tickers from the screener results in AlphaSpread

## How It Works

The extension:
- Detects when you're on a Finviz screener results page
- Extracts ticker symbols from the results table
- Provides a button to open those tickers in AlphaSpread
- Opens AlphaSpread in a new tab with the tickers as query parameters

## Configuration

The AlphaSpread URL format is currently set to:
```
https://alphaspread.com/screener?tickers=TICKER1,TICKER2,TICKER3
```

If AlphaSpread uses a different URL format, you'll need to modify the `openInAlphaSpread` function in `content.js`.

## File Structure

```
valpha/
├── manifest.json      # Extension manifest (Manifest V3)
├── content.js         # Content script that injects the button
├── styles.css         # Styles for the button
├── icons/             # Extension icons (optional)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

## Development

### Testing Changes

1. Make your changes to the code
2. Go to `brave://extensions/`
3. Click the refresh icon on the extension card
4. Reload the Finviz screener page to see your changes

### Notes

- The extension uses Manifest V3 (the latest Chrome extension format)
- It only runs on Finviz screener pages (`finviz.com/screener.ashx`)
- No data is collected or sent anywhere - all processing is done locally

## Troubleshooting

**Button doesn't appear:**
- Make sure you're on a Finviz screener results page (with actual results displayed)
- Refresh the page
- Check the browser console for any errors (F12 → Console tab)

**Button appears but doesn't work:**
- Check if AlphaSpread URL format is correct
- Verify that tickers are being extracted (check browser console)
- Make sure AlphaSpread accepts the ticker format being sent

## License

MIT
