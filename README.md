# Machines4U Scraper Chrome Extension

![Extension Icon](images/icon128.png)

A simple but powerful Chrome extension that scrapes equipment listing data from Machines4U search result pages and exports it to CSV.

## Features
- **One-Click Scraping**: Initiate scraping from the extension popup
- **Targeted Data Extraction**: Navigates through all listings on search results pages
- **Intelligent Data Cleaning**:
  - Price parsing (removes symbols, handles ranges, keeps text values)
  - Location parsing (extracts state/region from full location)
- **Progress Tracking**: Real-time progress bar and status updates
- **CSV Export**: Download cleaned data as CSV
- **Custom Filenames**: Auto-generated names based on URL/date with override option

## Installation
1. **Download Repository**: Clone or download as ZIP and extract
2. **Open Chrome Extensions**: Navigate to `chrome://extensions`
3. **Enable Developer Mode**: Toggle switch in top-right corner
4. **Load Extension**:
   - Click "Load unpacked"
   - Select folder containing `manifest.json`
5. **Pin Extension**: Click puzzle icon and pin for easy access

## Usage
1. Navigate to a Machines4U search results page (e.g. `https://www.machines4u.com.au/directory/genie/gs-3232/`)
2. Click extension icon in toolbar
3. Click "Start Scraping"
4. Monitor progress in popup
5. When complete:
   - Verify/modify filename
   - Click "Download CSV"
   - Save to your computer

## Data Scraped
The CSV includes these cleaned fields:
- Brand
- Model
- Condition
- Location (State/Region only)
- Seller
- Year
- Price (cleaned numerical value)
- URL
- AD Title

## File Structure

```
machines4u-scraper/
├── manifest.json          # Extension configuration and permissions
├── popup.html             # User interface for the extension popup
├── popup.js               # Handles popup interactions and data display
├── content.js             # Main scraping logic and DOM manipulation
├── images/
│   └── icon128.png        # Extension icon (128x128px)
└── README.md              # This documentation file
```


## Technical Details
**Manifest Version**: V3 (modern Chrome extension standard)

**Permissions**:
- `activeTab`: Access current tab
- `scripting`: Inject scripts
- `downloads`: Save CSV files

**Core APIs**:
- `chrome.scripting.executeScript()`: Inject content script
- `chrome.runtime.onMessage`: Cross-script communication
- `chrome.downloads.download()`: Trigger file downloads

**Web APIs**:
- `fetch()`: Retrieve product page HTML
- `DOMParser()`: Parse HTML for data extraction