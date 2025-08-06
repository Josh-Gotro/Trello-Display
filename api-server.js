const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const trelloApi = require('./trello-api');
const { generateConfigurableHTML, processCardAttachments, generateCommentsHTML } = require('./document-generator');

const PORT = 3001;

// Simple HTTP server to handle API requests
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  try {
    if (pathname === '/api/generate' && req.method === 'POST') {
      await handleGenerateRequest(req, res);
    } else if (pathname === '/api/boards' && req.method === 'GET') {
      await handleBoardsRequest(req, res);
    } else if (pathname === '/api/lists' && req.method === 'GET') {
      await handleListsRequest(req, res, parsedUrl.query);
    } else if (pathname === '/' || pathname === '/index.html') {
      await serveFile(res, 'interactive-documentation.html', 'text/html');
    } else if (pathname.startsWith('/public/')) {
      // Serve static files from public directory
      const filePath = pathname.substring(1); // Remove leading slash
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch(ext) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.js':
          contentType = 'text/javascript';
          break;
      }
      
      await serveFile(res, filePath, contentType);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Handle documentation generation request
async function handleGenerateRequest(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      let config = JSON.parse(body);
      
      // Validate configuration
      if (!config.boardId || !config.selectedLists || config.selectedLists.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid configuration' }));
        return;
      }

      // Ensure all required config properties exist with defaults
      config = {
        ...config,
        logo: config.logo || { enabled: false, position: 'header' },
        coverLetter: config.coverLetter || { enabled: false, showOnSeparatePage: false },
        showCardNumbers: config.showCardNumbers !== false, // default to true
        separatePages: config.separatePages || false
      };

      // Fetch cards from selected lists
      const listIds = config.selectedLists.map(list => list.id);
      const cards = await trelloApi.fetchCardsFromLists(listIds, config.showAttachments);

      // Process each card
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        
        if (card.attachments && card.attachments.length > 0) {
          card.attachments = await processCardAttachments(card.attachments, card.name);
        }

        // Fetch comments if needed and the card has any
        if (config.includeComments && card.badges && card.badges.comments > 0) {
          try {
            card.comments = await trelloApi.fetchCardComments(card.id);
          } catch (error) {
            console.log(`Could not fetch comments for card ${card.name}: ${error.message}`);
            card.comments = [];
          }
        } else {
          card.comments = [];
        }
      }

      // Generate HTML
      const html = generateConfigurableHTML(cards, config);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        html: html,
        cardCount: cards.length
      }));

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// Handle boards request
async function handleBoardsRequest(req, res) {
  try {
    trelloApi.validateConfig();
    const boards = await trelloApi.fetchUserBoards();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, boards: boards }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

// Handle lists request
async function handleListsRequest(req, res, query) {
  try {
    const boardId = query.boardId;
    if (!boardId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Board ID required' }));
      return;
    }

    const lists = await trelloApi.fetchListsByBoardId(boardId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, lists: lists }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

// Serve static files
async function serveFile(res, filename, contentType) {
  try {
    const filePath = path.join(__dirname, filename);
    const content = fs.readFileSync(filePath);
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
}

// Start server
function startServer() {
  server.listen(PORT, () => {
    console.log(`🚀 API Server running at http://localhost:${PORT}`);
    console.log(`📄 Open http://localhost:${PORT} to use the interactive interface`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
  server
};