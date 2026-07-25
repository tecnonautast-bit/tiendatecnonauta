// GET /api/productos/:slug -> detalle de un producto
export async function onRequestGet(context) {
  const { env, params } = context;
  const slug = params.slug;

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

  try {
    const producto = await env.DB.prepare(sql).bind(slug).first();
    if (!producto) {
      return Response.json({ ok: false, error: 'Producto no encontrado' }, { status: 404 });
    }
    return Response.json({ ok: true, producto });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
