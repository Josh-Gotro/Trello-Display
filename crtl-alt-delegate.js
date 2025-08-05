const fs = require('fs');
const path = require('path');
const trelloApi = require('./trello-api');

const { CONFIG } = trelloApi;


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
function generateCommentsHTML(comments) {
  if (!comments || comments.length === 0) return '';

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

// Enhanced HTML generation - simplified without embedded image support
function generateHTML(businessRules) {
  const timestamp = new Date().toLocaleString();

  const processedRules = businessRules.map((rule) => {
    const description = formatDescription(rule.desc, rule.attachments || []);
    const labels = rule.labels
      .map(label => `<span class="label" style="background-color: ${getLabelColor(label.color)}">${label.name}</span>`)
      .join(' ');

    const commentsHTML = generateCommentsHTML(rule.comments || []);

    return {
      ...rule,
      description,
      labels,
      commentsHTML,
      hasComments: (rule.comments || []).length > 0,
      commentCount: (rule.comments || []).length
    };
  });

  const rulesHTML = processedRules
    .map((rule) => {
      return `
        <div class="rule-card" data-search="${rule.name.toLowerCase()} ${rule.desc.toLowerCase()}">
          <div class="rule-header">
            <h2 class="rule-title">
              <a href="${rule.url}" target="_blank" title="View in Trello">${rule.name}</a>
            </h2>
                         <div class="rule-meta">
               ${rule.labels}
               <span class="rule-id">#${rule.idShort}</span>
             </div>
          </div>
                                <div class="rule-content">
             ${rule.description}
           </div>
           ${rule.hasComments ? rule.commentsHTML : ''}
        </div>`;
    })
    .join('');

  const totalAttachments = processedRules.reduce((sum, rule) => sum + rule.attachmentCount, 0);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Benefits Requirements - Business Rules</title>
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

        .rule-id, .attachment-indicator, .embedded-indicator {
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .rule-id { background: #f1f3f4; color: #666; }
        .attachment-indicator { background: #667eea; color: white; }


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

        .image-error {
            margin: 1rem 0;
            padding: 1rem;
            background: #f8f9fa;
            border: 1px dashed #dee2e6;
            border-radius: 8px;
            text-align: center;
            color: #666;
        }

        .error-icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }

        .error-text {
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .error-help {
            font-size: 0.8rem;
            opacity: 0.8;
        }

        .image-placeholder {
            display: none;
        }

        /* Attachment Gallery */
        .attachment-gallery {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid #e1e8ed;
        }

        .attachment-gallery h4 {
            margin-bottom: 1rem;
            color: #333;
            font-size: 1rem;
        }

        .attachment-list {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }



        .attachment-card {
            display: flex;
            align-items: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }

        .attachment-icon {
            font-size: 1.5rem;
            margin-right: 1rem;
            color: #667eea;
        }

        .attachment-info { flex: 1; min-width: 0; }
        .attachment-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 0.25rem;
            word-break: break-word;
        }

        .attachment-meta {
            font-size: 0.85rem;
            color: #666;
        }

        .error-note {
            font-size: 0.8rem;
            color: #dc3545;
            margin-top: 0.25rem;
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

         .rule-comments {
             display: none;
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
            .attachment-list { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>Business Rules Documentation</h1>
            <p>Health Benefits Requirements System</p>
        </div>
    </div>

    <div class="container">
        <div class="search-section">
            <input type="text" class="search-box" placeholder="Search..." id="searchBox">
            <div class="stats">
                <span id="resultCount">${processedRules.length} cards found </span>
                <span>Generated: ${timestamp}</span>
            </div>
        </div>

        <div id="rulesContainer">${rulesHTML}</div>

        <div class="no-results" id="noResults">
            <h3>No business rules found</h3>
            <p>Try adjusting your search terms</p>
        </div>
    </div>

    <div class="footer">
        <p>Generated from Trello Board: Health Benefits Requirements</p>
        <p><small>Images are embedded directly from Trello</small></p>

    </div>

    <script>
        const searchBox = document.getElementById('searchBox');
        const rulesContainer = document.getElementById('rulesContainer');
        const resultCount = document.getElementById('resultCount');
        const noResults = document.getElementById('noResults');
        const allRules = document.querySelectorAll('.rule-card');

        searchBox.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            let visibleCount = 0;

            allRules.forEach(rule => {
                const searchData = rule.getAttribute('data-search');
                if (searchData.includes(searchTerm)) {
                    rule.style.display = 'block';
                    visibleCount++;
                } else {
                    rule.style.display = 'none';
                }
            });

            const attachmentText = visibleCount === ${processedRules.length} ? ' • ${totalAttachments} attachments' : '';
            resultCount.textContent = visibleCount + ' business rule' + (visibleCount !== 1 ? 's' : '') + attachmentText;

            if (visibleCount === 0) {
                noResults.style.display = 'block';
                rulesContainer.style.display = 'none';
            } else {
                noResults.style.display = 'none';
                rulesContainer.style.display = 'block';
            }
        });





         // Smooth scroll for internal links
         document.addEventListener('click', function(e) {
             if (e.target.tagName === 'A' && e.target.href.startsWith('#')) {
                 e.preventDefault();
                 const targetId = e.target.href.split('#')[1];
                 const targetElement = document.getElementById(targetId);
                 if (targetElement) {
                     targetElement.scrollIntoView({ behavior: 'smooth' });
                 }
             }
         });
    </script>
</body>
</html>`;
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

// Main function - simplified without image downloading
async function generateDocumentation() {
  try {
    trelloApi.validateConfig();

    console.log('Fetching business rules from Trello...');
    const businessRules = await trelloApi.fetchBusinessRules();
    console.log(`Found ${businessRules.length} business rules`);

    // Process each business rule and its attachments
    console.log('Processing business rules and attachments...');
    for (let i = 0; i < businessRules.length; i++) {
      const rule = businessRules[i];
      console.log(`Processing (${i + 1}/${businessRules.length}): ${rule.name}`);

      if (rule.attachments && rule.attachments.length > 0) {
        rule.attachments = await processCardAttachments(rule.attachments, rule.name);
      }

      // Fetch comments if the card has any
      if (rule.badges && rule.badges.comments > 0) {
        try {
          rule.comments = await trelloApi.fetchCardComments(rule.id);
          console.log(`  📝 Found ${rule.comments.length} comments`);
        } catch (error) {
          console.log(`  ⚠️  Could not fetch comments: ${error.message}`);
          rule.comments = [];
        }
      } else {
        rule.comments = [];
      }
    }

    console.log('Generating HTML documentation...');
    const html = generateHTML(businessRules);

    const outputPath = path.join(__dirname, 'business-rules-documentation.html');
    fs.writeFileSync(outputPath, html);

    const totalImageCount = businessRules.reduce((count, rule) => {
      return count + (rule.attachments || []).filter(att => att.mimeType && att.mimeType.startsWith('image/')).length;
    }, 0);

    console.log(`✅ Documentation generated successfully!`);
    console.log(`📄 File saved: ${outputPath}`);
    console.log(`🖼️  Images embedded: ${totalImageCount}`);
    console.log(`🌐 Open the file in your browser to view the documentation`);

    if (totalImageCount > 0) {
      console.log(`💡 Images are embedded directly from Trello URLs`);
    }

  } catch (error) {
    console.error('❌ Error generating documentation:', error);
  }
}

// Export functions for use as module
module.exports = {
  generateDocumentation,
  generateHTML,
  CONFIG,
};

// Run if called directly
if (require.main === module) {
  generateDocumentation();
}