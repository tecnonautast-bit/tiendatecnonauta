// Carrito basado en cookie de sesión (sin necesidad de login)
// GET  /api/carrito           -> ver contenido
// POST /api/carrito           -> agregar { producto_id, cantidad }
// PUT  /api/carrito           -> actualizar cantidad { producto_id, cantidad }
// DELETE /api/carrito?producto_id=1  -> quitar item

function getSessionId(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/tn_session=([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

function withSessionCookie(response, sessionId) {
  response.headers.append(
    'Set-Cookie',
    `tn_session=${sessionId}; Path=/; Max-Age=2592000; SameSite=Lax`
  );
  return response;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  let sessionId = getSessionId(request);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    const res = Response.json({ ok: true, items: [] });
    return withSessionCookie(res, sessionId);
  }

  const sql = `
    SELECT ci.producto_id, ci.cantidad, p.nombre, p.slug, p.precio_minorista,
           p.precio_mayorista, p.imagen_url, p.stock
    FROM carrito_items ci
    JOIN productos p ON p.id = ci.producto_id
    WHERE ci.session_id = ?
  `;
  const { results } = await env.DB.prepare(sql).bind(sessionId).all();
  return Response.json({ ok: true, items: results });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let sessionId = getSessionId(request) || crypto.randomUUID();
  const body = await request.json();
  const { producto_id, cantidad = 1 } = body;

  if (!producto_id) {
    return Response.json({ ok: false, error: 'producto_id es requerido' }, { status: 400 });
  }

  await env.DB.prepare(
    `INSERT INTO carrito_items (session_id, producto_id, cantidad)
     VALUES (?, ?, ?)
     ON CONFLICT(session_id, producto_id)
     DO UPDATE SET cantidad = cantidad + excluded.cantidad`
  ).bind(sessionId, producto_id, cantidad).run();

  const res = Response.json({ ok: true });
  return withSessionCookie(res, sessionId);
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const sessionId = getSessionId(request);
  if (!sessionId) return Response.json({ ok: false, error: 'Sin sesión' }, { status: 400 });

  const { producto_id, cantidad } = await request.json();
  await env.DB.prepare(
    `UPDATE carrito_items SET cantidad = ? WHERE session_id = ? AND producto_id = ?`
  ).bind(cantidad, sessionId, producto_id).run();

  return Response.json({ ok: true });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const sessionId = getSessionId(request);
  const url = new URL(request.url);
  const productoId = url.searchParams.get('producto_id');
  if (!sessionId || !productoId) {
    return Response.json({ ok: false, error: 'Faltan datos' }, { status: 400 });
  }

  await env.DB.prepare(
    `DELETE FROM carrito_items WHERE session_id = ? AND producto_id = ?`
  ).bind(sessionId, productoId).run();

  return Response.json({ ok: true });
}
