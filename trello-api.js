// Load environment variables
require('dotenv').config();

// Lists
const listIds = {
  businessRules: '5f4ebccafcbb2137daf5012c',
  functionalUseCases: '5f4ebccafcbb2137daf5012d',
  businessEntities: '5f6cfce24b46566052ec869d',
  referenceItems: '644aabf26addda4d9be28b9a',
  generalRequirementsResources: '5f4ebccafcbb2137daf5012a'
};

// Configuration
const CONFIG = {
  apiKey: process.env.TRELLO_API_KEY,
  token: process.env.TRELLO_TOKEN,
  boardId: '5f4ebccafcbb2137daf5012c',
  businessRulesListId: listIds.businessRules,
  functionalUseCasesListId: listIds.functionalUseCases,
  businessEntitiesListId: listIds.businessEntities,
  referenceItemsListId: listIds.referenceItems,
  generalRequirementsResourcesListId: listIds.generalRequirementsResources,
};

// Validate configuration
function validateConfig() {
  if (!CONFIG.apiKey || !CONFIG.token) {
    const error = new Error('Missing Trello API credentials in environment variables. Please ensure TRELLO_API_KEY and TRELLO_TOKEN are set in your .env file');
    error.name = 'MissingCredentialsError';
    throw error;
  }
}

// Check if credentials are available (without throwing)
function hasCredentials() {
  return !!(CONFIG.apiKey && CONFIG.token);
}

// Set new credentials (for CLI interactive setup)
function setCredentials(apiKey, token) {
  CONFIG.apiKey = apiKey;
  CONFIG.token = token;
  
  // Also update process.env so other parts of the application can access them
  process.env.TRELLO_API_KEY = apiKey;
  process.env.TRELLO_TOKEN = token;
}

// Test credentials by making a simple API call
async function testCredentials() {
  try {
    const url = `https://api.trello.com/1/members/me?key=${CONFIG.apiKey}&token=${CONFIG.token}`;
    await makeRequest(url);
    return true;
  } catch (error) {
    return false;
  }
}

// Save credentials to .env file (for persistence)
function saveCredentialsToEnv(apiKey, token) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add the credentials
    const lines = envContent.split('\n');
    let apiKeyFound = false;
    let tokenFound = false;
    
    // Update existing lines or mark what needs to be added
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('TRELLO_API_KEY=')) {
        lines[i] = `TRELLO_API_KEY=${apiKey}`;
        apiKeyFound = true;
      } else if (lines[i].startsWith('TRELLO_TOKEN=')) {
        lines[i] = `TRELLO_TOKEN=${token}`;
        tokenFound = true;
      }
    }
    
    // Add missing credentials
    if (!apiKeyFound) {
      lines.push(`TRELLO_API_KEY=${apiKey}`);
    }
    if (!tokenFound) {
      lines.push(`TRELLO_TOKEN=${token}`);
    }
    
    // Write back to file
    fs.writeFileSync(envPath, lines.join('\n').trim() + '\n');
    return true;
  } catch (error) {
    console.error('Error saving credentials to .env file:', error.message);
    return false;
  }
}

// Base function to make Trello API calls
async function makeRequest(url) {
  const fetch = (await import('node-fetch')).default;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error making API request:', error);
    throw error;
  }
}

// Fetch cards from a specific list
async function fetchListCards(listId, options = {}) {
  const baseUrl = `https://api.trello.com/1/lists/${listId}/cards`;
  const params = new URLSearchParams({
    key: CONFIG.apiKey,
    token: CONFIG.token,
    ...options
  });

  const url = `${baseUrl}?${params}`;
  return makeRequest(url);
}

// Fetch business rules from Trello API with attachments
async function fetchBusinessRules() {
  return fetchListCards(CONFIG.businessRulesListId, { attachments: 'true' });
}

// Fetch functional use cases
async function fetchFunctionalUseCases() {
  return fetchListCards(CONFIG.functionalUseCasesListId, { attachments: 'true' });
}

// Fetch business entities
async function fetchBusinessEntities() {
  return fetchListCards(CONFIG.businessEntitiesListId, { attachments: 'true' });
}

// Fetch reference items
async function fetchReferenceItems() {
  return fetchListCards(CONFIG.referenceItemsListId, { attachments: 'true' });
}

// Fetch general requirements resources
async function fetchGeneralRequirementsResources() {
  return fetchListCards(CONFIG.generalRequirementsResourcesListId, { attachments: 'true' });
}

// Fetch board information
async function fetchBoard() {
  const url = `https://api.trello.com/1/boards/${CONFIG.boardId}?key=${CONFIG.apiKey}&token=${CONFIG.token}`;
  return makeRequest(url);
}

// Fetch all lists on the board
async function fetchBoardLists() {
  const url = `https://api.trello.com/1/boards/${CONFIG.boardId}/lists?key=${CONFIG.apiKey}&token=${CONFIG.token}`;
  return makeRequest(url);
}

// Fetch a specific card by ID
async function fetchCard(cardId) {
  const url = `https://api.trello.com/1/cards/${cardId}?attachments=true&key=${CONFIG.apiKey}&token=${CONFIG.token}`;
  return makeRequest(url);
}

// Fetch all cards from the board
async function fetchAllBoardCards() {
  const url = `https://api.trello.com/1/boards/${CONFIG.boardId}/cards?attachments=true&key=${CONFIG.apiKey}&token=${CONFIG.token}`;
  return makeRequest(url);
}

// Fetch comments for a specific card
async function fetchCardComments(cardId) {
  const url = `https://api.trello.com/1/cards/${cardId}/actions?filter=commentCard&key=${CONFIG.apiKey}&token=${CONFIG.token}`;
  return makeRequest(url);
}

// Fetch all boards accessible to the user
async function fetchUserBoards() {
  const url = `https://api.trello.com/1/members/me/boards?key=${CONFIG.apiKey}&token=${CONFIG.token}`;
  return makeRequest(url);
}

// Fetch specific board information by ID
async function fetchBoardById(boardId) {
  const url = `https://api.trello.com/1/boards/${boardId}?key=${CONFIG.apiKey}&token=${CONFIG.token}`;
  return makeRequest(url);
}

// Fetch all lists for a specific board
async function fetchListsByBoardId(boardId) {
  const url = `https://api.trello.com/1/boards/${boardId}/lists?key=${CONFIG.apiKey}&token=${CONFIG.token}`;
  return makeRequest(url);
}

// Fetch all cards from specific lists
async function fetchCardsFromLists(listIds, includeAttachments = true) {
  const allCards = [];

  for (const listId of listIds) {
    const options = includeAttachments ? { attachments: 'true' } : {};
    const cards = await fetchListCards(listId, options);
    // Add list information to each card
    for (const card of cards) {
      card.listId = listId;
    }
    allCards.push(...cards);
  }

  return allCards;
}

// Fetch cards from a specific board with list filtering
async function fetchBoardCardsFiltered(boardId, selectedListIds = null, includeAttachments = true) {
  if (selectedListIds && selectedListIds.length > 0) {
    return fetchCardsFromLists(selectedListIds, includeAttachments);
  } else {
    // Fetch all cards from the board
    const url = `https://api.trello.com/1/boards/${boardId}/cards?${includeAttachments ? 'attachments=true&' : ''}key=${CONFIG.apiKey}&token=${CONFIG.token}`;
    return makeRequest(url);
  }
}

module.exports = {
  CONFIG,
  listIds,
  validateConfig,
  hasCredentials,
  setCredentials,
  testCredentials,
  saveCredentialsToEnv,
  makeRequest,
  fetchListCards,
  fetchBusinessRules,
  fetchFunctionalUseCases,
  fetchBusinessEntities,
  fetchReferenceItems,
  fetchGeneralRequirementsResources,
  fetchBoard,
  fetchBoardLists,
  fetchCard,
  fetchAllBoardCards,
  fetchCardComments,
  fetchUserBoards,
  fetchBoardById,
  fetchListsByBoardId,
  fetchCardsFromLists,
  fetchBoardCardsFiltered
};