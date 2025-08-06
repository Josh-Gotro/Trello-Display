const fs = require('fs');
const path = require('path');
const trelloApi = require('./trello-api');
const generatorConfig = require('./generator-config');
const { formatDescription, generateCommentsHTML, getLabelColor } = require('./document-generator');

// Generate the initial web interface
async function generateWebInterface() {
  try {
    console.log('🔄 Generating interactive web interface...');

    console.log('🎨 Generating HTML interface...');
    const html = generateInteractiveHTML();

    const outputPath = path.join(__dirname, 'interactive-documentation.html');
    fs.writeFileSync(outputPath, html);

    console.log(`✅ Interactive web interface generated!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`🌐 Start the server with 'npm run server' and open http://localhost:3000`);

  } catch (error) {
    console.error('❌ Error generating web interface:', error);
    throw error;
  }
}

// Generate the interactive HTML interface
function generateInteractiveHTML() {
  const timestamp = new Date().toLocaleString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Documentation Generator</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }

        .header {
            background: linear-gradient(135deg, rgb(51,141,37) 0%, rgb(147,147,145) 100%);
            color: white;
            padding: 2rem 0;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { font-size: 1.1rem; opacity: 0.9; }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }

        .logo-container {
            display: inline-block;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }

        .logo {
            max-height: 80px;
            width: auto;
            display: block;
        }

        .config-section {
            background: white;
            padding: 1.5rem;
            margin: 1.5rem 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .config-group {
            margin-bottom: 1.5rem;
        }

        .config-group h3 {
            color: rgb(51,141,37);
            margin-bottom: 0.75rem;
            font-size: 1.1rem;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.25rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.3s;
            user-select: none;
        }

        .config-group h3:hover {
            background-color: #f8f9fa;
            border-radius: 6px;
        }

        .collapse-icon {
            font-size: 1rem;
            transition: transform 0.3s;
            color: #666;
        }

        .config-content {
            overflow: hidden;
            transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
        }

        .config-content.collapsed {
            max-height: 0;
            opacity: 0;
        }

        .config-content.expanded {
            max-height: 1000px;
            opacity: 1;
        }

        .config-group.collapsed .collapse-icon {
            transform: rotate(-90deg);
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .options-layout {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .title-inputs {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
        }
        
        .checkbox-options {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
            padding-top: 0.75rem;
            border-top: 1px solid #e2e8f0;
        }

        .compact-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin: 0;
            font-weight: normal;
            cursor: pointer;
        }

        .compact-input {
            width: 240px;
            padding: 0.5rem;
            border: 2px solid #e2e8f0;
            border-radius: 4px;
            font-size: 0.9rem;
        }

        .compact-input:focus {
            border-color: rgb(51,141,37);
            outline: none;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #2d3748;
        }

        select, input[type="text"], input[type="number"] {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }

        select:focus, input:focus {
            outline: none;
            border-color: rgb(51,141,37);
        }

        .checkbox-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 0.75rem;
            margin-top: 1rem;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            transition: all 0.2s;
        }

        .checkbox-item:hover {
            background: #e2e8f0;
        }

        .checkbox-item input[type="checkbox"] {
            width: auto;
            margin-right: 0.75rem;
            transform: scale(1.2);
        }

        .checkbox-item label {
            margin: 0;
            font-weight: normal;
            cursor: pointer;
            flex: 1;
        }

        .options-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }

        .option-group {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }

        .option-group h4 {
            color: #2d3748;
            margin-bottom: 1rem;
            font-size: 1rem;
        }

        .radio-group {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .radio-item {
            display: flex;
            align-items: center;
        }

        .radio-item input[type="radio"] {
            width: auto;
            margin-right: 0.75rem;
            transform: scale(1.2);
        }

        .radio-item label {
            margin: 0;
            font-weight: normal;
            cursor: pointer;
        }

        .generate-section {
            text-align: center;
            margin: 3rem 0;
        }

        .generate-btn {
            background: rgb(51,141,37);
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: 6px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: background-color 0.3s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .generate-btn:hover {
            background: rgb(41,121,27);
        }

        .generate-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .status-section {
            background: white;
            padding: 1.5rem;
            margin: 2rem 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: none;
        }

        .status-section.show {
            display: block;
        }

        .loading {
            text-align: center;
            color: #666;
        }

        .error {
            color: #e53e3e;
            background: #fed7d7;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid #e53e3e;
        }

        .success {
            color: #38a169;
            background: #c6f6d5;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid #38a169;
        }

        /* Document display area */
        .document-display {
            background: white;
            margin: 2rem 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: none;
        }

        .document-display.show {
            display: block;
        }

        .document-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            background: #f8f9fa;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .document-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2d3748;
        }

        .document-actions {
            display: flex;
            gap: 1rem;
        }

        .action-btn {
            padding: 0.5rem 1rem;
            border: 1px solid #e2e8f0;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
        }

        .action-btn:hover {
            background: #f8f9fa;
        }

        .document-content {
            max-height: 70vh;
            overflow-y: auto;
            padding: 0;
        }

        .search-section {
            background: white;
            padding: 1.5rem;
            margin: 2rem 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .search-bar {
            margin-bottom: 1rem;
        }

        .search-input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }

        .search-input:focus {
            border-color: rgb(51,141,37);
            outline: none;
        }

        .search-stats {
            font-size: 0.9rem;
            color: #666;
            text-align: center;
        }

        @media print {
            .config-section, .generate-section, .search-section, .status-section, .document-header {
                display: none !important;
            }

            .document-display {
                box-shadow: none;
                margin: 0;
            }

            .document-content {
                max-height: none;
                overflow: visible;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <div class="logo-container">
                <img src="public/assets/wostmann_logo.jpg" alt="Wostmann Logo" class="logo">
            </div>
        </div>
    </div>

    <div class="container">
        <div class="config-section">
            <div class="config-group">
                <h3 onclick="toggleConfigSection(this)">
                    <span>📋 Board Selection</span>
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="config-content expanded">
                    <div class="form-group">
                        <label for="boardSelect">Select Trello Board:</label>
                        <select id="boardSelect">
                            <option value="">Loading boards...</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="config-group">
                <h3 onclick="toggleConfigSection(this)">
                    <span>📝 List Selection</span>
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="config-content expanded">
                    <div id="listSelection">
                        <p style="color: #666; font-style: italic;">Select a board to see available lists</p>
                    </div>
                </div>
            </div>

            <div class="config-group">
                <h3 onclick="toggleConfigSection(this)">
                    <span>⚙️ Options</span>
                    <span class="collapse-icon">▼</span>
                </h3>
                <div class="config-content expanded">
                    <div class="options-layout">
                        <div class="title-inputs">
                            <div class="compact-item">
                                <label for="docTitle">Title:</label>
                                <input type="text" id="docTitle" placeholder="Documentation Title" class="compact-input">
                            </div>
                            <div class="compact-item">
                                <label for="docSubtitle">Subtitle:</label>
                                <input type="text" id="docSubtitle" placeholder="Optional subtitle" class="compact-input">
                            </div>
                        </div>
                        <div class="checkbox-options">
                            <div class="compact-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="includeComments" checked>
                                    Include Comments
                                </label>
                            </div>
                            <div class="compact-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="excludeEmptyCards" checked>
                                    Exclude Empty Cards
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="generate-section">
            <button class="generate-btn" id="generateBtn" disabled>
                Generate Documentation
            </button>
        </div>

        <div class="search-section" id="searchSection" style="display: none;">
            <div class="search-bar">
                <input type="text" class="search-input" placeholder="Search in generated documentation..." id="searchBox">
            </div>
            <div class="search-stats">
                <span id="searchResults">Search through your generated documentation</span>
            </div>
        </div>

        <div class="status-section" id="statusSection">
            <div id="statusContent"></div>
        </div>

        <div class="document-display" id="documentDisplay">
            <div class="document-header">
                <div class="document-title" id="documentTitle">Generated Documentation</div>
                <div class="document-actions">
                    <button class="action-btn" onclick="window.print()">🖨️ Print</button>
                    <button class="action-btn" onclick="downloadHTML()">💾 Download</button>
                </div>
            </div>
            <div class="document-content" id="documentContent">
                <!-- Generated content will appear here -->
            </div>
        </div>
    </div>

    <script>
        // Store boards data
        let boardsData = [];

        // Initialize the interface
        document.addEventListener('DOMContentLoaded', function() {
            initializeInterface();
        });

        async function initializeInterface() {
            const boardSelect = document.getElementById('boardSelect');
            const generateBtn = document.getElementById('generateBtn');

            // Check if all required elements exist
            if (!boardSelect || !generateBtn) {
                console.error('Required elements not found:', {
                    boardSelect: !!boardSelect,
                    generateBtn: !!generateBtn
                });
                return;
            }

            // Load boards from API
            await loadBoards();

            // Board selection handler
            boardSelect.addEventListener('change', async function() {
                const selectedBoardId = this.value;
                await updateListSelection(selectedBoardId);
                updateGenerateButton();
            });

            // Generate button handler
            generateBtn.addEventListener('click', generateDocumentation);

            // Update generate button state when lists are selected
            document.addEventListener('change', function(e) {
                if (e.target.type === 'checkbox' && e.target.name === 'selectedList') {
                    updateGenerateButton();
                }
            });
        }

        async function loadBoards() {
            const boardSelect = document.getElementById('boardSelect');

            if (!boardSelect) {
                console.error('boardSelect element not found');
                return;
            }

            try {
                const response = await fetch('/api/boards');
                const result = await response.json();

                if (result.success) {
                    boardsData = result.boards;

                    boardSelect.innerHTML = '<option value="">Choose a board...</option>' +
                        boardsData.map(board =>
                            \`<option value="\${board.id}" data-name="\${board.name}">\${board.name}</option>\`
                        ).join('');
                } else {
                    boardSelect.innerHTML = '<option value="">Error loading boards</option>';
                }
            } catch (error) {
                console.error('Error loading boards:', error);
                boardSelect.innerHTML = '<option value="">Error loading boards</option>';
            }
        }

        async function updateListSelection(boardId) {
            const listSelectionDiv = document.getElementById('listSelection');

            if (!listSelectionDiv) {
                console.error('listSelection element not found');
                return;
            }

            if (!boardId) {
                listSelectionDiv.innerHTML = '<p style="color: #666; font-style: italic;">Select a board to see available lists</p>';
                return;
            }

            listSelectionDiv.innerHTML = '<p style="color: #666; font-style: italic;">Loading lists...</p>';

            try {
                const response = await fetch(\`/api/lists?boardId=\${boardId}\`);
                const result = await response.json();

                if (result.success && result.lists.length > 0) {
                    const listsHTML = result.lists.map(list =>
                        \`<div class="checkbox-item">
                            <input type="checkbox" id="list_\${list.id}" name="selectedList" value="\${list.id}" data-name="\${list.name}">
                            <label for="list_\${list.id}">\${list.name}</label>
                        </div>\`
                    ).join('');

                    listSelectionDiv.innerHTML = \`
                        <div class="checkbox-group">
                            \${listsHTML}
                        </div>
                    \`;
                } else {
                    listSelectionDiv.innerHTML = '<p style="color: #e53e3e;">No lists found in this board</p>';
                }
            } catch (error) {
                console.error('Error loading lists:', error);
                listSelectionDiv.innerHTML = '<p style="color: #e53e3e;">Error loading lists</p>';
            }
        }

        function updateGenerateButton() {
            const boardSelect = document.getElementById('boardSelect');
            const generateBtn = document.getElementById('generateBtn');

            if (!boardSelect || !generateBtn) {
                console.error('Required elements not found for updateGenerateButton');
                return;
            }

            const boardSelected = boardSelect.value;
            const listsSelected = document.querySelectorAll('input[name="selectedList"]:checked').length > 0;

            generateBtn.disabled = !(boardSelected && listsSelected);
        }

        async function generateDocumentation() {
            const statusSection = document.getElementById('statusSection');
            const statusContent = document.getElementById('statusContent');
            const documentDisplay = document.getElementById('documentDisplay');
            const generateBtn = document.getElementById('generateBtn');

            // Show loading state on button
            const originalText = generateBtn.textContent;
            generateBtn.textContent = 'Loading...';
            generateBtn.disabled = true;

            // Show loading status
            statusSection.className = 'status-section show';
            statusContent.innerHTML = '<div class="loading">🔄 Generating documentation...</div>';
            documentDisplay.className = 'document-display';

            try {
                // Collect configuration
                const config = collectConfiguration();

                // Show progress
                statusContent.innerHTML = '<div class="loading">📝 Fetching cards from Trello...</div>';

                // Generate documentation (this would normally be an API call)
                const documentHTML = await generateDocumentHTML(config);

                // Show success
                statusContent.innerHTML = '<div class="success">✅ Documentation generated successfully!</div>';

                // Display the document
                displayDocument(documentHTML, config);

                // Hide status after 3 seconds
                setTimeout(() => {
                    statusSection.className = 'status-section';
                }, 3000);

            } catch (error) {
                statusContent.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
            } finally {
                // Restore button state
                generateBtn.textContent = originalText;
                generateBtn.disabled = false;
            }
        }

        function collectConfiguration() {
            const boardSelect = document.getElementById('boardSelect');
            const selectedBoard = boardsData.find(b => b.id === boardSelect.value);

            const selectedListElements = document.querySelectorAll('input[name="selectedList"]:checked');
            const selectedLists = Array.from(selectedListElements).map(el => ({
                id: el.value,
                name: el.getAttribute('data-name')
            }));

            return {
                boardId: selectedBoard.id,
                boardName: selectedBoard.name,
                selectedLists: selectedLists,
                includeComments: document.getElementById('includeComments').checked,
                excludeEmptyCards: document.getElementById('excludeEmptyCards').checked,
                showAttachments: true,
                enablePrintPagination: false,
                oneCardPerPrintPage: false,
                cardsPerPrintPage: 3,
                title: document.getElementById('docTitle').value || \`\${selectedBoard.name} Documentation\`,
                subtitle: document.getElementById('docSubtitle').value,
                outputFileName: 'documentation.html'
            };
        }

        function toggleConfigSection(headerElement) {
            const configGroup = headerElement.parentElement;
            const content = configGroup.querySelector('.config-content');
            const icon = headerElement.querySelector('.collapse-icon');

            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                configGroup.classList.add('collapsed');
            } else {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                configGroup.classList.remove('collapsed');
            }
        }

        function collapseAllConfigSections() {
            const configGroups = document.querySelectorAll('.config-group');
            configGroups.forEach(group => {
                const content = group.querySelector('.config-content');
                const header = group.querySelector('h3');

                if (content && content.classList.contains('expanded')) {
                    content.classList.remove('expanded');
                    content.classList.add('collapsed');
                    group.classList.add('collapsed');
                }
            });
        }

        // Generate documentation using API call
        async function generateDocumentHTML(config) {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate documentation');
            }

            const result = await response.json();
            return result.html;
        }

        function displayDocument(html, config) {
            const documentTitle = document.getElementById('documentTitle');
            const documentContent = document.getElementById('documentContent');
            const documentDisplay = document.getElementById('documentDisplay');
            const searchSection = document.getElementById('searchSection');

            documentTitle.textContent = config.title;
            documentContent.innerHTML = html;
            documentDisplay.className = 'document-display show';

            // Show search section when document is displayed
            if (searchSection) {
                searchSection.style.display = 'block';
            }

            // Auto-collapse configuration sections
            collapseAllConfigSections();

            // Initialize search functionality
            initializeSearch();
        }

        function downloadHTML() {
            const config = collectConfiguration();
            const documentHTML = document.getElementById('documentContent').innerHTML;

            // Create a complete HTML document
            const fullHTML = \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\${config.title}</title>
    <style>
        /* Add the hierarchical document styles here */
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        /* ... other styles ... */
    </style>
</head>
<body>
    <div class="container">
        <h1>\${config.title}</h1>
        \${config.subtitle ? \`<p>\${config.subtitle}</p>\` : ''}
        \${documentHTML}
    </div>
</body>
</html>\`;

            // Download the file
            const blob = new Blob([fullHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = config.outputFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function initializeSearch() {
            const searchBox = document.getElementById('searchBox');
            const searchResults = document.getElementById('searchResults');
            const documentContent = document.getElementById('documentContent');

            if (!searchBox || !searchResults || !documentContent) {
                return;
            }

            // Get all searchable elements (card items, sections)
            const searchableElements = documentContent.querySelectorAll('.card-item, .document-section');
            const allCards = documentContent.querySelectorAll('.card-item');
            const allSections = documentContent.querySelectorAll('.document-section');

            searchBox.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase().trim();
                let visibleCount = 0;

                if (searchTerm === '') {
                    // Show all elements
                    allCards.forEach(card => card.style.display = 'block');
                    allSections.forEach(section => section.style.display = 'block');
                    visibleCount = allCards.length;
                    searchResults.textContent = \`Search through your generated documentation (\${allCards.length} cards total)\`;
                } else {
                    // Hide all sections first
                    allSections.forEach(section => section.style.display = 'none');

                    // Search through cards
                    allCards.forEach(card => {
                        const cardText = card.textContent.toLowerCase();
                        const searchData = card.getAttribute('data-search') || '';

                        if (cardText.includes(searchTerm) || searchData.includes(searchTerm)) {
                            card.style.display = 'block';
                            // Show the parent section
                            const parentSection = card.closest('.document-section');
                            if (parentSection) {
                                parentSection.style.display = 'block';
                            }
                            visibleCount++;
                        } else {
                            card.style.display = 'none';
                        }
                    });

                    searchResults.textContent = \`Found \${visibleCount} card\${visibleCount !== 1 ? 's' : ''} matching "\${searchTerm}"\`;
                }
            });
        }
    </script>
</body>
</html>`;
}

// Command line interface
if (require.main === module) {
  generateWebInterface();
}

module.exports = {
  generateWebInterface,
  generateInteractiveHTML
};