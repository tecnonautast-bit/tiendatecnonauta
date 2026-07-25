// POST /api/distribuidores -> alta de solicitud de distribuidor mayorista
export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();
  const { nombre_negocio, cuit, email, telefono, ciudad, mensaje } = body;

  if (!nombre_negocio || !email) {
    return Response.json({ ok: false, error: 'nombre_negocio y email son requeridos' }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      `INSERT INTO distribuidores_solicitudes (nombre_negocio, cuit, email, telefono, ciudad, mensaje)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(nombre_negocio, cuit || null, email, telefono || null, ciudad || null, mensaje || null).run();

    return Response.json({ ok: true, mensaje: 'Solicitud enviada. Te contactaremos a la brevedad.' });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
