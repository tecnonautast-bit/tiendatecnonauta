-- =========================================================
-- TECNONAUTA - Datos de ejemplo (seed)
-- Ejecutar DESPUÉS de schema.sql en el SQL Editor de D1
-- Reemplazá / borrá estos productos de ejemplo por tu catálogo real
-- =========================================================

INSERT INTO marcas (nombre, slug) VALUES
 ('Apple','apple'),
 ('Samsung','samsung'),
 ('Xiaomi','xiaomi'),
 ('Motorola','motorola');

INSERT INTO modelos (marca_id, nombre, slug) VALUES
 ((SELECT id FROM marcas WHERE slug='apple'),   'iPhone 11', 'iphone-11'),
 ((SELECT id FROM marcas WHERE slug='apple'),   'iPhone 12', 'iphone-12'),
 ((SELECT id FROM marcas WHERE slug='samsung'), 'Galaxy A10','galaxy-a10'),
 ((SELECT id FROM marcas WHERE slug='samsung'), 'Galaxy A20','galaxy-a20'),
 ((SELECT id FROM marcas WHERE slug='xiaomi'),  'Redmi Note 10','redmi-note-10'),
 ((SELECT id FROM marcas WHERE slug='motorola'),'Moto G30','moto-g30');

INSERT INTO categorias (nombre, slug, descripcion, orden) VALUES
 ('Módulos / Pantallas', 'modulos-pantallas', 'Pantallas y módulos LCD/OLED para todas las marcas', 1),
 ('Baterías', 'baterias', 'Baterías originales y compatibles', 2),
 ('Herramientas', 'herramientas', 'Herramientas de apertura, soldadura y diagnóstico', 3),
 ('Repuestos varios', 'repuestos-varios', 'Flex, conectores de carga, cámaras, tapas', 4),
 ('Accesorios', 'accesorios', 'Fundas, vidrios templados, cables', 5);

INSERT INTO calidades (nombre, descripcion, orden) VALUES
 ('Original', 'Repuesto original de fábrica', 1),
 ('OEM Premium', 'Calidad equivalente al original', 2),
 ('Incell', 'Buena relación calidad/precio', 3),
 ('Genérica', 'Económica, ideal para reventa masiva', 4);

INSERT INTO productos
 (sku, nombre, slug, descripcion, categoria_id, marca_id, modelo_id, calidad_id,
  precio_minorista, precio_mayorista, stock, imagen_url, destacado, en_oferta, es_nuevo)
VALUES
 ('TN-MOD-IP11-OEM','Módulo iPhone 11 OEM Premium','modulo-iphone-11-oem',
  'Módulo de pantalla para iPhone 11, calidad OEM Premium, incluye vidrio templado de regalo.',
  (SELECT id FROM categorias WHERE slug='modulos-pantallas'),
  (SELECT id FROM marcas WHERE slug='apple'),
  (SELECT id FROM modelos WHERE slug='iphone-11'),
  (SELECT id FROM calidades WHERE nombre='OEM Premium'),
  45000, 36000, 25, '/img/productos/placeholder.png', 1, 0, 0),

 ('TN-BAT-A10-ORI','Batería Galaxy A10 Original','bateria-galaxy-a10-original',
  'Batería original Samsung para Galaxy A10, 3400mAh.',
  (SELECT id FROM categorias WHERE slug='baterias'),
  (SELECT id FROM marcas WHERE slug='samsung'),
  (SELECT id FROM modelos WHERE slug='galaxy-a10'),
  (SELECT id FROM calidades WHERE nombre='Original'),
  18000, 14000, 40, '/img/productos/placeholder.png', 1, 1, 0),

 ('TN-MOD-RN10-INC','Módulo Redmi Note 10 Incell','modulo-redmi-note-10-incell',
  'Módulo de pantalla Incell para Redmi Note 10.',
  (SELECT id FROM categorias WHERE slug='modulos-pantallas'),
  (SELECT id FROM marcas WHERE slug='xiaomi'),
  (SELECT id FROM modelos WHERE slug='redmi-note-10'),
  (SELECT id FROM calidades WHERE nombre='Incell'),
  32000, 25000, 15, '/img/productos/placeholder.png', 0, 1, 1),

 ('TN-HER-KIT01','Kit de herramientas de apertura x24','kit-herramientas-apertura-24',
  'Kit completo de herramientas para apertura y reparación de celulares.',
  (SELECT id FROM categorias WHERE slug='herramientas'),
  NULL, NULL,
  (SELECT id FROM calidades WHERE nombre='Genérica'),
  9500, 7000, 60, '/img/productos/placeholder.png', 1, 0, 0),

 ('TN-FLEX-G30-CARGA','Flex de carga Moto G30','flex-carga-moto-g30',
  'Conector/flex de carga para Motorola Moto G30.',
  (SELECT id FROM categorias WHERE slug='repuestos-varios'),
  (SELECT id FROM marcas WHERE slug='motorola'),
  (SELECT id FROM modelos WHERE slug='moto-g30'),
  (SELECT id FROM calidades WHERE nombre='OEM Premium'),
  8500, 6200, 30, '/img/productos/placeholder.png', 0, 0, 1),

 ('TN-MOD-IP12-ORI','Módulo iPhone 12 Original','modulo-iphone-12-original',
  'Módulo de pantalla original para iPhone 12 (recuperado y testeado).',
  (SELECT id FROM categorias WHERE slug='modulos-pantallas'),
  (SELECT id FROM marcas WHERE slug='apple'),
  (SELECT id FROM modelos WHERE slug='iphone-12'),
  (SELECT id FROM calidades WHERE nombre='Original'),
  78000, 64000, 8, '/img/productos/placeholder.png', 1, 1, 0);
