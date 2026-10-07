const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: 'uploads/' });

function leerDB() {
    if (!fs.existsSync(DB_FILE)) {
        const datosIniciales = { 
            config: {
                telefono: "1111111111",
                direccion: "25 de mayo 78 (local 13) Marcos Paz"
            },
            usuarios: [
                {
                    id: 1,
                    numero_cliente: "ADMIN-01",
                    nombre: "Dueño",
                    apellido: "Principal",
                    nombre_local: "Casa Central Repuestos",
                    direccion: "25 de mayo 78 (local 13) Marcos Paz",
                    telefono: "1111111111",
                    correo: "admin@gremio.com",
                    password: "admin",
                    rol: "dueño",
                    cuenta_corriente: 0,
                    saldo_pendiente: 0
                }
            ], 
            productos: [
                { id: 1, codigo: "REP-001", nombre: "Módulo Display OLED iPhone", categoria: "Repuestos", precio: 15500, costo: 11000, stock: 25, imagen: "" },
                { id: 2, codigo: "ACC-001", nombre: "Parlante Bluetooth Portátil", categoria: "Accesorios", precio: 4500, costo: 3000, stock: 30, imagen: "" },
                { id: 3, codigo: "HER-001", nombre: "Kit de Destornilladores de Precisión", categoria: "Herramientas", precio: 8900, costo: 6000, stock: 15, imagen: "" },
                { id: 4, codigo: "VAR-001", nombre: "Cinta Térmica Doble Faz 5mm", categoria: "Varios", precio: 1200, costo: 700, stock: 50, imagen: "" }
            ], 
            carrusel: {
                activo: true,
                imagenes: []
            },
            categoriasConfig: {
                "Repuestos": { desc: "Módulos, placa de carga, displays, tapas y flex.", imagen: "" },
                "Accesorios": { desc: "Cables, cargadores, auriculares y fundas.", imagen: "" },
                "Baterías": { desc: "Baterías originales y compatibles.", imagen: "" },
                "Herramientas": { desc: "Insumos para técnicos y aficionados.", imagen: "" }
            },
            pedidos: [] 
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(datosIniciales, null, 2));
    } else {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (!db.config) db.config = { telefono: "1111111111", direccion: "25 de mayo 78 (local 13) Marcos Paz" };
        if (!db.carrusel) db.carrusel = { activo: true, imagenes: [] };
        if (!db.carrusel.imagenes) db.carrusel.imagenes = [];
        if (!db.productos) db.productos = [];
        if (!db.pedidos) db.pedidos = [];
        if (!db.categoriasConfig) {
            db.categoriasConfig = {
                "Repuestos": { desc: "Módulos, placa de carga, displays, tapas y flex.", imagen: "" },
                "Accesorios": { desc: "Cables, cargadores, auriculares y fundas.", imagen: "" },
                "Baterías": { desc: "Baterías originales y compatibles.", imagen: "" },
                "Herramientas": { desc: "Insumos para técnicos y aficionados.", imagen: "" }
            };
        }
        db.productos.forEach(p => { if (!p.costo) p.costo = Math.round(p.precio * 0.7); });
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function escribirDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

leerDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
    secret: 'ks_modulos_secreto_2026',
    resave: false,
    saveUninitialized: true
}));

function renderHTML(title, content, usuario, req) {
    const db = leerDB();
    const telActual = db.config.telefono || "1111111111";
    const dirActual = db.config.direccion || "25 de mayo 78 (local 13) Marcos Paz";

    let adminLink = '';
    let carritoCount = 0;
    if (req && req.session && req.session.carrito) {
        carritoCount = req.session.carrito.reduce((acc, item) => acc + item.cantidad, 0);
    }

    if (usuario && usuario.rol === 'dueño') {
        const pendingCount = db.pedidos.filter(p => p.estadoPago === 'PENDIENTE DE VALIDACIÓN').length;
        const lowStockCount = db.productos.filter(p => p.stock <= 3).length;
        const totalAlertas = pendingCount + lowStockCount;

        adminLink = `
            <a href="/admin" style="position: relative; color: #facc15; font-weight: bold;">
                ⚙ PANEL DUEÑO 
                <span style="background: #dc2626; color: white; border-radius: 50%; padding: 2px 7px; font-size: 11px; font-weight: bold; margin-left: 4px;">🔔 ${totalAlertas}</span>
            </a>
        `;
    }

    let carritoLink = '';
    if (usuario && usuario.rol === 'cliente') {
        carritoLink = `<a href="/carrito" style="color: #facc15; font-weight: bold;">🛒 CARRITO (${carritoCount})</a>`;
    }

    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body>
            <div class="top-bar">
                <div>📍 ${dirActual}</div>
                <div>⚡ Ventas x Mayor y Menor - KS Módulos</div>
                <div>📞 ${telActual}</div>
            </div>

            <div class="main-nav">
                <div class="nav-brand" style="display: flex; align-items: center; gap: 10px;">
                    <img src="/uploads/logo-ks.png" alt="KS Módulos" onerror="this.style.display='none'">
                    <span>KS MÓDULOS</span>
                </div>
                <div class="nav-links">
                    <a href="/">INICIO</a>
                    <a href="/">TIENDA</a>
                    ${carritoLink}
                    ${adminLink}
                </div>
                <div>
                    <input type="text" class="nav-search" placeholder="Buscar repuesto..." onkeyup="filtrarGlobal(this.value)">
                </div>
            </div>

            <div class="container">
                ${content}
            </div>

            <script>
                function filtrarGlobal(val) {
                    const cards = document.querySelectorAll('.product-card');
                    cards.forEach(card => {
                        card.style.display = card.innerText.toLowerCase().includes(val.toLowerCase()) ? 'flex' : 'none';
                    });
                }
            </script>
        </body>
        </html>
    `;
}

app.get('/', (req, res) => {
    const db = leerDB();
    const usuario = req.session.usuario;
    const telActual = db.config.telefono || "1111111111";
    
    let carruselHTML = '';
    if (db.carrusel && db.carrusel.activo && db.carrusel.imagenes && db.carrusel.imagenes.length > 0) {
        const slidesJSON = JSON.stringify(db.carrusel.imagenes);
        carruselHTML = `
            <div class="carrusel-fino-container">
                <h3 id="carrusel-titulo" style="color: #facc15; margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">🔥 PROMOCIÓN DESTACADA</h3>
                <div class="carrusel-banner-wrapper">
                    <img id="carrusel-img" src="" alt="Promo">
                </div>
                <div style="display: flex; justify-content: center; gap: 6px; margin-top: 8px;" id="carrusel-dots"></div>
            </div>
            <script>
                const slides = ${slidesJSON};
                let currentIndex = 0;
                function actualizarCarrusel() {
                    if (slides.length === 0) return;
                    const imgElement = document.getElementById('carrusel-img');
                    const tituloElement = document.getElementById('carrusel-titulo');
                    const dotsContainer = document.getElementById('carrusel-dots');
                    imgElement.style.opacity = 0;
                    setTimeout(() => {
                        imgElement.src = '/uploads/' + slides[currentIndex].archivo;
                        tituloElement.innerText = "🔥 " + slides[currentIndex].titulo;
                        imgElement.style.opacity = 1;
                    }, 250);
                    dotsContainer.innerHTML = slides.map((s, i) => 
                        '<span onclick="currentIndex = ' + i + '; actualizarCarrusel();" style="width: 9px; height: 9px; border-radius: 50%; background: ' + (i === currentIndex ? '#facc15' : '#475569') + '; cursor: pointer; display: inline-block;"></span>'
                    ).join('');
                }
                if (slides.length > 0) {
                    actualizarCarrusel();
                    setInterval(() => {
                        currentIndex = (currentIndex + 1) % slides.length;
                        actualizarCarrusel();
                    }, 4000);
                }
            </script>
        `;
    }

    let heroHTML = `
        <div class="hero-section">
            <div class="hero-content">
                <div class="hero-text">
                    <h1>VENTAS POR MAYOR Y MENOR EN <span>REPUESTOS Y ACCESORIOS</span></h1>
                    <p>Trabajando siempre con la mayor calidad del mercado, stock permanente y atención especializada para técnicos y gremio.</p>
                    <a href="https://wa.me/549${telActual}" target="_blank" class="btn" style="display: inline-block; padding: 11px 22px; text-decoration: none; font-size: 13px;">💬 CONSULTAS POR WHATSAPP</a>
                    
                    <div class="hero-badges">
                        <div class="badge-item">
                            <strong>🎯 Atención</strong>
                            <span>Personalizada para cada cliente.</span>
                        </div>
                        <div class="badge-item">
                            <strong>⭐ Calidad</strong>
                            <span>Productos testeados y garantizados.</span>
                        </div>
                        <div class="badge-item">
                            <strong>📦 Mayor/Menor</strong>
                            <span>Adaptado a tus necesidades.</span>
                        </div>
                        <div class="badge-item">
                            <strong>🛡️ Confianza</strong>
                            <span>Trayectoria y respaldo en cada compra.</span>
                        </div>
                    </div>
                </div>
                <div class="hero-logo-container">
                    <img src="/uploads/logo-ks.png" alt="Logo KS Módulos" onerror="this.style.display='none'">
                </div>
            </div>
        </div>
    `;

    const categoriasKeys = Object.keys(db.categoriasConfig);
    let categoriasGridHTML = categoriasKeys.map(cat => {
        const conf = db.categoriasConfig[cat];
        const btnTexto = `👁 VER ${cat.toUpperCase()}`;
        return `
            <div class="categoria-card">
                <div>
                    <div class="categoria-img-box">
                        ${conf.imagen ? `<img src="/uploads/${conf.imagen}" alt="${cat}">` : '<span style="color:#64748b; font-size:11px;">Sin Imagen</span>'}
                    </div>
                    <div class="categoria-info">
                        <h3>${cat}</h3>
                        <p>${conf.desc}</p>
                    </div>
                </div>
                <a href="#cat-${cat}" onclick="filtrarGlobal('${cat}')" class="btn-categoria">${btnTexto}</a>
            </div>
        `;
    }).join('');

    let categoriasSeccionHTML = `
        <h2 class="categorias-titulo">CATEGORÍAS: TIENDA</h2>
        <div class="categorias-grid">${categoriasGridHTML}</div>
    `;

    const categorias = ["Repuestos", "Accesorios", "Baterías", "Herramientas", "Varios"];
    let catalogoPorCategorias = categorias.map(cat => {
        const prodsCat = db.productos.filter(p => p.categoria.toLowerCase() === cat.toLowerCase());
        if (prodsCat.length === 0) return '';

        let itemsHTML = prodsCat.map(p => `
            <div class="product-card">
                <div>
                    ${p.imagen ? `<img src="/uploads/${p.imagen}" alt="Repuesto">` : '<div style="width: 100%; height: 150px; background: #1e293b; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:12px; margin-bottom:12px; border-radius:6px; font-weight: 600;">Sin Imagen</div>'}
                    <h4 style="margin: 0 0 6px 0; color: #f8fafc; font-size: 15px;">${p.nombre}</h4>
                    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 6px 0;">Código: <b>${p.codigo}</b></p>
                    <p style="color: #38bdf8; font-weight: bold; font-size: 18px; margin: 0 0 6px 0;">$${p.precio}</p>
                    <p style="font-size: 12px; color: #cbd5e1; margin: 0 0 12px 0;">Stock disponible: <b>${p.stock}</b></p>
                </div>
                ${usuario && usuario.rol === 'cliente' ? `
                    <form action="/carrito/agregar" method="POST" style="display:flex; gap:5px;">
                        <input type="hidden" name="productoId" value="${p.id}">
                        <input type="number" name="cantidad" value="1" min="1" max="${p.stock}" style="width: 60px; text-align: center;">
                        <button type="submit" class="btn" style="flex: 1; padding: 8px; font-size: 12px;">🛒 Agregar</button>
                    </form>
                ` : `<p style="color: #f87171; font-size: 12px; text-align: center; font-weight: 600; margin: 10px 0;">Inicia sesión como cliente para comprar</p>`}
            </div>
        `).join('');

        return `
            <div id="cat-${cat}" style="margin-bottom: 40px;">
                <h3 style="border-bottom: 2px solid #facc15; padding-bottom: 8px; color: #f8fafc; display: flex; align-items: center; gap: 8px; font-size: 18px;">📂 ${cat}</h3>
                <div class="product-grid">${itemsHTML}</div>
            </div>
        `;
    }).join('');

    let misPedidosHTML = '';
    if (usuario && usuario.rol === 'cliente') {
        const pedidosCliente = db.pedidos.filter(ped => ped.clienteId === usuario.id);
        misPedidosHTML = `
            <hr style="margin-top: 40px;">
            <h3 style="color: #f8fafc;">📋 Mis Comprobantes y Estado de Pedidos</h3>
            <table>
                <tr><th>N° Pedido</th><th>Detalle</th><th>Total</th><th>Pago</th><th>Retiro / Envío</th><th>Comprobante</th></tr>
                ${pedidosCliente.map(ped => `
                    <tr>
                        <td><b>#${ped.id}</b></td>
                        <td>${ped.detalleResumen}</td>                         <td><b>$${ped.total}</b></td>
                        <td><span style="color: #f87171; font-weight: bold;">${ped.estadoPago}</span></td>
                        <td><span style="color: #fbbf24; font-weight: bold;">${ped.estadoRetiro}</span></td>
                        <td><a href="/comprobante/${ped.id}" target="_blank" class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration: none;">📄 Ver Comprobante</a></td>
                    </tr>
                `).join('') || '<tr><td colspan="6">No tienes pedidos realizados aún.</td></tr>'}
            </table>
        `;
    }

    let usuarioBarHTML = usuario ? `
        <div class="user-bar">
            <div>Hola, <b>${usuario.nombre} ${usuario.apellido}</b> (${usuario.nombre_local}) | N° Cliente: <b>${usuario.numero_cliente}</b></div>
            <div><a href="/logout" class="btn" style="background: #475569; color: #fff; padding: 8px 15px; font-size: 13px; text-decoration: none;">Cerrar Sesión</a></div>
        </div>
    ` : `
        <div class="user-bar">
            <div>Para ver precios y realizar pedidos al gremio, inicia sesión o regístrate.</div>
            <div>
                <a href="/login" class="btn" style="margin-right: 10px; padding: 8px 15px; font-size: 13px; text-decoration: none;">Iniciar Sesión</a>
                <a href="/registro" class="btn" style="background: #475569; color: #fff; padding: 8px 15px; font-size: 13px; text-decoration: none;">Registrarse</a>
            </div>
        </div>
    `;

    const contenido = `${carruselHTML}${usuarioBarHTML}${heroHTML}${categoriasSeccionHTML}<h3 style="margin-top: 30px; color: #f8fafc;">📦 Catálogo Digital por Categorías</h3><div style="margin-top: 20px;">${catalogoPorCategorias || '<p>No hay productos cargados.</p>'}</div>${misPedidosHTML}`;
    res.send(renderHTML('KS Módulos - Plataforma Digital', contenido, usuario, req));
});

app.post('/carrito/agregar', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'cliente') return res.redirect('/login');
    const { productoId, cantidad } = req.body;
    const db = leerDB();
    const producto = db.productos.find(p => p.id == productoId);
    if (!producto) return res.redirect('/');

    if (!req.session.carrito) req.session.carrito = [];
    const cantNum = parseInt(cantidad) || 1;

    const itemExistente = req.session.carrito.find(item => item.productoId == productoId);
    if (itemExistente) {
        itemExistente.cantidad += cantNum;
    } else {
        req.session.carrito.push({
            productoId: producto.id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            precio: producto.precio,
            costo: producto.costo || 0,
            cantidad: cantNum
        });
    }
    res.redirect('/');
});

app.post('/carrito/quitar', (req, res) => {
    if (!req.session.carrito) req.session.carrito = [];
    const { productoId } = req.body;
    req.session.carrito = req.session.carrito.filter(item => item.productoId != productoId);
    res.redirect('/carrito');
});

app.get('/carrito', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'cliente') return res.redirect('/login');
    const carrito = req.session.carrito || [];
    const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    let itemsHTML = carrito.map(item => `
        <tr>
            <td><b>${item.codigo}</b></td>
            <td>${item.nombre}</td>
            <td>$${item.precio}</td>
            <td>${item.cantidad}</td>
            <td><b>$${item.precio * item.cantidad}</b></td>
            <td>
                <form action="/carrito/quitar" method="POST">
                    <input type="hidden" name="productoId" value="${item.productoId}">
                    <button type="submit" style="background: #dc2626; color: #fff; padding: 5px 10px; font-size: 11px;">Quitar</button>
                </form>
            </td>
        </tr>
    `).join('');

    const contenido = `
        <h2 style="color: #f8fafc;">🛒 Carrito de Compras del Gremio</h2>
        <table>
            <tr><th>Código</th><th>Producto</th><th>Precio Unitario</th><th>Cantidad</th><th>Subtotal</th><th>Acción</th></tr>
            ${itemsHTML || '<tr><td colspan="6">Tu carrito está vacío.</td></tr>'}
        </table>
        ${carrito.length > 0 ? `
            <div style="margin-top: 25px; background: #1e293b; padding: 20px; border-radius: 8px; text-align: right;">
                <h3 style="color: #facc15; margin-top: 0;">Total General: $${total}</h3>
                <form action="/hacer-pedido-carrito" method="POST" style="display: inline-block; text-align: left; margin-top: 10px;">
                    <label style="color: #fff;">Método de Pago:</label>
                    <select name="metodoPago" style="padding: 8px; margin: 10px 0; display: block; width: 250px;">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia Bancaria</option>
                        ${req.session.usuario.cuenta_corriente === 1 ? '<option value="Cuenta Corriente">Cuenta Corriente</option>' : ''}
                    </select>
                    <button type="submit" class="btn" style="background: #16a34a; width: 100%; padding: 12px;">Confirmar y Enviar Pedido</button>
                </form>
            </div>
        ` : ''}
        <br><a href="/" class="btn" style="background: #475569; color: #fff; text-decoration: none; padding: 8px 15px;">← Volver a la Tienda</a>
    `;
    res.send(renderHTML('Carrito de Compras', contenido, req.session.usuario, req));
});

app.post('/hacer-pedido-carrito', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'cliente') return res.redirect('/login');
    const carrito = req.session.carrito || [];
    if (carrito.length === 0) return res.redirect('/');

    const { metodoPago } = req.body;
    const db = leerDB();
    const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const costoTotal = carrito.reduce((acc, item) => acc + ((item.costo || 0) * item.cantidad), 0);
    const detalleResumen = carrito.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');

    const nuevoPedido = {
        id: db.pedidos.length + 1,
        clienteId: req.session.usuario.id,
        nombreCliente: `${req.session.usuario.nombre} ${req.session.usuario.apellido}`,
        localCliente: req.session.usuario.nombre_local,
        numeroCliente: req.session.usuario.numero_cliente,
        items: carrito,
        detalleResumen: detalleResumen,
        total: total,
        costoTotal: costoTotal,
        ganancia: total - costoTotal,
        metodoPago: metodoPago,
        estadoPago: 'PENDIENTE DE VALIDACIÓN',
        estadoRetiro: 'PENDIENTE DE APROBACIÓN',
        fecha: new Date().toLocaleDateString(),
        fechaIso: new Date().toISOString().split('T')[0]
    };

    db.pedidos.push(nuevoPedido);
    escribirDB(db);
    req.session.carrito = [];

    res.send(`<script>alert('¡Pedido generado con éxito! El dueño validará el pago y el estado.'); window.location.href='/';</script>`);
});

app.get('/comprobante/:id', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');
    const db = leerDB();
    const pedido = db.pedidos.find(p => p.id == req.params.id);
    if (!pedido) return res.send('Pedido no encontrado');

    const contenido = `
        <div style="max-width: 700px; margin: 20px auto; padding: 35px; border: 2px dashed #64748b; position: relative; background: #0f172a; border-radius: 8px; color: #e2e8f0; overflow: hidden;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 0; pointer-events: none; opacity: 0.08;">
                <img src="/uploads/logo-ks.png" style="width: 350px; height: 350px; object-fit: contain;">
            </div>
            <div style="position: relative; z-index: 1;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <img src="/uploads/logo-ks.png" style="width: 50px; height: 50px; object-fit: contain;">
                    <h2 style="color: #f8fafc; margin: 0;">COMPROBANTE DE PEDIDO - KS MÓDULOS</h2>
                </div>
                <hr>
                <p><b>N° de Pedido:</b> #${pedido.id}</p>
                <p><b>Fecha:</b> ${pedido.fecha}</p>
                <p><b>Cliente:</b> ${pedido.nombreCliente} (${pedido.localCliente}) - ${pedido.numeroCliente}</p>
                <hr>
                <h4 style="color: #38bdf8;">Detalle de Productos:</h4>
                <p>${pedido.detalleResumen}</p>
                <p><b>Total a Pagar:</b> $${pedido.total}</p>
                <p><b>Método de Pago:</b> ${pedido.metodoPago}</p>
                <p><b>Estado del Pago:</b> <span style="color: #f87171; font-weight: bold;">${pedido.estadoPago}</span></p>
                <p><b>Estado del Retiro/Envío:</b> <span style="color: #fbbf24; font-weight: bold;">${pedido.estadoRetiro}</span></p>
                <hr>
                <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    <b>Garantía:</b> Los repuestos electrónicos cuentan con garantía de prueba antes de ser instalados. No se aceptan cambios con flex cortados o marcas de pegamento.
                </p>
                <br>
                <button onclick="window.print()" class="btn">Imprimir / Guardar PDF</button>
            </div>
        </div>
    `;
    res.send(renderHTML('Comprobante de Pedido', contenido, req.session.usuario, req));
});

app.get('/registro', (req, res) => {
    const contenido = `
        <div style="max-width: 450px; margin: 20px auto;">
            <h3 style="text-align: center; color: #f8fafc;">📝 Registro de Nuevo Cliente (Gremio)</h3>
            <form action="/registro" method="POST" style="display: flex; flex-direction: column; gap: 12px;">
                <label>Nombre:</label><input type="text" name="nombre" required>
                <label>Apellido:</label><input type="text" name="apellido" required>
                <label>Nombre del Local:</label><input type="text" name="nombre_local" required>
                <label>Dirección:</label><input type="text" name="direccion" required>
                <label>Teléfono:</label><input type="text" name="telefono" required>
                <label>Correo:</label><input type="email" name="correo" required>
                <label>Contraseña:</label><input type="password" name="password" required>
                <button type="submit" class="btn" style="margin-top: 10px;">Registrarse</button>
            </form>
            <p style="text-align: center; margin-top: 15px;"><a href="/login">¿Ya tienes cuenta? Inicia sesión</a></p>
        </div>
    `;
    res.send(renderHTML('Registro - Gremio', contenido, null, req));
});

app.post('/registro', (req, res) => {
    const { nombre, apellido, nombre_local, direccion, telefono, correo, password } = req.body;
    const db = leerDB();
    const totalClientes = db.usuarios.filter(u => u.rol === 'cliente').length + 1;
    const numero_cliente = `CLI-${String(totalClientes).padStart(2, '0')}`;
    db.usuarios.push({ id: db.usuarios.length + 1, numero_cliente, nombre, apellido, nombre_local, direccion, telefono, correo, password, rol: 'cliente', cuenta_corriente: 0, saldo_pendiente: 0 });
    escribirDB(db);
    res.send(`<script>alert('¡Registro exitoso! Tu número de cliente es: ${numero_cliente}'); window.location.href='/login';</script>`);
});

app.get('/login', (req, res) => {
    const contenido = `
        <div style="max-width: 400px; margin: 30px auto;">
            <h3 style="text-align: center; color: #f8fafc;">🔐 Iniciar Sesión</h3>
            <p style="font-size: 13px; background: #1e293b; border: 1px solid #334155; padding: 10px; border-radius: 6px; color: #38bdf8;"><b>Acceso Dueño:</b> admin@gremio.com / admin</p>
            <form action="/login" method="POST" style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px;">
                <label>Correo:</label><input type="email" name="correo" required>
                <label>Contraseña:</label><input type="password" name="password" required>
                <button type="submit" class="btn" style="margin-top: 10px;">Entrar</button>
            </form>
            <p style="text-align: center; margin-top: 15px;"><a href="/registro">Registrar nuevo local</a></p>
        </div>
    `;
    res.send(renderHTML('Iniciar Sesión', contenido, null, req));
});

app.post('/login', (req, res) => {
    const { correo, password } = req.body;
    const db = leerDB();
    const usuario = db.usuarios.find(u => u.correo === correo && u.password === password);
    if (!usuario) return res.send(`<script>alert('Datos incorrectos.'); window.location.href='/login';</script>`);
    req.session.usuario = usuario;
    res.redirect(usuario.rol === 'dueño' ? '/admin' : '/');
});

// PANEL DE DUEÑO CON CONFIGURACIÓN DE TELÉFONO Y LOGO
app.get('/admin', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const db = leerDB();

    const ventasAprobadas = db.pedidos.filter(p => p.estadoRetiro === 'APROBADO Y RETIRADO');
    const conteoProductos = {};
    ventasAprobadas.forEach(ped => {
        if (ped.items) {
            ped.items.forEach(item => {
                conteoProductos[item.nombre] = (conteoProductos[item.nombre] || 0) + item.cantidad;
            });
        }
    });
    let productoTop = "Sin ventas registradas";
    let maxCant = 0;
    for (let [prod, cant] of Object.entries(conteoProductos)) {
        if (cant > maxCant) {
            maxCant = cant;
            productoTop = `${prod} (${cant} unidades)`;
        }
    }

    const hoyIso = new Date().toISOString().split('T')[0];
    const ventasHoy = ventasAprobadas.filter(p => p.fechaIso === hoyIso);
    const totalRecaudadoHoy = ventasHoy.reduce((acc, p) => acc + p.total, 0);
    const gananciaHoy = ventasHoy.reduce((acc, p) => acc + (p.ganancia || 0), 0);

    let carruselAdminHTML = db.carrusel.imagenes.map(slide => `
        <tr>
            <td><img src="/uploads/${slide.archivo}" style="width: 70px; height: 35px; object-fit: cover; background: #000; border-radius: 4px;"></td>
            <td><b>${slide.titulo}</b></td>
            <td>
                <form action="/admin/eliminar-slide/${slide.id}" method="POST" onsubmit="return confirm('¿Eliminar banner?');">
                    <button type="submit" style="background: #dc2626; color: #fff; padding: 5px 10px; font-size: 11px;">Eliminar</button>
                </form>
            </td>
        </tr>
    `).join('');

    let categoriasAdminHTML = Object.keys(db.categoriasConfig).map(cat => {
        const conf = db.categoriasConfig[cat];
        return `
            <tr style="border-bottom: 1px solid #1e293b;">
                <td><b>${cat}</b></td>
                <td>${conf.desc}</td>
                <td>${conf.imagen ? `<img src="/uploads/${conf.imagen}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;">` : 'Sin foto'}</td>
                <td>
                    <form action="/admin/actualizar-categoria" method="POST" enctype="multipart/form-data" style="display: flex; gap: 8px; align-items: center;">
                        <input type="hidden" name="categoria" value="${cat}">
                        <input type="file" name="imagenCat" accept="image/*" required style="font-size: 11px; padding: 4px;">
                        <button type="submit" class="btn" style="padding: 5px 10px; font-size: 11px;">Actualizar Foto</button>
                    </form>
                </td>
            </tr>
        `;
    }).join('');

    let pedidosHTML = db.pedidos.map(ped => `
        <tr>
            <td><b>#${ped.id}</b></td>
            <td>${ped.nombreCliente} (${ped.localCliente})</td>
            <td>${ped.detalleResumen}</td>
            <td><b>$${ped.total}</b> (${ped.metodoPago})</td>
            <td><b>${ped.estadoPago}</b></td>
            <td><b>${ped.estadoRetiro}</b></td>
            <td>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <form action="/admin/estado-pedido/${ped.id}" method="POST">
                        <input type="hidden" name="estado" value="PEDIDO EN CAMINO">
                        <button type="submit" style="background: #0ea5e9; color: #fff; padding: 5px 8px; font-size: 11px;">🚚 En Camino</button>
                    </form>
                    <form action="/admin/estado-pedido/${ped.id}" method="POST">
                        <input type="hidden" name="estado" value="LISTO PARA RETIRAR">
                        <button type="submit" style="background: #d97706; color: #fff; padding: 5px 8px; font-size: 11px;">📦 Listo Retiro</button>
                    </form>
                    <form action="/admin/estado-pedido/${ped.id}" method="POST">
                        <input type="hidden" name="estado" value="APROBADO Y RETIRADO">
                        <button type="submit" style="background: #16a34a; color: #fff; padding: 5px 8px; font-size: 11px;">✅ Aprobar</button>
                    </form>
                </div>
            </td>
        </tr>
    `).join('');

    let clientesHTML = db.usuarios.filter(u => u.rol === 'cliente').map(c => `
        <tr class="cliente-row">
            <td><b>${c.numero_cliente}</b></td>
            <td>${c.nombre} ${c.apellido}</td>
            <td>${c.nombre_local}</td>
            <td>${c.direccion}</td>
            <td>${c.telefono}</td>
            <td>${c.correo}</td>
            <td><b>$${c.saldo_pendiente}</b></td>
            <td>${c.cuenta_corriente === 1 ? '✅ Activa' : '❌ Inactiva'}</td>
            <td>
                <form action="/admin/toggle-cc/${c.id}" method="POST" style="display:inline; margin-right: 3px;">
                    <button type="submit" style="padding: 5px 8px; font-size: 11px; background: ${c.cuenta_corriente === 1 ? '#dc2626' : '#facc15'}; color: #0f172a;">
                        ${c.cuenta_corriente === 1 ? 'Quitar C.C.' : 'Dar C.C.'}
                    </button>
                </form>
                <form action="/admin/reset-password/${c.id}" method="POST" style="display:inline;" onsubmit="return confirm('¿Blanquear pass a 123456?');">
                    <button type="submit" style="padding: 5px 8px; font-size: 11px; background: #475569; color: #fff;">Pass</button>
                </form>
            </td>
        </tr>
    `).join('');

    let productosHTML = db.productos.map(p => `
        <tr class="producto-row">
            <td>${p.imagen ? `<img src="/uploads/${p.imagen}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : 'Sin img'}</td>
            <td><b>${p.codigo}</b></td>
            <td>${p.nombre}</td>
            <td>${p.categoria}</td>
            <td><b>$${p.precio}</b></td>
            <td style="color: ${p.stock <= 3 ? '#f87171' : 'inherit'};"><b>${p.stock}</b> ${p.stock <= 3 ? '⚠️' : ''}</td>
            <td>
                <form action="/admin/eliminar-producto/${p.id}" method="POST" onsubmit="return confirm('¿Eliminar producto?');">
                    <button type="submit" style="background: #dc2626; color: #fff; padding: 5px 8px; font-size: 11px;">Eliminar</button>
                </form>
            </td>
        </tr>
    `).join('');

    const direccionesJSON = JSON.stringify(db.usuarios.filter(u => u.rol === 'cliente').map(c => ({ local: c.nombre_local, dir: c.direccion, cliente: c.numero_cliente })));

    const contenido = `
        <h2 style="color: #f8fafc;">📊 Panel de Control y Administración (Dueño)</h2>
        <div class="user-bar" style="position: sticky; top: 10px; z-index: 1000; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
            <div><b>Acciones Rápidas:</b> Dueño Conectado</div>
            <div style="display: flex; gap: 10px;">
                <a href="#pedidos-section" class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration: none;">📋 Pedidos</a>
                <a href="#config-section" class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration: none; background: #facc15; color: #0f172a;">⚙️ Configuración</a>
                <a href="#metricas-section" class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration: none; background: #38bdf8; color: #0f172a;">📈 Métricas</a>
                <a href="#stock-section" class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration: none; background: #0ea5e9; color: #fff;">📦 Stock</a>
                <a href="/" class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration: none; background: #16a34a; color: #fff;">Tienda</a>
                <a href="/logout" class="btn" style="background: #475569; color: #fff; padding: 6px 12px; font-size: 12px; text-decoration: none;">Salir</a>
            </div>
        </div>

        <hr id="config-section">
        <h3 style="color: #f8fafc;">⚙️ Configuración General (Teléfono y Logo)</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <form action="/admin/actualizar-telefono" method="POST" style="background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
                <h4 style="margin-top: 0; color: #facc15;">📞 Cambiar Teléfono de Contacto</h4>
                <label>Número de WhatsApp / Contacto:</label>
                <input type="text" name="telefono" value="${db.config.telefono || ''}" required style="margin: 10px 0;">
                <button type="submit" class="btn" style="width: 100%;">Guardar Teléfono</button>
            </form>

            <form action="/admin/actualizar-logo" method="POST" enctype="multipart/form-data" style="background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
                <h4 style="margin-top: 0; color: #facc15;">🖼 Cambiar Logo (PNG)</h4>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom: 10px;">
                    <img src="/uploads/logo-ks.png" style="width: 35px; height: 35px; object-fit: contain; background: #000; border-radius: 50%; border: 1px solid #facc15;" onerror="this.style.display='none'">
                    <span style="font-size: 12px;">Logo Actual</span>
                </div>
                <input type="file" name="logoFile" accept="image/*" required style="font-size: 11px; margin-bottom: 10px; display:block;">
                <button type="submit" class="btn" style="width: 100%;">Actualizar Logo</button>
            </form>
        </div>

        <hr id="metricas-section">
        <h3 style="color: #f8fafc;">📈 Métricas de Ventas y Cierre Diario de Caja</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <div style="background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
                <h4 style="margin: 0 0 10px 0; color: #facc15;">🔥 Producto Más Vendido (Semana)</h4>
                <p style="font-size: 16px; margin: 0; font-weight: bold; color: #f8fafc;">${productoTop}</p>
            </div>
            <div style="background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
                <h4 style="margin: 0 0 10px 0; color: #38bdf8;">💵 Cierre Diario (Recaudación Hoy)</h4>
                <p style="font-size: 20px; margin: 0 0 5px 0; font-weight: bold; color: #f8fafc;">$${totalRecaudadoHoy}</p>
                <p style="font-size: 13px; margin: 0; color: #94a3b8;">Ganancia neta estimada: <b>$${gananciaHoy}</b></p>
                <br><a href="/admin/descargar-cierre" class="btn" style="padding: 6px 12px; font-size: 11px; text-decoration: none; background: #16a34a; color: #fff;">📥 Descargar Cierre en Excel</a>
            </div>
        </div>

        <hr>
        <h3 style="color: #f8fafc;">🖼 Gestión de Imágenes de Categorías (Tienda)</h3>
        <table style="margin-bottom: 25px;">
            <tr><th>Categoría</th><th>Descripción</th><th>Foto Actual</th><th>Cambiar Imagen</th></tr>
            ${categoriasAdminHTML}
        </table>

        <hr>
        <h3 style="color: #f8fafc;">📍 Ubicación de Nuestro Local (Marcos Paz)</h3>
        <div style="width: 100%; height: 280px; border-radius: 8px; border: 1px solid #334155; overflow: hidden; margin-bottom: 25px;">
            <iframe 
                width="100%" 
                height="100%" 
                style="border:0;" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3281.35!2d-58.8383675!3d-34.7830009!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDQ2JzU4LjgiUyA1OMKwNTAnMTguMSJX!5e0!3m2!1ses!2sar!4v1!1m2!1ses!2sar">
            </iframe>
        </div>

        <hr>
        <h3 style="color: #f8fafc;">⚙ Gestión del Carrusel Fino (Promociones)</h3>
        <form action="/admin/agregar-slide" method="POST" enctype="multipart/form-data" style="background: #1e293b; padding: 20px; border-radius: 8px; display: flex; gap: 15px; align-items: center; flex-wrap: wrap; border: 1px solid #334155; margin-bottom: 15px;">
            <label>Activo: <input type="checkbox" name="activo" ${db.carrusel.activo ? 'checked' : ''}></label>
            <label>Título: <input type="text" name="titulo" placeholder="Ej: NUEVO INGRESO" required style="width: 220px;"></label>
            <label>Imagen Fina/Larga: <input type="file" name="imagenSlide" accept="image/*" required></label>
            <button type="submit" class="btn">Agregar Banner</button>
        </form>
        <table>
            <tr><th>Miniatura</th><th>Título</th><th>Acción</th></tr>
            ${carruselAdminHTML || '<tr><td colspan="3">No hay banners en el carrusel.</td></tr>'}
        </table>

        <hr id="pedidos-section">
        <h3 style="color: #f8fafc;">📋 Gestión de Pedidos y Notificaciones (Campanita 🔔)</h3>
        <table>
            <tr><th>N°</th><th>Cliente</th><th>Detalle</th><th>Total</th><th>Estado Pago</th><th>Estado Retiro</th><th>Acciones Operativas</th></tr>
            ${pedidosHTML || '<tr><td colspan="7">No hay pedidos pendientes.</td></tr>'}
        </table>

        <hr id="stock-section">
        <h3 style="color: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
            📦 Control de Stock e Inventario 
            <input type="text" placeholder="🔍 Buscar repuesto..." onkeyup="filtrarTablaAdmin(this.value, '.producto-row')" style="width: 220px; font-size: 13px; padding: 6px;">
        </h3>
        <div style="margin-bottom: 20px; display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
            <form action="/admin/importar-excel" method="POST" enctype="multipart/form-data" style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
                <label><b>Importar Excel:</b></label>
                <input type="file" name="archivoExcel" accept=".xlsx, .xls" required style="margin-top: 5px;">
                <button type="submit" class="btn" style="margin-top: 5px;">Subir Excel</button>
            </form>
            <a href="/admin/exportar-excel" class="btn" style="padding: 12px 20px; text-decoration: none;">📥 Exportar Stock</a>
        </div>

        <form action="/admin/agregar-producto" method="POST" enctype="multipart/form-data" style="background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 25px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border: 1px solid #334155;">
            <h4 style="width: 100%; margin-top: 0; color: #f8fafc;">Agregar Producto Individual:</h4>
            <input type="text" name="codigo" placeholder="Código" required style="width: 100px;">
            <input type="text" name="nombre" placeholder="Nombre repuesto" required style="width: 180px;">
            <select name="categoria" required style="width: 140px;">
                <option value="Repuestos">Repuestos</option>
                <option value="Accesorios">Accesorios</option>
                <option value="Baterías">Baterías</option>
                <option value="Herramientas">Herramientas</option>
                <option value="Varios">Varios</option>
            </select>
            <input type="number" name="precio" placeholder="Precio Venta" required style="width: 90px;">
            <input type="number" name="costo" placeholder="Costo" required style="width: 90px;">
            <input type="number" name="stock" placeholder="Stock" required style="width: 70px;">
            <label>Foto: <input type="file" name="imagenProducto" accept="image/*"></label>
            <button type="submit" class="btn">Añadir</button>
        </form>

        <table>
            <tr><th>Img</th><th>Código</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acción</th></tr>
            ${productosHTML}
        </table>

        <hr>
        <h3 style="color: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
            👥 Control y Listado de Clientes
            <input type="text" placeholder="🔍 Buscar cliente..." onkeyup="filtrarTablaAdmin(this.value, '.cliente-row')" style="width: 220px; font-size: 13px; padding: 6px;">
        </h3>
        <table>
            <tr><th>N° Cliente</th><th>Nombre y Apellido</th><th>Local</th><th>Dirección</th><th>Teléfono</th><th>Correo</th><th>Saldo C.C.</th><th>Estado C.C.</th><th>Acciones</th></tr>
            ${clientesHTML}
        </table>

        <script>
            function filtrarTablaAdmin(val, selector) {
                const rows = document.querySelectorAll(selector);
                rows.forEach(r => {
                    r.style.display = r.innerText.toLowerCase().includes(val.toLowerCase()) ? '' : 'none';
                });
            }
        </script>
    `;

    res.send(renderHTML('Panel de Dueño', contenido, req.session.usuario, req));
});

// Ruta para actualizar teléfono
app.post('/admin/actualizar-telefono', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const { telefono } = req.body;
    const db = leerDB();
    if (telefono) {
        db.config.telefono = telefono;
        escribirDB(db);
    }
    res.redirect('/admin');
});

// Ruta para actualizar el Logo principal de la tienda
app.post('/admin/actualizar-logo', upload.single('logoFile'), (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    if (req.file) {
        const destinoLogo = path.join(__dirname, 'uploads', 'logo-ks.png');
        fs.renameSync(req.file.path, destinoLogo);
    }
    res.redirect('/admin');
});

// Ruta para actualizar foto de categoría
app.post('/admin/actualizar-categoria', upload.single('imagenCat'), (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const { categoria } = req.body;
    const db = leerDB();
    if (req.file && db.categoriasConfig[categoria]) {
        const ext = path.extname(req.file.originalname);
        const nombreImagen = `cat_${Date.now()}${ext}`;
        fs.renameSync(req.file.path, path.join(__dirname, 'uploads', nombreImagen));
        db.categoriasConfig[categoria].imagen = nombreImagen;
        escribirDB(db);
    }
    res.redirect('/admin');
});

// Ruta para descargar el Cierre Diario en Excel
app.get('/admin/descargar-cierre', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const db = leerDB();
    const hoyIso = new Date().toISOString().split('T')[0];
    const ventasHoy = db.pedidos.filter(p => p.estadoRetiro === 'APROBADO Y RETIRADO' && p.fechaIso === hoyIso);

    const reporte = ventasHoy.map(p => ({
        Pedido: `#${p.id}`,
        Cliente: p.nombreCliente,
        Local: p.localCliente,
        Detalle: p.detalleResumen,
        MetodoPago: p.metodoPago,
        Recaudado: p.total,
        GananciaNeta: p.ganancia || 0,
        Fecha: p.fecha
    }));

    const ws = xlsx.utils.json_to_sheet(reporte);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Cierre Diario");
    const exportPath = path.join(__dirname, 'cierre_diario.xlsx');
    xlsx.writeFile(wb, exportPath);
    res.download(exportPath, `cierre_diario_${hoyIso}.xlsx`);
});

app.post('/admin/estado-pedido/:id', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const { estado } = req.body;
    const db = leerDB();
    const pedido = db.pedidos.find(p => p.id == req.params.id);
    if (pedido) {
        pedido.estadoRetiro = estado;
        if (estado === 'APROBADO Y RETIRADO') {
            pedido.estadoPago = 'PAGO CONFIRMADO';
            if (pedido.items) {
                pedido.items.forEach(item => {
                    const prod = db.productos.find(p => p.id == item.productoId);
                    if (prod && prod.stock >= item.cantidad) prod.stock -= item.cantidad;
                });
            }
            if (pedido.metodoPago === 'Cuenta Corriente') {
                const cliente = db.usuarios.find(u => u.id == pedido.clienteId);
                if (cliente) cliente.saldo_pendiente += pedido.total;
            }
        }
        escribirDB(db);
    }
    res.redirect('/admin');
});

app.post('/admin/agregar-slide', upload.single('imagenSlide'), (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const { activo, titulo } = req.body;
    const db = leerDB();
    if (req.file) {
        const ext = path.extname(req.file.originalname);
        const nombreImagen = `slide_${Date.now()}${ext}`;
        fs.renameSync(req.file.path, path.join(__dirname, 'uploads', nombreImagen));
        db.carrusel.imagenes.push({
            id: db.carrusel.imagenes.length > 0 ? Math.max(...db.carrusel.imagenes.map(s => s.id)) + 1 : 1,
            titulo: titulo || 'Promoción KS Módulos',
            archivo: nombreImagen
        });
    }
    db.carrusel.activo = activo === 'on';
    escribirDB(db);
    res.redirect('/admin');
});

app.post('/admin/eliminar-slide/:id', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const db = leerDB();
    db.carrusel.imagenes = db.carrusel.imagenes.filter(s => s.id != req.params.id);
    escribirDB(db);
    res.redirect('/admin');
});

app.post('/admin/agregar-producto', upload.single('imagenProducto'), (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const { codigo, nombre, categoria, precio, costo, stock } = req.body;
    const db = leerDB();
    let nombreImagen = "";
    if (req.file) {
        const ext = path.extname(req.file.originalname);
        nombreImagen = `prod_${Date.now()}${ext}`;
        fs.renameSync(req.file.path, path.join(__dirname, 'uploads', nombreImagen));
    }
    db.productos.push({
        id: db.productos.length > 0 ? Math.max(...db.productos.map(p => p.id)) + 1 : 1,
        codigo, nombre, categoria: categoria || 'Repuestos',
        precio: parseFloat(precio), costo: parseFloat(costo || 0), stock: parseInt(stock), imagen: nombreImagen
    });
    escribirDB(db);
    res.redirect('/admin');
});

app.post('/admin/eliminar-producto/:id', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const db = leerDB();
    db.productos = db.productos.filter(p => p.id != req.params.id);
    escribirDB(db);
    res.redirect('/admin');
});

app.post('/admin/importar-excel', upload.single('archivoExcel'), (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    try {
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const db = leerDB();
        data.forEach((row, i) => {
            const pVenta = parseFloat(row.precio || row.Precio || 0);
            db.productos.push({
                id: db.productos.length > 0 ? Math.max(...db.productos.map(p => p.id)) + 1 : 1,
                codigo: String(row.codigo || `REP-${i+1}`),
                nombre: String(row.nombre || 'Sin Nombre'),
                categoria: String(row.categoria || 'Repuestos'),
                precio: pVenta,
                costo: parseFloat(row.costo || Math.round(pVenta * 0.7)),
                stock: parseInt(row.stock || 0),
                imagen: ""
            });
        });
        escribirDB(db);
        fs.unlinkSync(req.file.path);
        res.send(`<script>alert('¡Excel importado!'); window.location.href='/admin';</script>`);
    } catch(e) {
        res.send(`<script>alert('Error al procesar Excel'); window.location.href='/admin';</script>`);
    }
});

app.get('/admin/exportar-excel', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const db = leerDB();
    const ws = xlsx.utils.json_to_sheet(db.productos);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Stock");
    const exportPath = path.join(__dirname, 'stock_ks.xlsx');
    xlsx.writeFile(wb, exportPath);
    res.download(exportPath, 'stock_ks_modulos.xlsx');
});

app.post('/admin/toggle-cc/:id', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/login');
    const db = leerDB();
    const cliente = db.usuarios.find(u => u.id == req.params.id);
    if (cliente) {
        cliente.cuenta_corriente = cliente.cuenta_corriente === 1 ? 0 : 1;
        escribirDB(db);
    }
    res.redirect('/admin');
});

app.post('/admin/reset-password/:id', (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== 'dueño') return res.redirect('/admin');
    const db = leerDB();
    const cliente = db.usuarios.find(u => u.id == req.params.id);
    if (cliente) {
        cliente.password = "123456";
        escribirDB(db);
        res.send(`<script>alert('Contraseña blanqueada a: 123456'); window.location.href='/admin';</script>`);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`¡Servidor KS Módulos corriendo en http://localhost:${PORT}!`);
});