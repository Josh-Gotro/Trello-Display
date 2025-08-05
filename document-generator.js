const fs = require('fs');
const path = require('path');
const trelloApi = require('./trello-api');

// Process card attachments - simplified version without image downloading
async function processCardAttachments(attachments, cardName) {
  if (!attachments || attachments.length === 0) return [];

  const imageAttachments = attachments.filter(
    (att) => att.isUpload && att.mimeType && att.mimeType.startsWith('image/')
  );

  const processedAttachments = [];

  for (const att of imageAttachments) {
    let processedAtt = {
      id: att.id,
      name: att.name,
      url: att.url,
      mimeType: att.mimeType,
      bytes: att.bytes,
      date: att.date,
      sizeText: att.bytes ? `${Math.round(att.bytes / 1024)}KB` : 'Unknown size',
      base64DataUrl: null,
      downloadFailed: false
    };

    // Mark all images as not embedded since we're not downloading them
    processedAtt.downloadFailed = true;

    processedAttachments.push(processedAtt);
  }

  return processedAttachments;
}

// Convert markdown-like text to HTML - with embedded images
function formatDescription(desc, attachments = []) {
  if (!desc) return '';

  let formattedDesc = desc;

  // Replace image references with actual img tags
  formattedDesc = formattedDesc.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, imageUrl) => {
    return `<div class="embedded-image">
      <img src="${imageUrl}" alt="${altText || 'Image'}" class="card-image" loading="lazy">
      <div class="image-caption">${altText || 'Image'}</div>
    </div>`;
  });

  // Continue with other markdown formatting
  formattedDesc = formattedDesc
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<[h|p|pre|div])/gm, '<p>')
    .replace(/(?<!>)$/gm, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-6]>)/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<div)/g, '$1')
    .replace(/(<\/div>)<\/p>/g, '$1');

  return formattedDesc;
}

// Generate comments HTML
function generateCommentsHTML(comments, includeComments) {
  if (!includeComments || !comments || comments.length === 0) return '';

  const commentsHTML = comments
    .map(comment => {
      const date = new Date(comment.date).toLocaleDateString();
      const time = new Date(comment.date).toLocaleTimeString();
      return `
        <div class="comment-item">
          <div class="comment-header">
            <span class="comment-author">${comment.memberCreator?.fullName || 'Unknown'}</span>
            <span class="comment-date">${date} at ${time}</span>
          </div>
          <div class="comment-content">${comment.data.text}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="comments-section">
      <h4>💬 Comments (${comments.length})</h4>
      <div class="comments-list">
        ${commentsHTML}
      </div>
    </div>`;
}


// Generate cover letter page HTML
function generateCoverLetterHTML(config) {
  if (!config.coverLetter.enabled) return '';
  
  return `
    <div class="cover-letter-page" id="coverLetterPage">
      <div class="cover-letter-content">
        <h1 class="cover-title">${config.coverLetter.title}</h1>
        <div class="cover-content">${config.coverLetter.content}</div>
        <div class="cover-meta">
          <p>Generated: ${new Date().toLocaleDateString()}</p>
          <p>Board: ${config.boardName}</p>
          <p>Lists: ${config.selectedLists.map(l => l.name).join(', ')}</p>
        </div>
      </div>
    </div>
  `;
}

// Generate logo HTML
function generateLogoHTML(config) {
  if (!config.logo.enabled) return '';
  
  return `
    <div class="logo-container">
      <img src="${config.logo.url}" alt="Logo" class="logo" style="width: ${config.logo.width}px;">
    </div>
  `;
}

// Get color for Trello labels
function getLabelColor(color) {
  const colors = {
    green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
    purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898',
    pink: '#ff78cb', black: '#344563',
  };
  return colors[color] || '#999';
}

// Enhanced HTML generation with configuration support
function generateConfigurableHTML(cards, config) {
  const timestamp = new Date().toLocaleString();

  // Helper function to determine if page break is needed
  function shouldBreakAfterCard(index, config) {
    if (config.oneCardPerPrintPage) return true;
    if (!config.enablePrintPagination) return false;
    return (index + 1) % config.cardsPerPrintPage === 0 && index < cards.length - 1;
  }

  // Process cards
  const processedCards = cards.map((card, index) => {
    const description = formatDescription(card.desc, card.attachments || []);
    const labels = card.labels
      .map(label => `<span class="label" style="background-color: ${getLabelColor(label.color)}">${label.name}</span>`)
      .join(' ');

    const commentsHTML = generateCommentsHTML(card.comments || [], config.includeComments);

    return {
      ...card,
      description,
      labels,
      commentsHTML,
      hasComments: (card.comments || []).length > 0,
      commentCount: (card.comments || []).length,
      cardNumber: config.showCardNumbers ? index + 1 : null,
      needsPageBreakAfter: shouldBreakAfterCard(index, config)
    };
  });

  // Generate cards HTML for print layout
  cardsHTML = processedCards.map((card, index) => {
    const pageBreakClass = card.needsPageBreakAfter ? ' page-break-after' : '';
    
    return `
      <div class="rule-card${pageBreakClass}" data-search="${card.name.toLowerCase()} ${card.desc?.toLowerCase() || ''}">
        <div class="rule-header">
          <h2 class="rule-title">
            ${config.showCardNumbers ? `<span class="card-number">${card.cardNumber}. </span>` : ''}
            <a href="${card.url}" target="_blank" title="View in Trello">${card.name}</a>
          </h2>
          <div class="rule-meta">
            ${card.labels}
            <span class="rule-id">#${card.idShort}</span>
          </div>
        </div>
        <div class="rule-content">
          ${card.description}
        </div>
        ${card.hasComments && config.includeComments ? card.commentsHTML : ''}
      </div>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f6fa;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem 0;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { font-size: 1.1rem; opacity: 0.9; }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }

        .logo-container {
            text-align: center;
            padding: 1rem 0;
        }

        .logo {
            max-width: 100%;
            height: auto;
        }

        .search-section {
            background: white;
            padding: 1.5rem;
            margin: 2rem 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .search-box {
            width: 100%;
            padding: 1rem;
            font-size: 1.1rem;
            border: 2px solid #e1e8ed;
            border-radius: 6px;
            outline: none;
            transition: border-color 0.3s;
        }

        .search-box:focus { border-color: #667eea; }

        .stats {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1rem;
            font-size: 0.9rem;
            color: #666;
        }

        /* Print-specific styles */
        @media print {
            body {
                background: white;
                margin: 0;
                padding: 0;
            }
            
            .header {
                background: white !important;
                color: black !important;
                box-shadow: none;
                border-bottom: 2px solid #333;
            }
            
            .search-section {
                display: none;
            }
            
            .rule-card {
                box-shadow: none;
                border: 1px solid #ddd;
                break-inside: avoid;
                margin-bottom: 1rem;
            }
            
            .page-break-after {
                page-break-after: always;
            }
            
            .rule-title a {
                color: black !important;
                text-decoration: none;
            }
            
            .footer {
                border-top: 1px solid #333;
                margin-top: 2rem;
            }
            
            .card-image {
                max-width: 100%;
                page-break-inside: avoid;
            }
            
            .comments-section {
                page-break-inside: avoid;
            }
        }
        
        .card-number {
            font-weight: 600;
            color: #667eea;
        }

        .rule-card {
            background: white;
            margin-bottom: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .rule-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .rule-header {
            padding: 1.5rem 1.5rem 1rem;
            border-bottom: 1px solid #e1e8ed;
        }

        .rule-title { font-size: 1.4rem; margin-bottom: 0.5rem; }
        .rule-title a { color: #333; text-decoration: none; }
        .rule-title a:hover { color: #667eea; }

        .rule-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .label {
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            color: white;
            font-weight: 500;
        }

        .rule-id {
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
            background: #f1f3f4;
            color: #666;
        }

        .rule-content { padding: 1.5rem; }
        .rule-content h1, .rule-content h2, .rule-content h3 {
            margin: 1rem 0 0.5rem;
            color: #333;
        }
        .rule-content h1 { font-size: 1.3rem; }
        .rule-content h2 { font-size: 1.2rem; }
        .rule-content h3 { font-size: 1.1rem; }
        .rule-content p { margin-bottom: 1rem; }

        .rule-content code {
            background: #f8f9fa;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9rem;
        }

        .rule-content pre {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
            margin: 1rem 0;
        }

        .rule-content pre code {
            background: none;
            padding: 0;
        }

        .embedded-image {
            margin: 1.5rem 0;
            text-align: center;
        }

        .card-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border: 1px solid #e1e8ed;
        }

        .image-caption {
            margin-top: 0.5rem;
            font-size: 0.9rem;
            color: #666;
            font-style: italic;
        }

        .comments-section {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid #e1e8ed;
        }

        .comments-section h4 {
            margin-bottom: 1rem;
            color: #333;
            font-size: 1rem;
        }

        .comments-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .comment-item {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1rem;
            border-left: 4px solid #667eea;
        }

        .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
            font-size: 0.85rem;
        }

        .comment-author {
            font-weight: 600;
            color: #333;
        }

        .comment-date {
            color: #666;
            font-size: 0.8rem;
        }

        .comment-content {
            color: #333;
            line-height: 1.5;
            white-space: pre-wrap;
        }

        .cover-letter-page {
            background: white;
            margin: 2rem 0;
            padding: 3rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }

        .cover-title {
            font-size: 2.5rem;
            margin-bottom: 2rem;
            color: #333;
        }

        .cover-content {
            font-size: 1.1rem;
            line-height: 1.8;
            margin-bottom: 3rem;
            text-align: left;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
        }

        .cover-meta {
            color: #666;
            font-size: 0.9rem;
        }

        .footer {
            text-align: center;
            padding: 2rem;
            color: #666;
            font-size: 0.9rem;
        }

        .no-results {
            text-align: center;
            padding: 3rem;
            color: #666;
            display: none;
        }

        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .container { padding: 0 0.5rem; }
            .rule-header, .rule-content { padding: 1rem; }
            .card-page-header { flex-direction: column; gap: 1rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            ${config.logo.position === 'header' ? generateLogoHTML(config) : ''}
            <h1>${config.title}</h1>
            ${config.subtitle ? `<p>${config.subtitle}</p>` : ''}
        </div>
    </div>

    <div class="container">
        ${config.coverLetter.enabled && config.coverLetter.showOnSeparatePage ? generateCoverLetterHTML(config) : ''}
        
        ${!config.separatePages ? `
        <div class="search-section">
            <input type="text" class="search-box" placeholder="Search..." id="searchBox">
            <div class="stats">
                <span id="resultCount">${processedCards.length} cards found</span>
                <span>Generated: ${timestamp}</span>
            </div>
        </div>
        ` : ''}

        <div id="cardsContainer">${cardsHTML}</div>

        <div class="no-results" id="noResults">
            <h3>No cards found</h3>
            <p>Try adjusting your search terms</p>
        </div>
    </div>

    <div class="footer">
        <p>Generated from Trello Board: ${config.boardName}</p>
        <p>Lists: ${config.selectedLists.map(l => l.name).join(', ')}</p>
        ${config.logo.position === 'footer' ? generateLogoHTML(config) : ''}
    </div>

    <script>
        ${generateSearchScript()}
        
        // Print optimization
        window.addEventListener('beforeprint', function() {
            // Ensure all cards are visible for printing
            const allCards = document.querySelectorAll('.rule-card');
            allCards.forEach(card => {
                card.style.display = 'block';
            });
        });
    </script>
</body>
</html>`;
}

// Generate JavaScript for separate pages functionality
function generateSeparatePagesScript(totalCards) {
  return `
    let currentCard = 1;
    const totalCards = ${totalCards};

    function showCard(cardNumber) {
        // Hide all cards
        for (let i = 1; i <= totalCards; i++) {
            const card = document.getElementById('cardPage' + i);
            if (card) card.style.display = 'none';
        }
        
        // Show selected card
        const selectedCard = document.getElementById('cardPage' + cardNumber);
        if (selectedCard) {
            selectedCard.style.display = 'block';
            currentCard = cardNumber;
        }
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' && currentCard < totalCards) {
            showCard(currentCard + 1);
        } else if (e.key === 'ArrowLeft' && currentCard > 1) {
            showCard(currentCard - 1);
        }
    });
  `;
}

// Generate JavaScript for search functionality
function generateSearchScript() {
  return `
    const searchBox = document.getElementById('searchBox');
    const cardsContainer = document.getElementById('cardsContainer');
    const resultCount = document.getElementById('resultCount');
    const noResults = document.getElementById('noResults');
    const allCards = document.querySelectorAll('.rule-card');

    if (searchBox) {
        searchBox.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            let visibleCount = 0;

            allCards.forEach(card => {
                const searchData = card.getAttribute('data-search') || '';
                if (searchData.includes(searchTerm)) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (resultCount) {
                resultCount.textContent = visibleCount + ' card' + (visibleCount !== 1 ? 's' : '') + ' found';
            }

            if (visibleCount === 0) {
                if (noResults) noResults.style.display = 'block';
                if (cardsContainer) cardsContainer.style.display = 'none';
            } else {
                if (noResults) noResults.style.display = 'none';
                if (cardsContainer) cardsContainer.style.display = 'block';
            }
        });
    }
  `;
}

// Generate JavaScript for pagination functionality
function generatePaginationScript(itemsPerPage) {
  return `
    let currentPage = 1;
    const itemsPerPage = ${itemsPerPage};

    function showPage(pageNumber) {
        // Hide all cards
        const allCards = document.querySelectorAll('.rule-card');
        allCards.forEach(card => card.style.display = 'none');

        // Show cards for current page
        const startIndex = (pageNumber - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        
        for (let i = startIndex; i < endIndex && i < allCards.length; i++) {
            allCards[i].style.display = 'block';
        }

        // Update pagination buttons
        const pageButtons = document.querySelectorAll('.page-btn');
        pageButtons.forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = Array.from(pageButtons).find(btn => btn.textContent == pageNumber);
        if (activeBtn) activeBtn.classList.add('active');

        currentPage = pageNumber;
    }
  `;
}

// Main function to generate documentation with configuration
async function generateDocumentationWithConfig(config) {
  try {
    console.log('🔄 Fetching cards from selected lists...');
    
    // Fetch cards from selected lists
    const listIds = config.selectedLists.map(list => list.id);
    const cards = await trelloApi.fetchCardsFromLists(listIds, config.showAttachments);
    
    console.log(`📝 Processing ${cards.length} cards...`);
    
    // Process each card
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      console.log(`Processing (${i + 1}/${cards.length}): ${card.name}`);

      if (card.attachments && card.attachments.length > 0) {
        card.attachments = await processCardAttachments(card.attachments, card.name);
      }

      // Fetch comments if needed and the card has any
      if (config.includeComments && card.badges && card.badges.comments > 0) {
        try {
          card.comments = await trelloApi.fetchCardComments(card.id);
          console.log(`  💬 Found ${card.comments.length} comments`);
        } catch (error) {
          console.log(`  ⚠️  Could not fetch comments: ${error.message}`);
          card.comments = [];
        }
      } else {
        card.comments = [];
      }
    }

    console.log('🎨 Generating HTML documentation...');
    const html = generateConfigurableHTML(cards, config);

    const outputPath = path.join(__dirname, config.outputFileName);
    fs.writeFileSync(outputPath, html);

    console.log(`✅ Documentation generated successfully!`);
    console.log(`📄 File saved: ${outputPath}`);
    console.log(`📊 Total cards: ${cards.length}`);
    if (config.includeComments) {
      const totalComments = cards.reduce((sum, card) => sum + (card.comments?.length || 0), 0);
      console.log(`💬 Total comments: ${totalComments}`);
    }
    console.log(`🌐 Open the file in your browser to view the documentation`);

  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    throw error;
  }
}

module.exports = {
  generateDocumentationWithConfig,
  processCardAttachments,
  formatDescription,
  generateCommentsHTML,
  generateConfigurableHTML
};