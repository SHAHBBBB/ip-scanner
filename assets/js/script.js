var cfIPv4 = []
var cfIPv4ToScan = []
const noOfEachRange24 = 30
const client = new XMLHttpRequest();
client.open('GET', './assets/ipv4.txt');
client.onreadystatechange = function () {
  cfIPv4 = client.responseText.split("\n").map((cidr) => cidr.trim()).filter((cidr) => isCIDR(cidr));
  document.getElementById('btn-start').disabled = false;
  const tbody = document.getElementById('ip-ranges-body');
  cfIPv4.forEach((cidr) => {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.appendChild(document.createTextNode(cidr));
  })
}
client.send();

let maxIP;
let testNo;
let validIPs;
let maxLatency;
let numberOfWorkingIPs;
let ipRegex;
let immediateStop = false;
let progressBar = document.getElementById('progress-bar');
let progress = 0;
let language = localStorage.getItem('lang') || 'fa'

document.getElementById('max-ip').value = localStorage.getItem('max-ip') || 20;
document.getElementById('max-latency').value = localStorage.getItem('max-latency') || 400;
document.getElementById('ip-regex').value = localStorage.getItem('ip-regex');
document.getElementById('ip-include').value = localStorage.getItem('ip-include');
document.getElementById('ip-exclude').value = localStorage.getItem('ip-exclude');



function cancelScan() {
  immediateStop = true;
  document.getElementById('btn-start').disabled = false;
  document.getElementById('max-ip').disabled = false;
  document.getElementById('max-latency').disabled = false;
  document.getElementById('ip-regex').disabled = false;
  document.getElementById('ip-include').disabled = false;
  document.getElementById('ip-exclude').disabled = false;
  document.getElementById('btn-cancel').disabled = true;
}

let ips = [];

function startScan() {
  document.getElementById("TableForm").classList.remove("none");

  maxIP = ~~document.getElementById('max-ip').value;
  maxLatency = ~~document.getElementById('max-latency').value;
  ipRegex = document.getElementById('ip-regex').value;
  ipInclude = document.getElementById('ip-include').value;
  ipExclude = document.getElementById('ip-exclude').value;

  localStorage.setItem('max-ip', maxIP);
  localStorage.setItem('max-latency', maxLatency);
  localStorage.setItem('ip-regex', ipRegex);
  localStorage.setItem('ip-include', ipInclude);
  localStorage.setItem('ip-exclude', ipExclude);

  testNo = 0;
  numberOfWorkingIPs = 0;
  validIPs = [];
  document.getElementById('result').innerHTML = '';
  document.getElementById('btn-start').disabled = true;
  document.getElementById('max-ip').disabled = true;
  document.getElementById('max-latency').disabled = true;
  document.getElementById('ip-regex').disabled = true;
  document.getElementById('ip-include').disabled = true;
  document.getElementById('ip-exclude').disabled = true;
  document.getElementById('test-no').innerText = '';
  document.getElementById('btn-cancel').disabled = false;

  setTimeout(() => {
    let ips = processIPs()
    ips = randomizeElements(ips)
    testIPs(ips);
  }, 50)
}

function processIPs() {
  let ips = [];
  let regex = null;
  let excludeRegex = null;
  if (ipRegex) {
    regex = new RegExp(ipRegex);
  }
  if (ipInclude) {
    cfIPv4ToScan = makeCIDR(ipInclude);
  } else {
    cfIPv4ToScan = [...cfIPv4];
  }
  if (ipExclude) {
    excludeRegex = new RegExp(
      ipExclude.split(',').map(c => { return '^' + c.replaceAll('.', '\\.').replaceAll('/', '\\/') }).join('|')
    );
  }

  for (const cidr of cfIPv4ToScan) {
    if (regex && !regex.test(cidr)) {
      continue;
    }
    if (excludeRegex && excludeRegex.test(cidr)) {
      continue;
    }
    ips = ips.concat(cidrToRandomIPArray(cidr));
  }
  return ips
}



async function testIPs(ipList) {
  for (const ip of ipList) {
    if (immediateStop) {
      break;
    }
    testNo++;
    var testResult = 0;
    const url = `https://${ip}/__down`;
    const startTime = performance.now();
    const controller = new AbortController();
    const multiply = maxLatency <= 500 ? 1.5 : (maxLatency <= 1000 ? 1.2 : 1);
    var timeout = 1.5 * multiply * maxLatency;
    var chNo = 0;
    for (const ch of ['', '|', '/', '-', '\\']) {
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
      if (ch) {
        timeout = 1 * multiply * maxLatency;
        document.getElementById('test-no').innerText = `#${testNo}:`;
        document.getElementById('ip-no').innerText = ip;
        document.getElementById('ip-no').style = `color: green`;
        document.getElementById('ip-try').innerText = ch;
        document.getElementById('ip-latency').innerText = Math.floor((performance.now() - startTime) / chNo) + 'ms';
      } else {
        timeout = 1.2 * multiply * maxLatency;
        document.getElementById('test-no').innerText = `#${testNo}:`;
        document.getElementById('ip-no').innerText = ip;
        document.getElementById('ip-no').style = `color: red`;
        document.getElementById('ip-try').innerText = '';
        document.getElementById('ip-latency').innerText = '';
      }
      try {
        const response = await fetch(url, {
          signal: controller.signal,
        });

        testResult++;
      } catch (error) {
        if (error.name === "AbortError") {
          //
        } else {
          testResult++;
        }
      }
      clearTimeout(timeoutId);
      chNo++;
    }

    const latency = Math.floor((performance.now() - startTime) / 5);

    if (testResult === 5 && latency <= maxLatency) {
      numberOfWorkingIPs++;
      validIPs.push({ ip: ip, latency: latency });
      const sortedArr = validIPs.sort((a, b) => a.latency - b.latency);

      const tableRows = sortedArr.map(obj => {
        const speedTestId = `speed-test-${obj.ip.replace(/\./g, '-')}`;
        return `
          <tr>
            <td></td>
            <td>${obj.ip}</td>
            <td>${obj.latency}ms</td>
            <td>
              <div class="btn-group" role="group">
                <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${obj.ip}')" title="Copy IP">
                  <img height="16px" src="assets/img/icon-copy.png" id="invert-icon" class="dark-pic" />
                </button>
                <button class="btn btn-info btn-sm speed-test-btn" id="btn-${speedTestId}" onclick="runSpeedTest('${obj.ip}')" data-translate="speed-test-title" title="Run speed test for this IP">
                  ⚡
                </button>
              </div>
              <div id="${speedTestId}" class="speed-test-result mt-1"></div>
            </td>
          </tr>`;
      }).join('\n');

      document.getElementById('result').innerHTML = tableRows;

      // Re-apply translations to dynamically added elements
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      const elements = document.querySelectorAll('#result [data-translate]');
      elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[currentLang] && translations[currentLang][key]) {
          element.title = translations[currentLang][key];
        }
      });
    }

    if (numberOfWorkingIPs >= maxIP) {
      break;
    }
  }

  document.getElementById('ip-no').innerText = '';
  document.getElementById('ip-try').innerText = '';
  document.getElementById('ip-latency').innerText = '';
  document.getElementById('btn-start').disabled = false;
  document.getElementById('max-ip').disabled = false;
  document.getElementById('max-latency').disabled = false;
  document.getElementById('ip-regex').disabled = false;
  document.getElementById('ip-include').disabled = false;
  document.getElementById('ip-exclude').disabled = false;
  document.getElementById('btn-cancel').disabled = true;

  if (immediateStop) {
    immediateStop = false;
    document.getElementById('test-no').innerHTML = `
    <div class="alert alert-danger align-items-center text-center" id="defStatus">Searching IP canceled!</div>
    `;

  } else {
    if (window.self !== window.top) {
      window.top.postMessage(validIPs.map(el => el.ip).join('\n'), '*');
    }

    document.getElementById('test-no').innerHTML = `
      <div class="alert alert-success d-flex align-items-center text-center" id="defStatus">Searching IP finished!</div>
    `;
  }
}

function copyToClipboard(ip) {
  window.navigator.clipboard.writeText(ip)
}

function copyAllToClipboard(ip) {
  const txt = validIPs.map(el => el.ip).join('\n');
  copyToClipboard(txt)
}

function isCIDR(cidr) {
  return cidr.match(/^([0-9]{1,3}\.){3}[0-9]{1,3}\/(16|17|18|19|20|21|22|23|24)$/g);
}

function makeCIDR(includeStr) {
  let includeList = includeStr.split(',').map((cidr) => cidr.trim());
  cidrList = includeList.flatMap((cidr) => {
    if (isCIDR(cidr)) {
      return [cidr];
    } else if (cidr) {
      const regex = new RegExp(
        '^' + cidr.replaceAll('.', '\\.').replaceAll('/', '\\/')
      );
      return cfIPv4.filter((cidr) => cidr.match(regex));
    } else {
      return [];
    }
  })
  return cidrList;
}

function generateRandomNumbers(count) {
  const numbers = [];
  while (numbers.length < count) {
    const randomNumber = Math.floor(Math.random() * 254) + 1;
    if (!numbers.includes(randomNumber)) {
      numbers.push(randomNumber);
    }
  }
  return numbers;
}

function splitCIDRTo24Ranges(cidr) {
  const [baseIP, baseMask] = cidr.split('/');
  const baseStart = baseIP.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
  const baseEnd = (baseStart | (0xffffffff >>> parseInt(baseMask, 10))) >>> 0;

  const ranges = [];
  let currentStart = baseStart;

  while (currentStart <= baseEnd) {
    ranges.push(currentStart);
    currentStart += 0x100;
  }

  return ranges
}


function cidrToRandomIPArray(cidr, count) {
  const ranges = splitCIDRTo24Ranges(cidr);
  const ips = [];
  for (const start of ranges) {
    const prefix = `${(start >>> 24) & 0xff}.${(start >>> 16) & 0xff}.${(start >>> 8) & 0xff}`;
    for (const no of generateRandomNumbers(noOfEachRange24)) {
      ips.push(prefix + '.' + no);
    }
  }
  return ips;
}

function randomizeElements(arr) {
  return [...arr].sort(() => { return 0.5 - Math.random() });
}

function downloadAsCSV() {
  const csvString = validIPs.map(el => el.ip).join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'ip-list.csv');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadAsJSON() {
  const jsonString = JSON.stringify(validIPs.map(el => el.ip), null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'ip-list.json');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const activeSpeedTests = new Map();

async function runSpeedTest(ip) {
  const speedTestId = `speed-test-${ip.replace(/\./g, '-')}`;
  const resultDiv = document.getElementById(speedTestId);
  const btnId = `btn-${speedTestId}`;
  const btn = document.getElementById(btnId);

  if (activeSpeedTests.has(ip)) {
    return;
  }

  activeSpeedTests.set(ip, true);
  btn.disabled = true;
  btn.innerHTML = '⏳';
  resultDiv.innerHTML = '<small class="text-info">Testing...</small>';

  try {
    const testDurationMs = 20000;
    let totalBytes = 0;
    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), testDurationMs + 5000);
    let reader = null;

    try {
      const url = `https://${ip}/__down`;

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body available');
      }

      reader = response.body.getReader();

      try {
        while (true) {
          const elapsed = performance.now() - startTime;
          if (elapsed >= testDurationMs) {
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          totalBytes += value.length;

          const currentSpeed = (totalBytes / (elapsed / 1000)) / (1024 * 1024);
          resultDiv.innerHTML = `<small class="text-info">${currentSpeed.toFixed(2)} MB/s</small>`;
        }
      } finally {
        if (reader) {
          try {
            await reader.cancel();
          } catch (e) {
            // Ignore cancel errors
          }
        }
      }

      clearTimeout(timeoutId);

      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;
      const speedMbps = (totalBytes / durationSeconds) / (1024 * 1024);

      if (totalBytes > 0) {
        resultDiv.innerHTML = `<small class="text-success"><strong>${speedMbps.toFixed(2)} MB/s</strong></small>`;
      } else {
        resultDiv.innerHTML = '<small class="text-warning">No data</small>';
      }

    } catch (error) {
      if (reader) {
        try {
          await reader.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
      }

      clearTimeout(timeoutId);

      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;
      const speedMbps = (totalBytes / durationSeconds) / (1024 * 1024);

      if (totalBytes > 0) {
        resultDiv.innerHTML = `<small class="text-success"><strong>${speedMbps.toFixed(2)} MB/s</strong></small>`;
      } else if (error.name === 'AbortError') {
        resultDiv.innerHTML = '<small class="text-warning">Timeout</small>';
      } else if (error.message === 'No response body available') {
        resultDiv.innerHTML = '<small class="text-danger">No data stream</small>';
      } else {
        resultDiv.innerHTML = `<small class="text-danger">Failed: ${error.message}</small>`;
      }
    }

  } catch (error) {
    resultDiv.innerHTML = '<small class="text-danger">Error</small>';
  } finally {
    activeSpeedTests.delete(ip);
    btn.disabled = false;
    btn.innerHTML = '⚡';
  }
}