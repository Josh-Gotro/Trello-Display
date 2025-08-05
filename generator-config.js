// Configuration and utilities for the documentation generator

// Default configuration options
const DEFAULT_CONFIG = {
  // Board selection
  boardId: null,
  boardName: '',
  
  // List selection
  selectedLists: [],
  
  // Display options
  includeComments: true,
  showAttachments: true,
  
  // Print layout options
  enablePrintPagination: false,
  cardsPerPrintPage: 3,
  printPageBreaks: true, // Add page breaks between print pages
  
  // Layout options
  oneCardPerPrintPage: false, // Each card gets its own printed page
  showCardNumbers: true,
  
  // Future features (placeholders)
  logo: {
    enabled: false,
    url: '',
    width: 200,
    position: 'header' // 'header', 'cover', 'footer'
  },
  
  coverLetter: {
    enabled: false,
    title: '',
    content: '',
    showOnSeparatePage: true
  },
  
  // Output options
  outputFileName: 'documentation.html',
  title: 'Documentation',
  subtitle: '',
  
  // Styling options
  theme: 'default', // Future: 'default', 'minimal', 'corporate'
  customCSS: ''
};

// Validation functions
function validateConfig(config) {
  const errors = [];
  
  if (!config.boardId) {
    errors.push('Board ID is required');
  }
  
  if (!config.selectedLists || config.selectedLists.length === 0) {
    errors.push('At least one list must be selected');
  }
  
  if (config.enablePrintPagination && config.cardsPerPrintPage < 1) {
    errors.push('Cards per print page must be greater than 0');
  }
  
  if (!config.title || config.title.trim() === '') {
    errors.push('Title is required');
  }
  
  return errors;
}

// Helper functions for configuration
function createConfig(overrides = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...overrides
  };
}

function mergeConfig(baseConfig, updates) {
  return {
    ...baseConfig,
    ...updates,
    // Handle nested objects
    logo: { ...baseConfig.logo, ...updates.logo },
    coverLetter: { ...baseConfig.coverLetter, ...updates.coverLetter }
  };
}

// Configuration presets
const PRESETS = {
  simple: {
    includeComments: false,
    showAttachments: false,
    enablePrintPagination: false,
    oneCardPerPrintPage: false,
    title: 'Simple Documentation'
  },
  
  detailed: {
    includeComments: true,
    showAttachments: true,
    enablePrintPagination: true,
    cardsPerPrintPage: 2,
    oneCardPerPrintPage: false,
    title: 'Detailed Documentation'
  },
  
  printReady: {
    includeComments: true,
    showAttachments: true,
    enablePrintPagination: true,
    cardsPerPrintPage: 3,
    printPageBreaks: true,
    showCardNumbers: true,
    title: 'Print-Ready Documentation'
  },
  
  onePerPage: {
    includeComments: true,
    showAttachments: true,
    oneCardPerPrintPage: true,
    showCardNumbers: true,
    title: 'One Card Per Page'
  }
};

function applyPreset(config, presetName) {
  if (!PRESETS[presetName]) {
    throw new Error(`Unknown preset: ${presetName}`);
  }
  
  return mergeConfig(config, PRESETS[presetName]);
}

module.exports = {
  DEFAULT_CONFIG,
  PRESETS,
  validateConfig,
  createConfig,
  mergeConfig,
  applyPreset
};