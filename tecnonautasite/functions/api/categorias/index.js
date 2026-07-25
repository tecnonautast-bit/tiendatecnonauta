// GET /api/categorias -> lista de categorías activas, para armar el menú y filtros
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, nombre, slug, descripcion, imagen_url
       FROM categorias WHERE activo = 1 ORDER BY orden ASC`
    ).all();
    return Response.json({ ok: true, categorias: results });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
