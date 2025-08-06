const readline = require('readline');
const fs = require('fs');
const path = require('path');
const trelloApi = require('./trello-api');
const generatorConfig = require('./generator-config');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Display formatted list with numbers
function displayList(items, getDisplayText) {
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${getDisplayText(item)}`);
  });
}

// Parse user selection (handles ranges, comma-separated, etc.)
function parseSelection(input, maxLength) {
  const selections = [];
  const parts = input.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      // Handle ranges like "1-5"
      const [start, end] = part.split('-').map(n => parseInt(n.trim()));
      if (start >= 1 && end <= maxLength && start <= end) {
        for (let i = start; i <= end; i++) {
          selections.push(i - 1); // Convert to 0-based index
        }
      }
    } else {
      // Handle individual numbers
      const num = parseInt(part);
      if (num >= 1 && num <= maxLength) {
        selections.push(num - 1); // Convert to 0-based index
      }
    }
  }

  return [...new Set(selections)]; // Remove duplicates
}

// Main interactive configuration function
async function runInteractiveGenerator() {
  try {
    console.log('🚀 Welcome to the Interactive Documentation Generator!');
    console.log('');

    // Validate API credentials
    trelloApi.validateConfig();

    // Step 1: Board Selection
    console.log('📋 Step 1: Select a Board');
    console.log('Fetching your available boards...');

    const boards = await trelloApi.fetchUserBoards();

    if (boards.length === 0) {
      console.log('❌ No boards found. Please check your API credentials.');
      return;
    }

    console.log('\\nAvailable boards:');
    displayList(boards, board => `${board.name} (${board.id})`);

    let boardIndex;
    while (true) {
      const boardInput = await question(`\\nSelect a board (1-${boards.length}): `);
      boardIndex = parseInt(boardInput) - 1;
      if (boardIndex >= 0 && boardIndex < boards.length) break;
      console.log('❌ Invalid selection. Please try again.');
    }

    const selectedBoard = boards[boardIndex];
    console.log(`✅ Selected: ${selectedBoard.name}`);

    // Step 2: List Selection
    console.log('\\n📝 Step 2: Select Lists');
    console.log('Fetching lists from the selected board...');

    const lists = await trelloApi.fetchListsByBoardId(selectedBoard.id);

    if (lists.length === 0) {
      console.log('❌ No lists found in this board.');
      return;
    }

    console.log('\\nAvailable lists:');
    displayList(lists, list => `${list.name} (${list.cards?.length || 0} cards)`);

    let selectedListIndices;
    while (true) {
      const listInput = await question(`\\nSelect lists (1-${lists.length}, comma-separated, ranges like 1-3): `);
      selectedListIndices = parseSelection(listInput, lists.length);
      if (selectedListIndices.length > 0) break;
      console.log('❌ Invalid selection. Please select at least one list.');
    }

    const selectedLists = selectedListIndices.map(i => lists[i]);
    console.log(`✅ Selected ${selectedLists.length} lists:`);
    selectedLists.forEach(list => console.log(`   - ${list.name}`));

    // Step 3: Display Options
    console.log('\\n⚙️  Step 3: Display Options');

    const includeComments = (await question('Include comments? (Y/n): ')).toLowerCase() !== 'n';
    const excludeEmptyCards = (await question('Exclude empty cards? (Y/n): ')).toLowerCase() !== 'n';

    console.log(`✅ Comments: ${includeComments ? 'Included' : 'Excluded'}`);
    console.log(`✅ Empty cards: ${excludeEmptyCards ? 'Excluded' : 'Included'}`)

    // Step 4: Title and Output
    console.log('\\n📄 Step 4: Title and Output');

    const title = await question('Documentation title: ') || `${selectedBoard.name} Documentation`;
    const subtitle = await question('Subtitle (optional): ');
    const outputFileName = await question('Output filename (default: documentation.html): ') || 'documentation.html';

    // Step 5: Create Configuration
    const config = generatorConfig.createConfig({
      boardId: selectedBoard.id,
      boardName: selectedBoard.name,
      selectedLists: selectedLists.map(list => ({ id: list.id, name: list.name })),
      includeComments,
      excludeEmptyCards,
      showAttachments: true,
      enablePrintPagination: false,
      cardsPerPrintPage: 3,
      oneCardPerPrintPage: false,
      title,
      subtitle,
      outputFileName
    });

    // Validate configuration
    const validationErrors = generatorConfig.validateConfig(config);
    if (validationErrors.length > 0) {
      console.log('❌ Configuration errors:');
      validationErrors.forEach(error => console.log(`   - ${error}`));
      return;
    }

    // Step 6: Generate Documentation
    console.log('\\n🔄 Generating documentation...');

    // Import the main generator function
    const { generateDocumentationWithConfig } = require('./document-generator');
    await generateDocumentationWithConfig(config);

    console.log('\\n✅ Documentation generated successfully!');
    console.log(`📄 File: ${config.outputFileName}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Command line interface
if (require.main === module) {
  runInteractiveGenerator();
}

module.exports = {
  runInteractiveGenerator,
  parseSelection,
  displayList
};