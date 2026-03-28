const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

exports.handler = async function(event, context) {
  try {
    const url = event.queryStringParameters.url;
    
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
    const response = await fetch(url);
    const html = await response.text();
    
    // Parse HTML to extract content
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract title
    let title = '';
    const titleElement = document.querySelector('.post-title, h1.entry-title, h3.post-title');
    if (titleElement) {
      title = titleElement.textContent.trim();
    }
    
    // Extract date
    let date = '';
    const dateElement = document.querySelector('.published, .post-timestamp, time');
    if (dateElement) {
      const dateText = dateElement.textContent.trim();
      try {
        const pubDate = new Date(dateElement.getAttribute('datetime') || dateText);
        date = pubDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch (e) {
        date = dateText;
      }
    }
    
    // Extract content
    let content = '';
    const contentElement = document.querySelector('.post-body, .entry-content, article .post-content');
    if (contentElement) {
      // Clean up the content - remove unwanted elements
      const cloned = contentElement.cloneNode(true);
      
      // Remove script tags, style tags, and other unwanted elements
      const unwanted = cloned.querySelectorAll('script, style, .post-footer, .post-share-buttons');
      unwanted.forEach(el => el.remove());
      
      content = cloned.innerHTML;
      
      // Clean up some common Blogger artifacts
      content = content
        .replace(/\s+/g, ' ')
        .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>')
        .trim();
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        title: title,
        date: date,
        content: content
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
      body: JSON.stringify({ error: 'Failed to fetch post content' })
    };
  }
};
