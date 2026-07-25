// GET /api/productos?categoria=modulos-pantallas&marca=apple&oferta=1&destacado=1&buscar=iphone
// Lee productos desde la base D1 (binding "DB", ver wrangler.toml)
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
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

  try {
    const { results } = await env.DB.prepare(sql).bind(...params).all();
    const productos = results.map(p => ({
      ...p,
      precio: distribuidor ? p.precio_mayorista : p.precio_minorista,
    }));
    return Response.json({ ok: true, productos });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
