const languageMap = {
  en: "English",
  az: "Azerbaijan",
  bo: "Tibetan",
  da: "Danish",
  ug: "Uighur",
  hy: "Armenian",
  el: "Greek",
  es: "Spanish",
  su: "Sundanese",
  it: "Italian",
  fr: "French",
  pt: "Portuguese",
  ru: "Russian",
  lt: "Lithuanian",
  lv: "Latvian",
  he: "Hebrew",
  de: "German",
  ko: "Korean",
  nb: "Arabic",
  ro: "Romanian",
  id: "Indonesian",
  et: "Estonian",
};

// Global variables
let loadedFiles = [];
let currentResults = [];
let currentPage = 1;
let itemsPerPage = 5;
let lastFoundKey = '';
let lastFoundFile = '';

function getLanguageFromFilename(filename) {
  const match = filename.match(/([a-z]{2}(-[A-Z]{2})?)\.json$/i);
  if (!match) return "Άγνωστη";
  const langCode = match[1].toLowerCase();
  return languageMap[langCode] || "Άγνωστη";
}

async function loadDirectory() {
  const directoryInput = document.getElementById("directoryInput");
  const statusSection = document.getElementById("status-section");
  const successStatus = document.getElementById("success-status");
  const warningStatus = document.getElementById("warning-status");
  const successText = document.getElementById("success-text");
  const warningText = document.getElementById("warning-text");
  const fileList = document.getElementById("file-list");
  const fileListContent = document.getElementById("file-list-content");
  const folderName = document.getElementById("folder-name");
  const directoryButton = document.getElementById("directoryButton");
  const searchButton = document.getElementById("searchButton");
  const resultBox = document.getElementById("result");
  
  const files = directoryInput.files;
  
  if (!files || files.length === 0) {
    // Reset to default state
    statusSection.style.display = "none";
    fileList.style.display = "none";
    directoryButton.className = "file-button default";
    directoryButton.innerHTML = "📁 Select folder";
    searchButton.disabled = true;
    resultBox.className = "result-box error";
    resultBox.innerHTML = "❌ You must provide a value to search..";
    loadedFiles = [];
    return;
  }

  // Filter only JSON files
  const jsonFiles = Array.from(files).filter(file => 
    file.name.toLowerCase().endsWith('.json')
  );

  if (jsonFiles.length === 0) {
    statusSection.style.display = "none";
    fileList.style.display = "none";
    directoryButton.className = "file-button default";
    directoryButton.innerHTML = "📁 Select Folder...";
    searchButton.disabled = true;
    resultBox.className = "result-box error";
    resultBox.innerHTML = `❌ No JSON files found in the folder`;
    loadedFiles = [];
    return;
  }

  // Load all JSON files
  loadedFiles = [];
  let successCount = 0;
  let errorCount = 0;

  for (const file of jsonFiles) {
    try {
      const text = await readFile(file);
      const json = JSON.parse(text);
      loadedFiles.push({
        name: file.name,
        content: json,
        path: file.webkitRelativePath || file.name
      });
      successCount++;
    } catch (error) {
      console.error(`Error loading ${file.name}:`, error);
      errorCount++;
    }
  }

  // Update UI to match the image exactly
  if (successCount > 0) {
    // Update button
    directoryButton.className = "file-button";
    directoryButton.innerHTML = "📁 File loaded";
    
    // Show status section
    statusSection.style.display = "block";
    
    // Success status
    successStatus.style.display = "flex";
    successText.textContent = `${successCount} JSON files loaded successfully`;
    
    // Warning status (if any errors)
    if (errorCount > 0) {
      warningStatus.style.display = "flex";
      warningText.textContent = `${errorCount} files with errors`;
    } else {
      warningStatus.style.display = "none";
    }
    
    // Show file list
    fileList.style.display = "block";
    const folderPath = jsonFiles[0].webkitRelativePath ? 
      jsonFiles[0].webkitRelativePath.split('/')[0] : 'translations';
    folderName.textContent = `folder: ${folderPath}`;
    
    // Display file names
    const fileNames = loadedFiles.map(f => f.name).join(', ');
    fileListContent.textContent = `files: ${fileNames}`;
    
    // Enable search
    searchButton.disabled = false;
    
    // Update result to show waiting for input
    resultBox.className = "result-box error";
    resultBox.innerHTML = "❌ You must provide a value for the search..";
    
  } else {
    // All files failed
    statusSection.style.display = "none";
    fileList.style.display = "none";
    directoryButton.className = "file-button default";
    directoryButton.innerHTML = "📁 Select folder...";
    searchButton.disabled = true;
    resultBox.className = "result-box error";
    resultBox.innerHTML = `❌ Failed to load JSON files.`;
    loadedFiles = [];
  }
}

async function findKey() {
  const inputValue = document.getElementById("valueInput").value.trim();
  const resultBox = document.getElementById("result");
  const resultsContainer = document.getElementById("results-container");

  if (!inputValue) {
    resultBox.style.display = "flex";
    resultsContainer.style.display = "none";
    resultBox.className = "result-box error";
    resultBox.innerHTML = "❌ You must provide a value to search for.";
    return;
  }

  if (loadedFiles.length === 0) {
    resultBox.style.display = "flex";
    resultsContainer.style.display = "none";
    resultBox.className = "result-box error";
    resultBox.innerHTML = "❌ You must first load a folder with JSON files.";
    return;
  }

  // Hide result box and show searching state
  resultBox.style.display = "none";
  resultsContainer.style.display = "block";
  resultsContainer.innerHTML = `
    <div class="result-header searching">
      🔍 Search in progress...
    </div>
  `;

  // Search through all loaded files
  for (const fileData of loadedFiles) {
    try {
      for (const [key, value] of Object.entries(fileData.content)) {
        if (value === inputValue) {
          // Found the key, now show results
          showResults(key, inputValue, fileData.name, loadedFiles);
          return;
        }
      }
    } catch (err) {
      console.error(`Error searching in ${fileData.name}:`, err);
    }
  }

  // Not found
  resultBox.style.display = "flex";
  resultsContainer.style.display = "none";
  resultBox.className = "result-box error";
  resultBox.innerHTML = `❌ The value "${inputValue}" was not found in any of the ${loadedFiles.length} files.`;
}

function showResults(foundKey, searchValue, foundFile, allFiles) {
  const resultsContainer = document.getElementById("results-container");

  lastFoundKey = foundKey;
  lastFoundFile = foundFile;

  
  const select = document.getElementById("itemsPerPageSelect");
  itemsPerPage = parseInt(select.value) || 5; 
  
  // Build the results data
  currentResults = [];
  
  for (const fileData of allFiles) {
    try {
      if (foundKey in fileData.content) {
        const language = getLanguageFromFilename(fileData.name);
        const value = fileData.content[foundKey];
        
        currentResults.push({
          file: fileData.name,
          value: value,
          language: language
        });
      }else{
          const language = getLanguageFromFilename(fileData.name);
          currentResults.push({
          file: fileData.name,
          value: "Missing ❌",
          language: language,
        });
      }
    } catch (err) {
      console.error(`Error processing ${fileData.name}:`, err);
      currentResults.push({
        file: fileData.name,
        value: "Missing ❌ error",
        language: "Missing ❌ error",
      });
    }
  }
  
  // Reset to first page
  currentPage = 1;
  
  // Show results with pagination
  displayResultsPage(foundKey, foundFile);
}

function displayResultsPage() {
  const foundKey = lastFoundKey;
  const foundFile = lastFoundFile;
  const resultsContainer = document.getElementById("results-container");
  
  // Calculate pagination
  const totalPages = Math.ceil(currentResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageResults = currentResults.slice(startIndex, endIndex);
  
  // Build table rows for current page
  let tableRows = "";
  for (const result of pageResults) {
    tableRows += `
      <tr class="results-table-row">
        <td class="file-cell">
          <span class="file-icon">📄</span>
          ${result.file}
        </td>
        <td class="value-cell">'${foundKey}'</td> 
        <td class="value-cell">'${result.value}'</td>   
        <td class="language-cell">
          <span class="language-icon">🌍</span>
          ${result.language}
        </td>
      </tr>
    `;
  }
  
  // Build pagination controls
  let paginationControls = "";
  if (totalPages > 1) {
    // Page numbers
    let pageNumbers = "";
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers += `
        <span class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
          ${i}
        </span>
      `;
    }
    
    paginationControls = `
      <div class="pagination-container">
        <div class="pagination-info">
          Showing ${startIndex + 1}-${Math.min(endIndex, currentResults.length)} of ${currentResults.length} results
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" onclick="previousPage()" ${currentPage === 1 ? 'disabled' : ''}>
            ← Previous
          </button>
          <div class="page-numbers">
            ${pageNumbers}
          </div>
          <button class="pagination-btn" onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}>
            Next →
          </button>
        </div>
      </div>
    `;
  }
  
  resultsContainer.innerHTML = `
    <div class="result-header found">
      ✅ Found in file ${foundFile}:
      <br>Key: "${foundKey}"
    </div>
    <div class="result-subheader">
      🔍 Searching translations for key: "${foundKey}"
    </div>
    <table class="results-table">
      <thead class="results-table-header">
        <tr>
          <th>FILE</th>
          <th>KEY</th>
          <th>VALUE</th>  
          <th>LANGUAGE</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    ${paginationControls}
  `;
}

function goToPage(page) {
  currentPage = page;
  displayResultsPage(); // We need to store these values
}

function nextPage() {
  const totalPages = Math.ceil(currentResults.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayResultsPage(); // We need to store these values
  }
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayResultsPage(); // We need to store these values
  }
}


function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsText(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("itemsPerPageSelect");

  select.addEventListener("change", () => {
    itemsPerPage = parseInt(select.value) || 5;

    if (currentResults.length > 0) {
      currentPage = 1;
      displayResultsPage(lastFoundKey, lastFoundFile);
    }
  });
});

function toggleInstructions() {
  const instructions = document.getElementById("instructions");
  if (instructions.style.display === "none") {
    instructions.style.display = "block";
  } else {
    instructions.style.display = "none";
  }
}