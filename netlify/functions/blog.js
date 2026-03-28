exports.handler = async function(event, context) {
  try {
    const response = await fetch(
      'https://woofytalks.blogspot.com/feeds/posts/default?alt=json&max-results=20'
    );
    const data = await response.json();
    const entries = data.feed.entry || [];

    const posts = entries.map(post => {
      const title = post.title.$t;
      const linkObj = post.link.find(l => l.rel === 'alternate');
      const link = linkObj ? linkObj.href : '#';
      const date = new Date(post.published.$t).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      const contentHtml = post.content ? post.content.$t : '';
      const imgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      const image = imgMatch ? imgMatch[1] : '';
      const tempDiv = { textContent: contentHtml.replace(/<[^>]+>/g, '') };
      const excerpt = tempDiv.textContent.trim().substring(0, 150) + '...';

      return { title, link, date, image, excerpt };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(posts)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
