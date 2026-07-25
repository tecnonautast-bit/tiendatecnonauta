# Tecnonauta — Sitio web (tienda de repuestos + servicio técnico)

Sitio inspirado en la estructura de **wifixargentina.com.ar** (tienda mayorista de
repuestos para celulares), adaptado a la marca **Tecnonauta**, pensado para
desplegarse en **Cloudflare Pages** con **Cloudflare D1** (SQL) como base de datos.

## Estructura del proyecto

```
tecnonauta-site/
├── public/              → sitio estático (HTML/CSS/JS), esto es lo que se sirve
│   ├── index.html        → home
│   ├── tienda.html        → catálogo con filtros
│   ├── producto.html      → ficha de producto (?slug=...)
│   ├── carrito.html       → carrito de compras
│   ├── distribuidores.html→ alta de distribuidores mayoristas
│   ├── nosotros.html
│   ├── faq.html
│   ├── contacto.html
│   ├── partials/          → header y footer compartidos (se inyectan por JS)
│   ├── css/styles.css     → estilos (paleta violeta tomada del logo)
│   ├── js/app.js          → lógica compartida (carrito, layout, fetch a la API)
│   └── data/*.mock.json   → datos de ejemplo para previsualizar sin base de datos
├── functions/api/         → Cloudflare Pages Functions (backend, usan D1)
│   ├── productos/         → GET listado y detalle de productos
│   ├── categorias/        → GET categorías
│   ├── carrito/           → GET/POST/PUT/DELETE carrito (por cookie de sesión)
│   ├── pedidos/           → POST checkout
│   ├── distribuidores/    → POST alta de solicitud de distribuidor
│   └── contacto/          → POST formulario de contacto
├── schema/
│   ├── schema.sql         → tablas para pegar en el SQL Editor de D1
│   └── seed.sql           → productos de ejemplo (reemplazar por tu catálogo real)
└── wrangler.toml          → configuración de Cloudflare Pages + binding a D1
```

## Cómo desplegar en Cloudflare (paso a paso)

### 1. Crear la base de datos D1
En el dashboard de Cloudflare → **Workers & Pages → D1 → Create database**,
llamala `tecnonauta-db`. O por consola:

```bash
npx wrangler d1 create tecnonauta-db
```

Copiá el `database_id` que te devuelve y pegalo en `wrangler.toml`
(reemplazando `PEGAR_AQUI_TU_DATABASE_ID`).

### 2. Cargar el esquema y los datos de ejemplo
Abrí el **SQL Editor** de esa base en el dashboard de Cloudflare y pegá,
en este orden:

1. Todo el contenido de `schema/schema.sql` (crea las tablas).
2. Todo el contenido de `schema/seed.sql` (carga productos de ejemplo — podés
   editarlo antes para cargar tu catálogo real, o borrarlo si vas a cargar los
   productos manualmente desde el SQL Editor).

También podés hacerlo por consola:

```bash
npx wrangler d1 execute tecnonauta-db --remote --file=./schema/schema.sql
npx wrangler d1 execute tecnonauta-db --remote --file=./schema/seed.sql
```

### 3. Crear el proyecto de Cloudflare Pages
En el dashboard → **Workers & Pages → Create → Pages** → conectá tu
repositorio Git (o subí la carpeta directamente con Wrangler):

```bash
npx wrangler pages deploy public --project-name=tecnonauta
```

Cloudflare detecta automáticamente la carpeta `functions/` y las convierte en
tu API.

### 4. Conectar D1 al proyecto de Pages
En **Settings → Functions → D1 database bindings** del proyecto de Pages,
agregá el binding:
- **Variable name:** `DB`
- **D1 database:** `tecnonauta-db`

Esto es lo mismo que ya está declarado en `wrangler.toml`; si desplegás con
`wrangler pages deploy`, el binding se toma automáticamente de ese archivo.

### 5. (Opcional) Dominio propio
En **Custom domains** del proyecto de Pages, agregá tu dominio (por ejemplo
`tecnonauta.com.ar`) y seguí las instrucciones para apuntar el DNS — si el
dominio ya está en tu cuenta de Cloudflare, el proceso es automático.

## Datos que tenés que completar

Buscá el texto entre corchetes en estos archivos y reemplazalo por tus datos
reales:

- `public/partials/footer.html` → email, WhatsApp, ciudad, redes sociales.
- `public/distribuidores.html` y `public/faq.html` → monto de compra mínima.
- `public/nosotros.html` → historia y misión del negocio.
- `public/contacto.html` → datos de contacto.

## Previsualizar el sitio sin desplegar nada

Como el sitio es estático + Functions, podés levantarlo localmente con:

```bash
npx wrangler pages dev public
```

Esto simula tanto el sitio como la API (aunque sin datos reales de D1 hasta
que conectes una base local con `--d1=DB=tecnonauta-db`). Sin este paso, el
sitio igual funciona abriendo los archivos HTML directamente gracias a los
datos de ejemplo en `public/data/*.mock.json` (el carrito y los formularios no
van a persistir hasta que esté desplegado).

## Catálogo real

Para cargar tu catálogo real, lo más simple es ir editando directamente desde
el **SQL Editor** de D1 con sentencias `INSERT INTO productos (...) VALUES (...)`
siguiendo el mismo formato que `schema/seed.sql`. Más adelante se puede sumar
un panel de administración si lo necesitás.
