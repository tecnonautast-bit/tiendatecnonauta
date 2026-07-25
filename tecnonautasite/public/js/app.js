// =========================================================
// TECNONAUTA — lógica compartida del sitio
// =========================================================

const TN = {
  API: '/api',
  fmt(n) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
  },
  // Intenta la API real (Cloudflare Functions + D1). Si todavía no está
  // desplegada (ej. estás previsualizando el sitio en estático), usa el
  // JSON de ejemplo en /data para que la página siempre se vea completa.
  async cargarProductos(params = {}) {
    const qs = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`${TN.API}/productos${qs ? '?' + qs : ''}`);
      if (!res.ok) throw new Error('API no disponible');
      const data = await res.json();
      if (data.ok) return data.productos;
      throw new Error('Respuesta inválida');
    } catch (e) {
      const mock = await fetch('/data/productos.mock.json').then(r => r.json());
      let productos = mock.productos;
      if (params.categoria) productos = productos.filter(p => p.categoria_slug === params.categoria);
      if (params.oferta) productos = productos.filter(p => p.en_oferta);
      if (params.destacado) productos = productos.filter(p => p.destacado);
      if (params.nuevo) productos = productos.filter(p => p.es_nuevo);
      if (params.buscar) {
        const q = params.buscar.toLowerCase();
        productos = productos.filter(p => p.nombre.toLowerCase().includes(q));
      }
      return productos;
    }
  },
  async cargarCategorias() {
    try {
      const res = await fetch(`${TN.API}/categorias`);
      if (!res.ok) throw new Error('API no disponible');
      const data = await res.json();
      if (data.ok) return data.categorias;
      throw new Error('Respuesta inválida');
    } catch (e) {
      const mock = await fetch('/data/categorias.mock.json').then(r => r.json());
      return mock.categorias;
    }
  },
};

// ---------- Cargar header/footer compartidos ----------
async function cargarPartial(selector, ruta) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(ruta);
    el.innerHTML = await res.text();
  } catch (e) {
    console.error('No se pudo cargar', ruta, e);
  }
}

async function initLayout() {
  await Promise.all([
    cargarPartial('#tn-header', '/partials/header.html'),
    cargarPartial('#tn-footer', '/partials/footer.html'),
  ]);

  const anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();

  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('navPrincipal');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('abierto'));
  }

  // marcar link activo
  const path = location.pathname;
  document.querySelectorAll('.nav-principal a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('activo');
  });

  const formNewsletter = document.getElementById('formNewsletter');
  if (formNewsletter) {
    formNewsletter.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('¡Gracias por sumarte! (conectar este formulario a /api/newsletter cuando esté listo)');
      formNewsletter.reset();
    });
  }

  actualizarBadgeCarrito();
}

// ---------- Carrito ----------
async function actualizarBadgeCarrito() {
  const badge = document.getElementById('badgeCarrito');
  if (!badge) return;
  try {
    const res = await fetch(`${TN.API}/carrito`);
    const data = await res.json();
    const total = (data.items || []).reduce((acc, it) => acc + it.cantidad, 0);
    badge.textContent = total;
  } catch (e) {
    badge.textContent = '0';
  }
}

async function agregarAlCarrito(productoId, cantidad = 1) {
  try {
    await fetch(`${TN.API}/carrito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto_id: productoId, cantidad }),
    });
    actualizarBadgeCarrito();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ---------- Tarjeta de producto (reutilizable) ----------
function tarjetaProductoHTML(p) {
  const precio = p.precio ?? p.precio_minorista;
  return `
    <div class="tarjeta-producto">
      <div class="badges">
        ${p.en_oferta ? '<span class="badge badge-oferta">Oferta</span>' : ''}
        ${p.es_nuevo ? '<span class="badge badge-nuevo">Nuevo</span>' : ''}
      </div>
      <a href="/producto.html?slug=${p.slug}" class="imagen">
        <img src="${p.imagen_url || '/img/productos/placeholder.png'}" alt="${p.nombre}" loading="lazy">
      </a>
      <div class="info">
        <span class="categoria">${p.categoria || ''} ${p.marca ? '· ' + p.marca : ''}</span>
        <a href="/producto.html?slug=${p.slug}"><h3>${p.nombre}</h3></a>
        <div class="precio">${TN.fmt(precio)}<small>Precio minorista, IVA incluido</small></div>
      </div>
      <button class="btn btn-primary btn-block agregar" data-id="${p.id}">Agregar al carrito</button>
    </div>
  `;
}

function activarBotonesAgregar(root = document) {
  root.querySelectorAll('.agregar[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.textContent = 'Agregando...';
      const ok = await agregarAlCarrito(Number(btn.dataset.id), 1);
      btn.textContent = ok ? '¡Agregado! ✔' : 'Error, reintentar';
      setTimeout(() => { btn.textContent = 'Agregar al carrito'; }, 1500);
    });
  });
}

document.addEventListener('DOMContentLoaded', initLayout);
