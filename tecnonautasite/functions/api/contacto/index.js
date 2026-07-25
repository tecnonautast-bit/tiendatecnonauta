// POST /api/contacto -> guarda mensajes del formulario de contacto
export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();
  const { nombre, email, telefono, mensaje } = body;

  if (!nombre || !email || !mensaje) {
    return Response.json({ ok: false, error: 'nombre, email y mensaje son requeridos' }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      `INSERT INTO contactos (nombre, email, telefono, mensaje) VALUES (?, ?, ?, ?)`
    ).bind(nombre, email, telefono || null, mensaje).run();

    return Response.json({ ok: true, mensaje: 'Mensaje enviado. Te responderemos a la brevedad.' });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
