const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

exports.handler = async function(event, context) {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const url = event.queryStringParameters?.url;
    
    console.log('Received URL:', url); // Debug log
    
    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'URL parameter required' })
      };
    }
    
    // Fetch the Blogger post page
    console.log('Fetching from Blogger...'); // Debug log
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('HTML fetched, length:', html.length); // Debug log
    
    // Parse HTML to extract content
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract title - trying multiple selectors
    let title = '';
    const titleSelectors = [
      'h1.post-title',
      'h3.post-title', 
      '.entry-title',
      'h1',
      '.post h1',
      'article h1'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        title = element.textContent.trim();
        console.log('Title found with selector:', selector); // Debug log
        break;
      }
    }
    
    // If still no title, try meta tags
    if (!title) {
      const metaTitle = document.querySelector('meta[property="og:title"]');
      if (metaTitle) {
        title = metaTitle.getAttribute('content');
      }
    }
    
    // Extract date - trying multiple selectors
    let date = '';
    const dateSelectors = [
      '.published',
      '.post-timestamp',
      'time',
      '.date-header',
      '.post-date',
      'abbr.published'
    ];
    
    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const dateText = element.textContent.trim();
        const dateAttr = element.getAttribute('datetime') || element.getAttribute('title');
        try {
          const pubDate = new Date(dateAttr || dateText);
          if (!isNaN(pubDate.getTime())) {
            date = pubDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            console.log('Date found with selector:', selector); // Debug log
            break;
          }
        } catch (e) {
          console.error('Date parsing error:', e);
        }
      }
    }
    
    // Extract content - trying multiple selectors
    let content = '';
    const contentSelectors = [
      '.post-body.entry-content',
      '.post-body',
      '.entry-content',
      'article .post-content',
      '[itemprop="articleBody"]',
      '.article-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Clone to avoid modifying original
        const cloned = element.cloneNode(true);
        
        // Remove unwanted elements
        const unwanted = cloned.querySelectorAll(
          'script, style, .post-footer, .post-share-buttons, .share-buttons, ' +
          '.blogger-labels, .post-labels, .comment-link, .post-comment-link, ' +
          '.timestamp-link, .byline, .addthis_toolbox'
        );
        unwanted.forEach(el => el.remove());
        
        content = cloned.innerHTML;
        
        if (content.trim()) {
          console.log('Content found with selector:', selector); // Debug log
          
          // Clean up the content
          content = content
            .replace(/\s+/g, ' ')
            .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>')
            .trim();
          
          break;
        }
      }
    }
    
    // If no content found, return helpful debug info
    if (!content) {
      console.log('No content found. HTML structure:', html.substring(0, 500));
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: JSON.stringify({
        title: title || 'Untitled Post',
        date: date || 'Date unknown',
        content: content || '<p>Content could not be extracted. Please visit the original post.</p>',
        debug: {
          titleFound: !!title,
          dateFound: !!date,
          contentFound: !!content,
          htmlLength: html.length
        }
      })
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch post content',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
