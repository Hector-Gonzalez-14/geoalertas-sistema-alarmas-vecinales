# 📲 Cómo sacar el APK de GeoAlerta (paso a paso)

La app ya es instalable (manifiesto + iconos + pantalla completa + no se apaga en alarma).
El APK es solo el envoltorio para repartirla por WhatsApp sin pasar por Play Store.

## Lo que ya tenés en `src/` (visible en Archivos)
- `manifest.webmanifest` → identidad de la app (nombre, colores, iconos).
- `icon-192.png` / `icon-512.png` → iconos del instalador.
- `logo.svg`, `logo-text.svg`, `logo-icon.svg`, `logo.png` → marca.

## Paso 1 — Guardar el generador
Guardá (Save) para que tenga dirección pública, ej: `https://perchance.org/tu-nombre`.
Sin esto no hay APK posible.

## Paso 2 — Apuntar el manifiesto a tu dirección
Abrí `src/manifest.webmanifest` y reemplazá las 2 veces que dice
`TU-NOMBRE-DE-GENERADOR` por tu nombre real. Guardá.

## Paso 3 — Empaquetar (gratis, 5 min, sin programar)
1. Entrá a **https://www.pwabuilder.com**.
2. Pegá tu dirección pública y Start.
3. Package for Android → Download APK/AAB.

## Paso 4 — Repartir
Pasá el APK por WhatsApp. En cada celular: abrir el archivo → Instalar →
permitir "instalar apps desconocidas" si lo pide. Listo: icono junto a las apps.

## Alternativa sin APK (vale igual)
Chrome → 3 puntitos → *Agregar a pantalla principal*. Mismo resultado,
sin descargar nada.
