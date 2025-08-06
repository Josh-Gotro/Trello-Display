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
    console.error('❌ Error: Missing Trello API credentials in environment variables');
    console.error('Please ensure TRELLO_API_KEY and TRELLO_TOKEN are set in your .env file');
    process.exit(1);
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