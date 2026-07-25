-- =========================================================
-- TECNONAUTA - Esquema de base de datos (Cloudflare D1 / SQLite)
-- Pegar y ejecutar en el SQL Editor de Cloudflare D1
-- =========================================================

PRAGMA foreign_keys = ON;

-- ---------- MARCAS (Apple, Samsung, Xiaomi, Motorola, etc.) ----------
CREATE TABLE IF NOT EXISTS marcas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  activo        INTEGER NOT NULL DEFAULT 1
);

-- ---------- MODELOS (iPhone 11, Galaxy A10, Redmi Note 10, etc.) ----------
CREATE TABLE IF NOT EXISTS modelos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  marca_id      INTEGER NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  slug          TEXT NOT NULL,
  activo        INTEGER NOT NULL DEFAULT 1,
  UNIQUE (marca_id, slug)
);

-- ---------- CATEGORIAS (Modulos/Pantallas, Baterias, Herramientas, Repuestos varios, Accesorios) ----------
CREATE TABLE IF NOT EXISTS categorias (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  descripcion   TEXT,
  imagen_url    TEXT,
  orden         INTEGER NOT NULL DEFAULT 0,
  activo        INTEGER NOT NULL DEFAULT 1
);

-- ---------- CALIDADES (Original, Genérica/OEM, Incell, Amoled, etc.) ----------
CREATE TABLE IF NOT EXISTS calidades (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL UNIQUE,   -- ej: 'Original', 'OEM Premium', 'Incell', 'Genérica'
  descripcion   TEXT,
  orden         INTEGER NOT NULL DEFAULT 0
);

-- ---------- PRODUCTOS ----------
CREATE TABLE IF NOT EXISTS productos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sku               TEXT NOT NULL UNIQUE,
  nombre            TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  descripcion       TEXT,
  categoria_id      INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  marca_id          INTEGER REFERENCES marcas(id) ON DELETE SET NULL,
  modelo_id         INTEGER REFERENCES modelos(id) ON DELETE SET NULL,
  calidad_id        INTEGER REFERENCES calidades(id) ON DELETE SET NULL,
  precio_minorista  REAL NOT NULL DEFAULT 0,      -- precio venta al público
  precio_mayorista  REAL NOT NULL DEFAULT 0,      -- precio para distribuidores aprobados
  stock             INTEGER NOT NULL DEFAULT 0,
  imagen_url        TEXT,
  destacado         INTEGER NOT NULL DEFAULT 0,   -- aparece en home
  en_oferta         INTEGER NOT NULL DEFAULT 0,   -- aparece en "OfertasHOT"
  es_nuevo          INTEGER NOT NULL DEFAULT 0,   -- aparece en "Nuevo"
  activo            INTEGER NOT NULL DEFAULT 1,
  creado_en         TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_marca ON productos(marca_id);
CREATE INDEX IF NOT EXISTS idx_productos_modelo ON productos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_productos_destacado ON productos(destacado);
CREATE INDEX IF NOT EXISTS idx_productos_oferta ON productos(en_oferta);

-- ---------- USUARIOS (clientes minoristas y distribuidores) ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  telefono       TEXT,
  tipo           TEXT NOT NULL DEFAULT 'minorista' CHECK (tipo IN ('minorista','distribuidor','admin')),
  cuit           TEXT,
  aprobado       INTEGER NOT NULL DEFAULT 0,   -- distribuidores requieren aprobación manual
  creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- DIRECCIONES ----------
CREATE TABLE IF NOT EXISTS direcciones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  calle        TEXT NOT NULL,
  numero       TEXT,
  ciudad       TEXT NOT NULL,
  provincia    TEXT NOT NULL,
  cp           TEXT,
  telefono     TEXT,
  predeterminada INTEGER NOT NULL DEFAULT 0
);

-- ---------- CARRITO (por sesión, funciona con o sin login) ----------
CREATE TABLE IF NOT EXISTS carrito_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL,             -- id de sesión anónima (cookie) o usuario_id como texto
  producto_id  INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad     INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (session_id, producto_id)
);

CREATE INDEX IF NOT EXISTS idx_carrito_session ON carrito_items(session_id);

-- ---------- PEDIDOS ----------
CREATE TABLE IF NOT EXISTS pedidos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  direccion_id   INTEGER REFERENCES direcciones(id) ON DELETE SET NULL,
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','pagado','preparando','enviado','entregado','cancelado')),
  metodo_envio   TEXT CHECK (metodo_envio IN ('oca','andreani','retiro_local')),
  metodo_pago    TEXT,
  subtotal       REAL NOT NULL DEFAULT 0,
  costo_envio    REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL DEFAULT 0,
  notas          TEXT,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES productos(id),
  cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pedidoitems_pedido ON pedido_items(pedido_id);

-- ---------- SOLICITUDES DE DISTRIBUIDOR ----------
CREATE TABLE IF NOT EXISTS distribuidores_solicitudes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_negocio TEXT NOT NULL,
  cuit           TEXT,
  email          TEXT NOT NULL,
  telefono       TEXT,
  ciudad         TEXT,
  mensaje        TEXT,
  estado         TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- CONTACTO (formulario "Contacto" / FAQ no resuelta) ----------
CREATE TABLE IF NOT EXISTS contactos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  email      TEXT NOT NULL,
  telefono   TEXT,
  mensaje    TEXT NOT NULL,
  leido      INTEGER NOT NULL DEFAULT 0,
  creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- NEWSLETTER ----------
CREATE TABLE IF NOT EXISTS newsletter_subs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);
