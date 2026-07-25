// POST /api/pedidos -> checkout básico: crea el pedido a partir del carrito de la sesión actual
function getSessionId(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/tn_session=([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return Response.json({ ok: false, error: 'No hay carrito activo' }, { status: 400 });
  }

  const body = await request.json();
  const { metodo_envio = 'retiro_local', metodo_pago = 'a_coordinar', notas = '' } = body;

  const { results: items } = await env.DB.prepare(
    `SELECT ci.producto_id, ci.cantidad, p.precio_minorista, p.stock
     FROM carrito_items ci JOIN productos p ON p.id = ci.producto_id
     WHERE ci.session_id = ?`
  ).bind(sessionId).all();

  if (!items.length) {
    return Response.json({ ok: false, error: 'El carrito está vacío' }, { status: 400 });
  }

  const subtotal = items.reduce((acc, it) => acc + it.precio_minorista * it.cantidad, 0);
  const costoEnvio = metodo_envio === 'retiro_local' ? 0 : 5000; // placeholder, ajustar según tarifario real
  const total = subtotal + costoEnvio;

  const pedido = await env.DB.prepare(
    `INSERT INTO pedidos (metodo_envio, metodo_pago, subtotal, costo_envio, total, notas)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(metodo_envio, metodo_pago, subtotal, costoEnvio, total, notas).first();

  for (const it of items) {
    await env.DB.prepare(
      `INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
       VALUES (?, ?, ?, ?)`
    ).bind(pedido.id, it.producto_id, it.cantidad, it.precio_minorista).run();
  }

  await env.DB.prepare(`DELETE FROM carrito_items WHERE session_id = ?`).bind(sessionId).run();

  return Response.json({ ok: true, pedido_id: pedido.id, total });
}
