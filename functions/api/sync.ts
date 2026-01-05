export const onRequestPost = async (context) => {
  const { env, request } = context;
  const { type, data } = await request.json();

  try {
    if (type === 'topics') {
      await env.DB.prepare("INSERT OR REPLACE INTO topics (id, name) VALUES (?, ?)")
        .bind(data.id, data.name).run();
    } 
    // Add other types like 'sharing' or 'staff' later
    
    return new Response(JSON.stringify({ success: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};