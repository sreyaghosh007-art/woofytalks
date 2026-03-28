const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

exports.handler = async function(event, context) {
  try {
    // Your Blogger RSS feed URL
    const BLOG_RSS = 'https://woofytalks.blogspot.com/feeds/posts/default?alt=rss';
    
    const response = await fetch(BLOG_RSS);
    const xml = await response.text();
    const data = await parseStringPromise(xml);
    
    const items = data.rss.channel[0].item || [];
    
    const posts = items.map(item => {
      // Extract image from content if available
      let image = null;
      if (item['media:thumbnail'] && item['media:thumbnail'][0] && item['media:thumbnail'][0]['$']) {
        image = item['media:thumbnail'][0]['$'].url;
      } else if (item.description && item.description[0]) {
        // Try to extract image from description
        const imgMatch = item.description[0].match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
          image = imgMatch[1];
        }
      }
      
      // Extract excerpt from description
      let excerpt = '';
      if (item.description && item.description[0]) {
        const text = item.description[0].replace(/<[^>]*>/g, '');
        excerpt = text.substring(0, 150).trim() + (text.length > 150 ? '...' : '');
      }
      
      // Format date
      const pubDate = new Date(item.pubDate[0]);
      const date = pubDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      return {
        title: item.title[0],
        link: item.link[0],
        date: date,
        excerpt: excerpt,
        image: image
      };
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(posts)
    };
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch posts' })
    };
  }
};
