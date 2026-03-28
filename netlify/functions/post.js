exports.handler = async function(event) {
  const url = event.queryStringParameters && event.queryStringParameters.url;
  if (!url || !url.includes('blogspot.com')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL' }) };
  }
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>(.*?)<\/h1>/s) ||
                       html.match(/<title>(.*?)<\/title>/s);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(' | Woofy Talks','').trim() : 'Blog Post';

    // Extract content
    const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*post-footer/s);
    const content = contentMatch ? contentMatch[1].trim() : '<p>Could not load post content.</p>';

    // Extract date
    const dateMatch = html.match(/<abbr[^>]*class="[^"]*published[^"]*"[^>]*title="([^"]*)"/) ||
                      html.match(/class="date-header"[^>]*>(.*?)<\/span>/s);
    const date = dateMatch ? dateMatch[1] : '';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ title, content, date })
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
