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

// Convert markdown-like text to HTML - with embedded images and special blocks
function formatDescription(desc, attachments = []) {
  if (!desc) return '';

  let formattedDesc = desc;

  // Handle TODO and Notes blocks first (before other formatting)
  formattedDesc = formattedDesc.replace(/(TODO|TODOS?|Notes?|NOTE):\s*([^\n]*(?:\n(?!TODO|TODOS?|Notes?|NOTE)[^\n]*)*)/gi, (match, keyword, content) => {
    return `<div class="special-block ${keyword.toLowerCase()}-block">
      <div class="block-header">${keyword.toUpperCase()}</div>
      <div class="block-content">${content.trim()}</div>
    </div>`;
  });

  // Replace image references with actual img tags
  formattedDesc = formattedDesc.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, imageUrl) => {
    return `<div class="embedded-image">
      <img src="${imageUrl}" alt="${altText || 'Image'}" class="card-image" loading="lazy">
      <div class="image-caption">${altText || 'Image'}</div>
    </div>`;
  });

  // Continue with other markdown formatting
  formattedDesc = formattedDesc
    .replace(/^### (.*$)/gm, '<h4>$1</h4>')  // Changed to h4 for card sub-headings
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')   // Changed to h3 for card sub-headings
    .replace(/^# (.*$)/gm, '<h3>$1</h3>')    // Changed to h3 for card sub-headings
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<[h|p|pre|div])/gm, '<p>')
    .replace(/(?<!>)$/gm, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[3-4]>)/g, '$1')
    .replace(/(<\/h[3-4]>)<\/p>/g, '$1')
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

// Check if a card has meaningful content
function hasContent(card) {
  // Check if description exists and has meaningful text (after removing whitespace/newlines)
  const hasDescription = card.desc && card.desc.trim().length > 0;
  
  // Check if card has attachments
  const hasAttachments = card.attachments && card.attachments.length > 0;
  
  // Check if card has comments
  const hasComments = card.comments && card.comments.length > 0;
  
  // Check if card has labels (excluding just the title)
  const hasLabels = card.labels && card.labels.length > 0;
  
  // Card has content if it has any of: description, attachments, comments, or labels
  return hasDescription || hasAttachments || hasComments || hasLabels;
}

// Filter out empty cards if requested
function filterCards(cards, config) {
  if (!config.excludeEmptyCards) {
    return cards; // Return all cards if not filtering
  }
  
  return cards.filter(card => hasContent(card));
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

  // Filter out empty cards if requested
  const filteredCards = filterCards(cards, config);

  // Group cards by their source list
  const cardsByList = {};
  filteredCards.forEach(card => {
    const listId = card.listId || 'unknown';
    if (!cardsByList[listId]) {
      cardsByList[listId] = [];
    }
    cardsByList[listId].push(card);
  });

  // Process cards and organize by sections
  let sectionNumber = 1;
  let sectionsHTML = '';

  config.selectedLists.forEach(listInfo => {
    const listCards = cardsByList[listInfo.id] || [];

    if (listCards.length === 0) return; // Skip empty lists

    // Generate section header
    const sectionId = `section-${sectionNumber}`;
    sectionsHTML += `
      <div class="document-section" id="${sectionId}">
        <h1 class="section-header">
          <span class="section-number">${sectionNumber}.</span>
          <span class="section-title">${listInfo.name}</span>
        </h1>
    `;

    // Process cards in this section
    listCards.forEach((card, cardIndex) => {
      const cardNumber = `${sectionNumber}.${cardIndex + 1}`;
      const description = formatDescription(card.desc, card.attachments || []);
      const commentsHTML = generateCommentsHTML(card.comments || [], config.includeComments);

      // Determine if page break is needed after this card
      const needsPageBreak = shouldBreakAfterCard(cardIndex, config, listCards.length);
      const pageBreakClass = needsPageBreak ? ' page-break-after' : '';

      sectionsHTML += `
        <div class="card-item${pageBreakClass}" data-search="${card.name.toLowerCase()} ${card.desc?.toLowerCase() || ''}">
          <h2 class="card-header">
            <span class="card-number">${cardNumber}</span>
            <a href="${card.url}" target="_blank" title="View in Trello" class="card-title">${card.name}</a>
          </h2>
          <div class="card-meta">
            ${card.labels.map(label => `<span class="label" style="background-color: ${getLabelColor(label.color)}">${label.name}</span>`).join(' ')}
            <span class="card-id">#${card.idShort}</span>
          </div>
          <div class="card-content">
            ${description}
          </div>
          ${commentsHTML}
        </div>
      `;
    });

    sectionsHTML += '</div>'; // Close section
    sectionNumber++;
  });

  // Helper function to determine if page break is needed
  function shouldBreakAfterCard(cardIndex, config, totalCardsInSection) {
    if (config.oneCardPerPrintPage) return cardIndex < totalCardsInSection - 1; // Break after each card except the last
    if (!config.enablePrintPagination) return false;
    return (cardIndex + 1) % config.cardsPerPrintPage === 0 && cardIndex < totalCardsInSection - 1;
  }

  // Count total cards processed (after filtering)
  const totalCards = filteredCards.length;

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
        
        .header-meta {
            margin-top: 1rem;
            display: flex;
            justify-content: center;
            gap: 2rem;
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .board-name, .generation-date {
            margin: 0;
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }

        .logo-container {
            display: inline-block;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            text-align: center;
        }

        .logo {
            max-height: 80px;
            width: auto;
            display: block;
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

        .search-box:focus { border-color: rgb(51,141,37); }

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
                font-size: 12pt;
                line-height: 1.4;
            }

            .header {
                background: white !important;
                color: black !important;
                box-shadow: none;
                border-bottom: 2pt solid #333;
                margin-bottom: 1rem;
            }
            
            .header-meta {
                color: black !important;
                font-size: 10pt;
                margin-top: 0.5rem;
            }
            
            .board-name, .generation-date {
                color: black !important;
            }

            .search-section {
                display: none;
            }

            .document-section {
                page-break-inside: avoid;
                margin-bottom: 2rem;
            }

            .section-header {
                font-size: 18pt;
                color: black !important;
                border-bottom: 2pt solid #333 !important;
                margin: 1.5rem 0 1rem 0;
                page-break-after: avoid;
            }

            .section-number {
                color: black !important;
            }

            .card-item {
                break-inside: avoid;
                margin-bottom: 1.5rem;
                border-left: 1pt solid #333 !important;
            }

            .card-header {
                font-size: 14pt;
                color: black !important;
                page-break-after: avoid;
            }

            .card-number {
                color: black !important;
            }

            .card-title {
                text-decoration: none !important;
                color: black !important;
            }

            .card-meta {
                font-size: 9pt;
            }

            .label {
                background: #f0f0f0 !important;
                color: black !important;
                border: 1pt solid #ccc;
            }

            .card-id {
                background: #f5f5f5 !important;
                color: black !important;
            }

            .card-content {
                font-size: 11pt;
                line-height: 1.5;
            }

            .card-content h3, .card-content h4 {
                color: black !important;
                page-break-after: avoid;
            }

            .special-block {
                border: 1pt solid #333 !important;
                background: #f8f8f8 !important;
                break-inside: avoid;
            }

            .todo-block {
                border-left: 3pt solid #000 !important;
            }

            .note-block, .notes-block {
                border-left: 3pt solid #666 !important;
            }

            .block-header {
                background: #e8e8e8 !important;
                color: black !important;
            }

            .block-content {
                color: black !important;
            }

            .code-block {
                border: 1pt solid #ccc !important;
                background: #f8f8f8 !important;
                break-inside: avoid;
            }

            .inline-code {
                background: #f0f0f0 !important;
                border: 1pt solid #ccc !important;
                color: black !important;
            }

            .page-break-after {
                page-break-after: always;
            }

            .footer {
                border-top: 1pt solid #333;
                margin-top: 2rem;
                font-size: 10pt;
            }

            .card-image {
                max-width: 100%;
                page-break-inside: avoid;
            }

            .comments-section {
                page-break-inside: avoid;
                font-size: 10pt;
            }
        }

        .card-number {
            font-weight: 600;
            color: rgb(51,141,37);
        }

        /* Hierarchical Document Layout */
        .hierarchical-document {
            max-width: none;
            margin: 0;
        }

        .document-section {
            margin-bottom: 3rem;
            page-break-inside: avoid;
        }

        .section-header {
            font-size: 2rem;
            font-weight: 700;
            color: #2d3748;
            margin: 2rem 0 1.5rem 0;
            padding-bottom: 0.5rem;
            border-bottom: 3px solid rgb(51,141,37);
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
        }

        .section-number {
            color: rgb(51,141,37);
            font-weight: 800;
        }

        .section-title {
            flex: 1;
        }

        .card-item {
            margin-bottom: 2rem;
            padding-left: 1rem;
        }

        .card-header {
            font-size: 1.3rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .card-number {
            color: rgb(51,141,37);
            font-weight: 700;
            min-width: 4rem;
        }

        .card-title {
            flex: 1;
            text-decoration: none;
            color: #2d3748;
            transition: color 0.2s;
        }

        .card-title:hover {
            color: rgb(51,141,37);
        }

        .card-meta {
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
            padding-left: 4.75rem;
        }

        .label {
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.7rem;
            color: white;
            font-weight: 500;
        }

        .card-id {
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 500;
            background: #f1f3f4;
            color: #666;
        }

        .card-content {
            padding-left: 4.75rem;
            line-height: 1.7;
        }

        .card-content h3 {
            font-size: 1.1rem;
            font-weight: 600;
            color: #2d3748;
            margin: 1.5rem 0 0.75rem 0;
        }

        .card-content h4 {
            font-size: 1rem;
            font-weight: 600;
            color: #4a5568;
            margin: 1.25rem 0 0.5rem 0;
        }

        .card-content p {
            margin-bottom: 1rem;
            color: #4a5568;
        }

        .inline-code {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.85rem;
            color: #2d3748;
        }

        .code-block {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid rgb(51,141,37);
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
            margin: 1.5rem 0;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.85rem;
            line-height: 1.5;
        }

        .code-block code {
            background: none;
            border: none;
            padding: 0;
            color: #2d3748;
        }

        /* Special blocks for TODO and Notes */
        .special-block {
            margin: 1.5rem 0;
            border-radius: 6px;
            border-left: 4px solid;
            background: #f8f9fa;
            overflow: hidden;
        }

        .todo-block {
            border-left-color: #f56565;
            background: #fed7d7;
        }

        .note-block, .notes-block {
            border-left-color: #4299e1;
            background: #bee3f8;
        }

        .block-header {
            background: rgba(0,0,0,0.05);
            padding: 0.5rem 1rem;
            font-weight: 700;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .todo-block .block-header {
            color: #c53030;
        }

        .note-block .block-header, .notes-block .block-header {
            color: #2b6cb0;
        }

        .block-content {
            padding: 1rem;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.9rem;
            line-height: 1.6;
            color: #2d3748;
            white-space: pre-wrap;
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
            border-left: 4px solid rgb(51,141,37);
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
            <div class="header-meta">
                <p class="board-name">Board: ${config.boardName}</p>
                <p class="generation-date">Generated: ${timestamp}</p>
            </div>
        </div>
    </div>

    <div class="container">
        ${config.coverLetter.enabled && config.coverLetter.showOnSeparatePage ? generateCoverLetterHTML(config) : ''}


        <div id="documentContainer" class="hierarchical-document">${sectionsHTML}</div>

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
${generateHierarchicalSearchScript()}

        // Print optimization
        if (window && window.addEventListener) {
            window.addEventListener('beforeprint', function() {
                // Ensure all cards are visible for printing
                const allCards = document.querySelectorAll('.rule-card');
                allCards.forEach(card => {
                    card.style.display = 'block';
                });
            });
        }
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
    if (document && document.addEventListener) {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' && currentCard < totalCards) {
                showCard(currentCard + 1);
            } else if (e.key === 'ArrowLeft' && currentCard > 1) {
                showCard(currentCard - 1);
            }
        });
    }
  `;
}

// Generate JavaScript for hierarchical search functionality
function generateHierarchicalSearchScript() {
  return `
    const searchBox = document.getElementById('searchBox');
    const documentContainer = document.getElementById('documentContainer');
    const resultCount = document.getElementById('resultCount');
    const noResults = document.getElementById('noResults');
    const allCards = document.querySelectorAll('.card-item');
    const allSections = document.querySelectorAll('.document-section');

    if (searchBox && searchBox.addEventListener) {
        searchBox.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            let visibleCount = 0;

            if (searchTerm === '') {
                // Show all cards and sections
                allCards.forEach(card => card.style.display = 'block');
                allSections.forEach(section => section.style.display = 'block');
                visibleCount = allCards.length;
            } else {
                // Hide all sections first
                allSections.forEach(section => section.style.display = 'none');

                // Check each card
                allCards.forEach(card => {
                    const searchData = card.getAttribute('data-search') || '';
                    if (searchData.includes(searchTerm)) {
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
            }

            if (resultCount) {
                resultCount.textContent = visibleCount + ' card' + (visibleCount !== 1 ? 's' : '') + ' found';
            }

            if (visibleCount === 0) {
                if (noResults) noResults.style.display = 'block';
                if (documentContainer) documentContainer.style.display = 'none';
            } else {
                if (noResults) noResults.style.display = 'none';
                if (documentContainer) documentContainer.style.display = 'block';
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
  generateConfigurableHTML,
  hasContent,
  filterCards
};