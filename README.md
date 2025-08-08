# Machines4U Scraper Chrome Extension

![Extension Icon](images/icon128.png)

A simple but powerful Chrome extension that scrapes equipment listing data from Machines4U search result pages and exports it to CSV.

## ✨ Features

-   **One-Click Scraping**: Initiates scraping with a single click from the extension popup.
-   **Auto-Refresh**: Automatically reloads the page before scraping to ensure the latest listings are captured.
-   **Cancel Scraping**: Stop the scraping process at any time with a dedicated cancel button.
-   **Visual Feedback**: Provides an on-page overlay for each item being scraped and greys out completed items.
-   **Intelligent Data Cleaning**:
    -   Price parsing (removes symbols, handles ranges).
    -   Location parsing (extracts the state/region from the full location string).
-   **Progress Tracking**: Real-time progress bar and status updates in the popup.
-   **CSV Export**: Download all cleaned data as a CSV file.
-   **Custom Filenames**: Automatically suggests a filename based on the page URL and current date, which you can easily override.

---

## 🚀 Installation

1.  **Download Repository**: Clone this repository or download it as a ZIP file and extract it to a local folder.
2.  **Open Chrome Extensions**: In your Chrome browser, navigate to `chrome://extensions`.
3.  **Enable Developer Mode**: Find the "Developer mode" toggle in the top-right corner and turn it on.
4.  **Load Extension**:
    -   Click the **"Load unpacked"** button.
    -   Select the folder where you extracted the repository files (the one containing `manifest.json`).
5.  **Pin Extension**: Click the puzzle piece icon (🧩) in the Chrome toolbar and click the pin icon next to the "Machines4U Scraper" to keep it visible for easy access.

---

## Usage Instructions

1.  Navigate to a Machines4U search results or category page (e.g., `https://www.machines4u.com.au/directory/genie/gs-3232/`).
2.  Click the extension icon in your toolbar to open the popup.
3.  Click the **"Start Scraping"** button. The page will automatically refresh before the process begins.
4.  Monitor the progress in the popup or watch the visual effects on the page.
    -   If you need to stop, simply click the **"Cancel Scraping"** button in the popup.
5.  When the process is complete:
    -   Verify or modify the auto-generated filename.
    -   Click **"Download CSV"**.
    -   Save the file to your computer.

---

## Data Scraped

The exported CSV file includes the following cleaned fields:

-   Brand
-   Model
-   Condition
-   Location (State/Region only)
-   Seller
-   Year
-   Price (cleaned numerical value)
-   URL
-   AD Title

---

## File Structure

```
machines4u-scraper/
├── manifest.json        # Configures the extension, permissions, and scripts
├── background.js        # Service worker for state management and core logic
├── content.js           # Script injected into the page for DOM manipulation and scraping
├── popup.html           # The HTML structure for the extension's user interface
├── popup.js             # Handles popup interactions, UI updates, and communication
├── images/
│   ├── icon128.png      # The main extension icon (128x128px)
│   └── scan.gif         # Animation for the on-page visual feedback
└── README.md            # This documentation file
```

---

## Technical Details

**Manifest Version**: V3 (the modern Chrome extension standard).

**Permissions**:
-   `activeTab`: To access the current page's properties.
-   `scripting`: To inject the `content.js` scraper into the page.
-   `downloads`: To allow the user to save the generated CSV file.
-   `tabs`: To reload the page and monitor its status for the auto-refresh feature.

**Core APIs**:
-   `chrome.scripting.executeScript()`: Injects the content script into the active tab.
-   `chrome.runtime.onMessage`: Manages communication between the popup, background, and content scripts.
-   `chrome.downloads.download()`: Triggers the file save dialog for the CSV.
-   `chrome.tabs.reload()`: Refreshes the active tab before scraping.
-   `chrome.tabs.onUpdated`: Listens for the tab reload to complete before injecting the script.

**Web APIs**:
-   `fetch()`: Retrieves the HTML of individual product detail pages without leaving the search results page.
-   `DOMParser()`: Parses the fetched HTML strings into DOM documents for easy data extraction.
