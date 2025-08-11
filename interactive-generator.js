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

// Handle secrets setup (API key and token)
async function handleSecretsSetup() {
  let credentialsValid = false;
  let attemptCount = 0;
  const maxAttempts = 3;
  
  while (!credentialsValid && attemptCount < maxAttempts) {
    attemptCount++;
    
    const hasExistingCredentials = trelloApi.hasCredentials();
    
    if (hasExistingCredentials && attemptCount === 1) {
      console.log('✅ Found existing API credentials.');
      console.log('🔍 Testing credentials...');
      
      const credentialsWork = await trelloApi.testCredentials();
      if (credentialsWork) {
        const useExisting = await question('Credentials are valid! Would you like to use them? (y/n): ');
        if (useExisting.toLowerCase() !== 'n') {
          console.log('🔒 Your secrets are safe with me');
          return;
        }
      } else {
        console.log('❌ Existing credentials are invalid.');
      }
    } else if (attemptCount === 1) {
      console.log('❌ No API credentials found.');
    }
    
    if (attemptCount > 1) {
      console.log('❌ Previous credentials were invalid. Please try again.');
      console.log(`Attempt ${attemptCount} of ${maxAttempts}`);
    }
    
    console.log('');
    console.log('Please provide your Trello API credentials:');
    console.log('🔗 Get your API key from: https://trello.com/app-key');
    console.log('');
    
    const apiKey = await question('Enter your Trello API Key: ');
    if (!apiKey.trim()) {
      throw new Error('API Key is required');
    }
    
    console.log('');
    console.log('🔗 Get your token by visiting the authorization URL shown after entering your API key');
    console.log('');
    
    const token = await question('Enter your Trello Token: ');
    if (!token.trim()) {
      throw new Error('Token is required');
    }
    
    // Set the new credentials
    trelloApi.setCredentials(apiKey.trim(), token.trim());
    
    // Test the credentials
    console.log('🔍 Testing credentials...');
    credentialsValid = await trelloApi.testCredentials();
    
    if (credentialsValid) {
      console.log('✅ Credentials are valid!');
      
      // Ask if user wants to save credentials for persistence
      console.log('');
      const saveCredentials = await question('Save credentials to .env file for next time? (y/n): ');
      
      if (saveCredentials.toLowerCase() === 'y') {
        const saved = trelloApi.saveCredentialsToEnv(apiKey.trim(), token.trim());
        if (saved) {
          console.log('✅ Credentials saved to .env file');
        } else {
          console.log('⚠️ Could not save credentials to .env file, but they will work for this session');
        }
      } else {
        console.log('💡 Credentials will only be available for this session');
      }
      
      console.log('🔒 Your secrets are safe with me');
      console.log('');
    } else {
      console.log('❌ Invalid credentials. Please check your API key and token.');
      if (attemptCount === maxAttempts) {
        throw new Error('Maximum credential attempts exceeded. Please verify your Trello API key and token.');
      }
      console.log('');
    }
  }
}

// Main interactive configuration function
async function runInteractiveGenerator() {
  try {
    console.log('🧜​ Welcome to the Interactive Documentation Generator!');
    console.log('');

    // Check for secrets step
    console.log('🔍 Checking for secrets...');
    await handleSecretsSetup();

    // Step 1: Board Selection
    console.log('👩‍💻 Step 1: Select a Board');
    console.log('Fetching your available boards...');

    const boards = await trelloApi.fetchUserBoards();

    if (boards.length === 0) {
      console.log(
        '❌🧛‍♂️❌​ No boards found. Please check your API credentials.'
      );
      return;
    }

    console.log('\n Available boards:');
    displayList(boards, board => `${board.name} (${board.id})`);

    let boardIndex;
    while (true) {
      const boardInput = await question(`\n Select a board (1-${boards.length}): `);
      boardIndex = parseInt(boardInput) - 1;
      if (boardIndex >= 0 && boardIndex < boards.length) break;
      console.log('❌🧛‍♂️❌ Invalid selection. Please try again.');
    }

    const selectedBoard = boards[boardIndex];
    console.log(`🧙​Selected: ${selectedBoard.name}`);

    // Step 2: List Selection
    console.log('\n 👩‍💻 Step 2: Select Lists');
    console.log('Fetching lists from the selected board...');

    const lists = await trelloApi.fetchListsByBoardId(selectedBoard.id);

    if (lists.length === 0) {
      console.log('❌🧛‍♂️❌ No lists found in this board.');
      return;
    }

    console.log('\n Available lists:');
    displayList(lists, list => list.name);

    let selectedListIndices;
    while (true) {
      const listInput = await question(`\n Select lists (1-${lists.length}, comma-separated, ranges like 1-3): `);
      selectedListIndices = parseSelection(listInput, lists.length);
      if (selectedListIndices.length > 0) break;
      console.log('❌🧛‍♂️❌ Invalid selection. Please select at least one list.');
    }

    const selectedLists = selectedListIndices.map(i => lists[i]);
    console.log(`🧙​Selected ${selectedLists.length} lists:`);
    selectedLists.forEach(list => console.log(`   - ${list.name}`));

    // Step 3: Display Options
    console.log('\n👩‍💻  Step 3: Display Options');

    const includeComments = (await question('Include comments? (y/n):')).toLowerCase() !== 'n';
    const excludeEmptyCards = (await question('Exclude empty cards? (y/n):')).toLowerCase() !== 'n';

    console.log(`👩‍💻 Comments: ${includeComments ? 'Included' : 'Excluded'}`);
    console.log(`👩‍💻 Empty cards: ${excludeEmptyCards ? 'Excluded' : 'Included'}`)

    // Step 4: Title and Output
    console.log('\n👩‍💻 Step 4: Title and Output');

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
      outputFileName,
      logo: {
        enabled: true,
        url: 'public/assets/wostmann_logo.jpg',
        width: 200,
        position: 'cover'
      },
      isCliGenerated: true
    });

    // Validate configuration
    const validationErrors = generatorConfig.validateConfig(config);
    if (validationErrors.length > 0) {
      console.log('❌🧛‍♂️❌ Configuration errors:');
      validationErrors.forEach(error => console.log(`   - ${error}`));
      return;
    }

    // Step 6: Generate Documentation

    // Import the main generator function
    const { generateDocumentationWithConfig } = require('./document-generator');
    await generateDocumentationWithConfig(config);

  } catch (error) {
    console.error('❌🧛‍♂️❌ Error:', error.message);
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
  handleSecretsSetup,
  parseSelection,
  displayList
};