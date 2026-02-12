# IP Address Scanner and Latency Tester

## Overview
This web application is designed to scan and test the latency of IP addresses. It performs asynchronous requests to specified IP addresses, measures latency, and presents the results dynamically on the user interface.

## Features

### IP List Loading
- Utilizes XMLHttpRequest to asynchronously load a list of IP addresses from a file (`ipv4.txt`).

### IP Address Processing
- `processIPs` function processes loaded IP addresses based on user input (include, exclude, regex), creating a list of IPs to be tested.

### Result Presentation
- Working IPs with latency within the specified range are displayed in a dynamic table on the web page.

### Clipboard Interaction
- Users can copy individual IPs or the entire list to the clipboard.

### File Download
- Functions to download the results as CSV or JSON files for further analysis.

### Localization
- Basic support for localization with the `language` variable.

### Speed Testing
- Per-IP network speed test button to measure download bandwidth for each discovered Cloudflare IP.
- Real-time speed measurements displayed inline for each IP address.
- Tests download speed over 20 seconds using HTTPS on port 443.

## Usage
1. Load the application in a web browser.
2. Adjust scanning parameters (maximum IP count, maximum latency, regular expressions, etc.).
3. Start the scanning process.
4. Monitor the dynamic presentation of results.
5. Click the speed test button (⚡) next to any IP to measure its download speed.
6. Copy individual IPs or download the entire list for further use.
