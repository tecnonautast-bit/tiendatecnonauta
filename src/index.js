// =========================================================
// TECNONAUTA — Worker único (sirve el sitio estático + la API)
// Reemplaza a la carpeta /functions (pensada para Cloudflare Pages).
// Este archivo funciona con "wrangler deploy" + [assets] en wrangler.toml.
// =========================================================

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

async function handleProductos(request, env, url) {
  const categoria = url.searchParams.get('categoria');
  const marca = url.searchParams.get('marca');
  const oferta = url.searchParams.get('oferta');
  const destacado = url.searchParams.get('destacado');
  const nuevo = url.searchParams.get('nuevo');
  const buscar = url.searchParams.get('buscar');
  const distribuidor = url.searchParams.get('distribuidor') === '1';

  let sql = `
    SELECT p.id, p.sku, p.nombre, p.slug, p.descripcion,
           p.precio_minorista, p.precio_mayorista, p.stock, p.imagen_url,
           p.destacado, p.en_oferta, p.es_nuevo,
           c.nombre AS categoria, c.slug AS categoria_slug,
           m.nombre AS marca, mo.nombre AS modelo,
           ca.nombre AS calidad
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN marcas m ON m.id = p.marca_id
    LEFT JOIN modelos mo ON mo.id = p.modelo_id
    LEFT JOIN calidades ca ON ca.id = p.calidad_id
    WHERE p.activo = 1
  `;
  const params = [];
  if (categoria) { sql += ' AND c.slug = ?'; params.push(categoria); }
  if (marca) { sql += ' AND m.slug = ?'; params.push(marca); }
  if (oferta) { sql += ' AND p.en_oferta = 1'; }
  if (destacado) { sql += ' AND p.destacado = 1'; }
  if (nuevo) { sql += ' AND p.es_nuevo = 1'; }
  if (buscar) { sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)'; params.push(`%${buscar}%`, `%${buscar}%`); }
  sql += ' ORDER BY p.destacado DESC, p.id DESC LIMIT 60';

  const { results } = await env.DB.prepare(sql).bind(...params).all();
  const productos = results.map(p => ({ ...p, precio: distribuidor ? p.precio_mayorista : p.precio_minorista }));
  return Response.json({ ok: true, productos });
}

async function handleProductoDetalle(env, slug) {
  const sql = `
    SELECT p.*, c.nombre AS categoria, c.slug AS categoria_slug,
           m.nombre AS marca, mo.nombre AS modelo, ca.nombre AS calidad
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN marcas m ON m.id = p.marca_id
    LEFT JOIN modelos mo ON mo.id = p.modelo_id
    LEFT JOIN calidades ca ON ca.id = p.calidad_id
    WHERE p.slug = ? AND p.activo = 1
    LIMIT 1
  `;
  const producto = await env.DB.prepare(sql).bind(slug).first();
  if (!producto) return Response.json({ ok: false, error: 'Producto no encontrado' }, { status: 404 });
  return Response.json({ ok: true, producto });
}

async function handleCategorias(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, nombre, slug, descripcion, imagen_url FROM categorias WHERE activo = 1 ORDER BY orden ASC`
  ).all();
  return Response.json({ ok: true, categorias: results });
}

async function handleCarrito(request, env, url) {
  const method = request.method;
  let sessionId = getSessionId(request);

  if (method === 'GET') {
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      return withSessionCookie(Response.json({ ok: true, items: [] }), sessionId);
    }
    const { results } = await env.DB.prepare(
      `SELECT ci.producto_id, ci.cantidad, p.nombre, p.slug, p.precio_minorista,
              p.precio_mayorista, p.imagen_url, p.stock
       FROM carrito_items ci JOIN productos p ON p.id = ci.producto_id
       WHERE ci.session_id = ?`
    ).bind(sessionId).all();
    return Response.json({ ok: true, items: results });
  }

  if (method === 'POST') {
    sessionId = sessionId || crypto.randomUUID();
    const { producto_id, cantidad = 1 } = await request.json();
    if (!producto_id) return Response.json({ ok: false, error: 'producto_id es requerido' }, { status: 400 });
    await env.DB.prepare(
      `INSERT INTO carrito_items (session_id, producto_id, cantidad) VALUES (?, ?, ?)
       ON CONFLICT(session_id, producto_id) DO UPDATE SET cantidad = cantidad + excluded.cantidad`
    ).bind(sessionId, producto_id, cantidad).run();
    return withSessionCookie(Response.json({ ok: true }), sessionId);
  }

  if (method === 'PUT') {
    if (!sessionId) return Response.json({ ok: false, error: 'Sin sesión' }, { status: 400 });
    const { producto_id, cantidad } = await request.json();
    await env.DB.prepare(`UPDATE carrito_items SET cantidad = ? WHERE session_id = ? AND producto_id = ?`)
      .bind(cantidad, sessionId, producto_id).run();
    return Response.json({ ok: true });
  }

  if (method === 'DELETE') {
    const productoId = url.searchParams.get('producto_id');
    if (!sessionId || !productoId) return Response.json({ ok: false, error: 'Faltan datos' }, { status: 400 });
    await env.DB.prepare(`DELETE FROM carrito_items WHERE session_id = ? AND producto_id = ?`)
      .bind(sessionId, productoId).run();
    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
}

async function handleDistribuidores(request, env) {
  const { nombre_negocio, cuit, email, telefono, ciudad, mensaje } = await request.json();
  if (!nombre_negocio || !email) {
    return Response.json({ ok: false, error: 'nombre_negocio y email son requeridos' }, { status: 400 });
  }
  await env.DB.prepare(
    `INSERT INTO distribuidores_solicitudes (nombre_negocio, cuit, email, telefono, ciudad, mensaje)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(nombre_negocio, cuit || null, email, telefono || null, ciudad || null, mensaje || null).run();
  return Response.json({ ok: true, mensaje: 'Solicitud enviada. Te contactaremos a la brevedad.' });
}

async function handleContacto(request, env) {
  const { nombre, email, telefono, mensaje } = await request.json();
  if (!nombre || !email || !mensaje) {
    return Response.json({ ok: false, error: 'nombre, email y mensaje son requeridos' }, { status: 400 });
  }
  await env.DB.prepare(
    `INSERT INTO contactos (nombre, email, telefono, mensaje) VALUES (?, ?, ?, ?)`
  ).bind(nombre, email, telefono || null, mensaje).run();
  return Response.json({ ok: true, mensaje: 'Mensaje enviado. Te responderemos a la brevedad.' });
}

async function handlePedidos(request, env) {
  const sessionId = getSessionId(request);
  if (!sessionId) return Response.json({ ok: false, error: 'No hay carrito activo' }, { status: 400 });

  const { metodo_envio = 'retiro_local', metodo_pago = 'a_coordinar', notas = '' } = await request.json();

  const { results: items } = await env.DB.prepare(
    `SELECT ci.producto_id, ci.cantidad, p.precio_minorista
     FROM carrito_items ci JOIN productos p ON p.id = ci.producto_id
     WHERE ci.session_id = ?`
  ).bind(sessionId).all();

  if (!items.length) return Response.json({ ok: false, error: 'El carrito está vacío' }, { status: 400 });

  const subtotal = items.reduce((acc, it) => acc + it.precio_minorista * it.cantidad, 0);
  const costoEnvio = metodo_envio === 'retiro_local' ? 0 : 5000;
  const total = subtotal + costoEnvio;

  const pedido = await env.DB.prepare(
    `INSERT INTO pedidos (metodo_envio, metodo_pago, subtotal, costo_envio, total, notas)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(metodo_envio, metodo_pago, subtotal, costoEnvio, total, notas).first();

  for (const it of items) {
    await env.DB.prepare(
      `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`
    ).bind(pedido.id, it.producto_id, it.cantidad, it.precio_minorista).run();
  }

  await env.DB.prepare(`DELETE FROM carrito_items WHERE session_id = ?`).bind(sessionId).run();
  return Response.json({ ok: true, pedido_id: pedido.id, total });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/productos') return await handleProductos(request, env, url);
      if (path.startsWith('/api/productos/')) return await handleProductoDetalle(env, path.split('/').pop());
      if (path === '/api/categorias') return await handleCategorias(env);
      if (path === '/api/carrito') return await handleCarrito(request, env, url);
      if (path === '/api/distribuidores' && request.method === 'POST') return await handleDistribuidores(request, env);
      if (path === '/api/contacto' && request.method === 'POST') return await handleContacto(request, env);
      if (path === '/api/pedidos' && request.method === 'POST') return await handlePedidos(request, env);
    } catch (err) {
      return Response.json({ ok: false, error: err.message }, { status: 500 });
    }

    // Cualquier otra ruta: servir el sitio estático (public/)
    return env.ASSETS.fetch(request);
  },
};
