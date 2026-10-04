# Kit de marca y manual del instalador · GEOALERTA SISTEMAS CATAMARCA

Base de la presentación para el personal que instala los anclajes (puntos de alarma).
Parte A = marca (bloques exactos, copiar y pegar tal cual). Parte B = todo lo necesario para que la app funcione en cada punto instalado.

---

## PARTE A — Marca

Manual rápido para que el logo, el header, la pestaña y el footer queden **idénticos** en todas las presentaciones. Copiar y pegar los bloques tal cual.

> Regla de oro: el texto del logo y el arco exterior usan `currentColor` (heredan el color del fondo y se adaptan solos). El arco medio `#38c6ff` y el punto `#ff4757` quedan fijos porque son los colores de marca. Por eso antes las 3 presentaciones se veían distintas: el texto tenía color fijo `#0f172a`, invisible sobre fondo oscuro.

### 1. Paleta oficial

| Uso | Color |
|---|---|
| Fondo | `#081120` · `#0d1b33` |
| Tarjeta | `#13233f` · línea `#24395e` |
| Rojo marca | `#e82836` · `#ff4757` |
| Cian marca | `#38c6ff` |
| Verde / Naranja | `#2ed573` · `#ffa502` |
| Texto / silenciado | `#eef4ff` · `#9fb0cc` |

### 2. Fuente (arriba del todo del `index.html`)

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet">
```

### 3. Ícono solo

```html
<svg viewBox="0 0 120 120" width="40" height="40" aria-label="GeoAlerta icono"><g transform="translate(60,60) rotate(35) translate(-45,-45)"><path d="M 15 75 A 60 60 0 0 1 75 15" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/><path d="M 40 75 A 35 35 0 0 1 75 40" fill="none" stroke="#38c6ff" stroke-width="14" stroke-linecap="round"/><path d="M 65 75 A 10 10 0 0 1 75 65" fill="none" stroke="#ff4757" stroke-width="12" stroke-linecap="round"/></g></svg>
```

### 4. Header completo (igual que la imagen de referencia)

```html
<svg viewBox="0 0 120 120" width="40" height="40" aria-label="GeoAlerta icono"><g transform="translate(60,60) rotate(35) translate(-45,-45)"><path d="M 15 75 A 60 60 0 0 1 75 15" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/><path d="M 40 75 A 35 35 0 0 1 75 40" fill="none" stroke="#38c6ff" stroke-width="14" stroke-linecap="round"/><path d="M 65 75 A 10 10 0 0 1 75 65" fill="none" stroke="#ff4757" stroke-width="12" stroke-linecap="round"/></g></svg>
<div class="brand"><b>GeoAlerta <span class="l">Sistemas</span></b><span>CATAMARCA · PUNTO DE ALARMA VECINAL</span></div>
```

CSS del header:

```css
.brand b{font-family:Montserrat,Inter,system-ui,sans-serif;display:block;font-size:17px;letter-spacing:-.5px;color:#eef4ff}
.brand b .l{font-weight:600}
.brand span{font-size:11px;color:#9fb0cc;letter-spacing:1.5px}
```

### 5. Nombre de la pestaña (en `main.pjs`)

```pjs
$meta
  title = GEOALERTA SISTEMAS CATAMARCA | Punto de Alarma Vecinal
```

### 6. Ícono de la pestaña / favicon (al final del `index.html`)

```html
<script>try{var l=document.createElement("link");l.rel="icon";l.href="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="#0d1b33"/><g transform="translate(60,60) rotate(35) translate(-45,-45)"><path d="M 15 75 A 60 60 0 0 1 75 15" fill="none" stroke="#eef4ff" stroke-width="14" stroke-linecap="round"/><path d="M 40 75 A 35 35 0 0 1 75 40" fill="none" stroke="#38c6ff" stroke-width="14" stroke-linecap="round"/><path d="M 65 75 A 10 10 0 0 1 75 65" fill="none" stroke="#ff4757" stroke-width="12" stroke-linecap="round"/></g></svg>');document.head.appendChild(l);}catch(e){}</script>
```

### 7. Footer (sin redundancia)

```html
<footer><svg viewBox="0 0 120 120" width="30" height="30" style="vertical-align:middle" aria-label="GeoAlerta icono"><g transform="translate(60,60) rotate(35) translate(-45,-45)"><path d="M 15 75 A 60 60 0 0 1 75 15" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/><path d="M 40 75 A 35 35 0 0 1 75 40" fill="none" stroke="#38c6ff" stroke-width="14" stroke-linecap="round"/><path d="M 65 75 A 10 10 0 0 1 75 65" fill="none" stroke="#ff4757" stroke-width="12" stroke-linecap="round"/></g></svg> <b style="font-family:Montserrat,sans-serif">GeoAlerta Sistemas</b> · Alarma Vecinal · Catamarca</footer>
```

### 8. Aviso importante (Perchance)

El `index.html` es solo el contenido del `<body>`: los `[corchetes]` y `{llaves}` en el texto visible se interpretan como código Perchance y rompen la página. El código C++ del ESP32 y el diagrama de conexiones van inyectados por `<script>` con `textContent`, nunca pegados directo como texto.

---

## PARTE B — Manual del instalador del anclaje

### 9. Qué es el sistema (decilo en 30 segundos)

El vecino toca **SOS** en el celular → la alarma llega al **Centro** con nombre, dirección y GPS → suena la **sirena del punto** que vos instalaste → el Centro puede llamar y mandar ayuda. Tu trabajo: que cada punto suene cuando se le ordena y avise que sigue vivo.

### 10. Tu trabajo en cada punto (resumen)

1. Montar la caja, sirena, LED, fuente + batería (detalle en `src/guia-anclaje.md` §2.1–2.3).
2. Subir el firmware al ESP32 con los 5 datos del punto (§12).
3. Registrar el punto en la app (**Carga → Puntos de alarma**) con el **mismo ID** del firmware.
4. Probar: sirena por orden del Centro + latido 🟢 en **Centro → 🏥 Salud de puntos**.
5. Pegar la calco, anotar IP/ID y entregar (checklist §13).

### 11. Roles que vas a cruzar

| Rol | Hace | Tu contacto |
|---|---|---|
| Carga | Registra vecinos y puntos en la app | Te da/pide el `id_poste` y la URL del punto |
| Centro | Mira el mapa, activa sirenas, gestiona hechos | Le avisás cuando el punto queda listo; él te pide pruebas |
| Admin | Configura backend, usuarios, repara | Le reportás fallas que no pudiste resolver |
| Vecino | Toca SOS | No lo atiendes vos; solo verificás que su punto suene |

Vos reportás al **Centro** (botón 📝 Reportar en la tarjeta de salud) y el Centro escala al **admin**.

### 12. Los 5 datos del firmware (sin esto NO funciona)

En el programa v2 (`src/guia-anclaje.md` §8.1):

| Dato | Ejemplo | Dónde sale |
|---|---|---|
| `WIFI_SSID` / `WIFI_PASS` | WiFi del barrio | Te lo da el referente/vecino |
| `BACKEND_URL` | `https://script.google.com/macros/s/.../exec` | Te lo da el admin (nunca cambia si no se crea despliegue nuevo) |
| `API_KEY` | clave larga | Te la da el admin (Apps Script → Propiedades) |
| `ID_PUNTO` | `punto-mz12` | **Idéntico** al `id_poste` creado en Carga |

Errores típicos al subir: `sin_punto` = el ID no existe en la app (crealo en Carga); `bad_key` = API_KEY mal copiada.

### 13. Checklist de entrega por punto

- [ ] IP fija anotada, responde `/estado` con `uptime_min` y `rssi`.
- [ ] `/sirena?on=1&modo=policia` suena + parpadea 60 seg y se apaga sola; `on=0` apaga al instante.
- [ ] Centro → 🏥 muestra 🟢 En línea antes de 2 min.
- [ ] Corte de WiFi 6+ min → Centro marca 🔴 y avisa (reconectás y vuelve 🟢).
- [ ] Batería: sin 220V por 1 min, suena igual.
- [ ] Calco "🔊 PUNTO DE ALARMA VECINAL" pegada, caja sellada, sirena hacia abajo.
- [ ] Vecinos de la cuadra relacionados a este punto (Carga).

### 14. Salud, motivos y triaje (resumen operativo)

Estados en Centro → 🏥: 🟢 En línea · 🔴 Caído (hace X min) · ⚪ Sin datos · 🔧 En revisión · ⚫ Fuera de servicio. Cada tarjeta muestra 📶 señal, ⏱ encendido y motivo de arranque.

| LED onboard | Estado app | Hacer |
|---|---|---|
| 1 blink/60 seg | 🟢 | Nada |
| 3 blinks/60 seg | ⚪/🔴 | Revisar URL/clave/ID e internet |
| Rápido continuo | 🔴 | Router/clave WiFi |
| `arranque_corte` | aviso en historial | Revisar 220V/batería |
| `arranque_watchdog` repetido | aviso en historial | Cambiar fuente, revisar humedad |

Tabla completa + códigos + costos de datos GSM en `src/guia-anclaje.md` §8.

### 15. Qué NO tocar

- La URL /exec y la API_KEY viven **en cada equipo**, nunca en el código.
- No crear despliegues nuevos del backend (mata la URL de todos); los cambios van con Versión nueva del mismo despliegue (lo hace el admin).
- No prometer push con pantalla apagada: hoy el aviso es con la app abierta (sonido + título + pantalla roja).
- Costos de referencia: materiales $135.000–$165.000 por punto; datos GSM ~$3.000–$9.000/mes según intervalo (WiFi = $0).

*Documento base de presentación al personal instalador — GeoAlerta Sistemas · Alarma Vecinal · Catamarca.*
