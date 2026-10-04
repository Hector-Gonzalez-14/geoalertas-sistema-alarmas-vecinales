# 🔊 Guía de armado del Punto de Alarma (anclaje en el poste)

Cómo armar el punto físico que hace sonar la sirena cuando un vecino activa el SOS.
Para San Fernando del Valle de Catamarca. Costos aprox. Argentina 2026 (dólar ref. $1.500).

---

## 1. Cómo se relaciona con la app

1. El vecino elige el tipo una vez (chips en la app, queda guardado), toca **SOS** y al terminar la 3-2-1 la alarma se envía sola y se abre el marcador en 911.
2. El **Centro** ve la alarma en el mapa y toca **🔊 Activar sirena**.
3. La app manda la orden al punto por WiFi a:
   - Encender: `http://IP-DEL-PUNTO/sirena?on=1&modo=disuadir` (o `medica` / `policia`)
   - Apagar: `http://IP-DEL-PUNTO/sirena?on=0`
4. La sirena suena y el reflector parpadea **60 segundos** y se apaga solo (por seguridad).
5. Esa IP se carga en la app en la pestaña **🔊 Punto de alarma → URL ESP32**.
6. El punto avisa cada 60 segundos que sigue vivo (**latido**) → el Centro/Admin ven 🟢 En línea / 🔴 Caído con el motivo. Ver sección 8 (hay que actualizar el programa y el backend).

Sin WiFi en el barrio: ver Opción B (SMS) y Opción C (enchufe WiFi + Alexa) más abajo.

---

## 2. Opción A (recomendada): ESP32 con WiFi del barrio

### 2.1 Materiales

| Cant | Material | Precio aprox. |
|---|---|---|
| 1 | ESP32 DevKit V1 (30 pines) | $12.000 |
| 1 | Relé 2 canales 10A (optoacoplado) | $7.500 |
| 1 | Sirena exterior 12V 30W | $37.500 |
| 1–2 | Reflector LED 12V (o 220V con relé) | $22.500 |
| 1 | Fuente 12V 5A | $22.500 |
| 1 | Batería 12V 7Ah (respaldo, recomendada) | $45.000 |
| 1 | Caja estanca IP65 mediana | $18.000 |
| – | Cable taller 2×1,5mm, cable UTP, terminales, precintos, tornillería, térmica 2×10A + disyuntor | $30.000 |
| 1 | Chip con datos / WiFi del barrio (módem o punto de acceso cercano) | según plan |

**Total por punto: $135.000 – $165.000** (con batería, +$45.000).

Herramientas: taladro, escalera, tester/multímetro, soldador + estaño, destornilladores, pinza, cinta aisladora y termocontraíble.

### 2.2 Conexiones (tablero dentro de la caja IP65)

```
220V alumbrado → térmica → fuente 12V 5A → [sirena 12V] y [LED 12V]
                                        ↘ (a través de los relés)
Batería 12V 7Ah en paralelo a la salida de la fuente (respaldo ante cortes)

ESP32 (alimentado por USB o regulador 5V desde los 12V):
  GPIO25 (D25) → IN1 del relé → corta el (+) de la SIRENA
  GPIO26 (D26) → IN2 del relé → corta el (+) del LED
  GND ESP32 → GND del módulo relé
  Jumper del relé en JD-VCC si se alimenta separado (recomendado)
```

⚠️ Nunca pases 220V por el relé chico si no sabés: todo lo que conmuta el relé es **12V**.
La parte de 220V (térmica + fuente) va en una zona separada de la caja, con tapa.

### 2.3 Montaje en la columna

- Caja a **3–4 m de altura**, sirena con la bocina hacia **abajo** (no le entra agua).
- LED bien visible a 360° (esquina o doble reflector).
- Alimentación del **alumbrado público** (220V) + batería de respaldo.
- Precintá y sellá con silicona los pases de cable. Pegá una calco: "🔊 PUNTO DE ALARMA VECINAL".
- Anotá la **IP fija** del ESP32 y el nombre del punto (ej: "Punto Mz 12").

### 2.4 Programación del ESP32 (Arduino IDE)

1. Instalá el soporte ESP32 en Arduino IDE (Gestor de tarjetas: `esp32`).
2. Cambiá `WIFI_SSID` y `WIFI_PASS` por los del barrio.
3. Subí este programa. El ESP32 muestra su IP por el monitor serie (115200 baudios). (Si querés monitoreo de salud con latido, subí el programa v2 de la sección 8 en lugar de este.)

```cpp
#include <WiFi.h>
#include <WebServer.h>

const char* WIFI_SSID = "WIFI_DEL_BARRIO";
const char* WIFI_PASS = "CLAVE_WIFI";
const int PIN_SIRENA = 25;
const int PIN_LUZ    = 26;
const unsigned long TIEMPO_MS = 60000; // 60 segundos y se apaga solo

WebServer server(80);
unsigned long finAlarma = 0;
String modoActual = "";
bool luzOn = false;
unsigned long tLuz = 0;

void sirenaOff() {
  digitalWrite(PIN_SIRENA, LOW);
  digitalWrite(PIN_LUZ, LOW);
  finAlarma = 0;
  modoActual = "";
}

void handleSirena() {
  String on = server.hasArg("on") ? server.arg("on") : "1";
  if (on == "0") { sirenaOff(); server.send(200, "text/plain", "OK apagada"); return; }
  modoActual = server.hasArg("modo") ? server.arg("modo") : "disuadir";
  digitalWrite(PIN_SIRENA, HIGH);
  digitalWrite(PIN_LUZ, HIGH);
  luzOn = true; tLuz = millis();
  finAlarma = millis() + TIEMPO_MS;
  server.send(200, "text/plain", "OK encendida modo=" + modoActual);
}

void handleEstado() {
  bool activa = (finAlarma != 0 && millis() < finAlarma);
  server.send(200, "application/json",
    "{\"activa\":" + String(activa ? "true" : "false") +
    ",\"modo\":\"" + modoActual + "\"}");
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SIRENA, OUTPUT);
  pinMode(PIN_LUZ, OUTPUT);
  sirenaOff();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.print("\nIP del punto: ");
  Serial.println(WiFi.localIP());
  server.on("/sirena", handleSirena);
  server.on("/estado", handleEstado);
  server.on("/", []() {
    server.send(200, "text/plain", "Punto de alarma vecinal OK. Usa /sirena?on=1&modo=disuadir");
  });
  server.begin();
}

void loop() {
  server.handleClient();
  if (finAlarma != 0 && millis() > finAlarma) sirenaOff();
  // Luz intermitente distinta por modo
  if (finAlarma != 0) {
    unsigned long paso = (modoActual == "medica") ? 300 : (modoActual == "policia" ? 200 : 500);
    if (millis() - tLuz > paso) { tLuz = millis(); luzOn = !luzOn; digitalWrite(PIN_LUZ, luzOn); }
  }
}
```

Fijá la **IP estática** desde el router del barrio (recomendado) o pedila y anotala.
Probá desde el celular conectado al mismo WiFi abriendo: `http://IP/sirena?on=1&modo=disuadir`.

### 2.5 Configuración en la app

1. Entrá como **admin o carga** → pestaña **🔊 Punto de alarma**.
2. Creá el punto (nombre, dirección) y pegá en **URL ESP32**: `http://IP/sirena`.
3. Cargá sus coordenadas (GPS o tocando el mapa) → **💾 Guardar**.
4. En **Centro**, con una alarma de prueba (modo 🧪 Simulacro), tocá **🔊 Activar sirena** → tiene que sonar 60 seg.
5. Si el punto usa latido (sección 8): tiene que aparecer 🟢 En línea en **Centro → 🏥 Salud de puntos** antes de los 2 minutos.

---

## 3. Opción B: sin WiFi (SMS con SIM800L)

- Agregá: módulo **SIM800L** ($15.000) + chip con SMS + fuente 5V 2A solo para el módulo.
- El ESP32 atiende el SMS con la palabra `SIRENA` y enciende igual (60 seg).
- En la app, el Centro avisa por el grupo de WhatsApp y el punto suena al recibir el SMS.
- Ventaja: funciona sin internet en la cuadra. Desventaja: demora 5–20 seg y gasta SMS.

## 4. Opción C: sin programar (enchufe WiFi + Alexa)

- Enchufe inteligente **Tuya/Smart Life** ($15.000) + sirena 220V o 12V con fuente.
- Rutina en Alexa/Google Home: "cuando reciba aviso → encender enchufe 60 seg".
- El Centro acciona desde la app de la casa inteligente. Ideal para probar el primer punto.

---

## 5. Puesta en marcha (checklist)

- [ ] La IP responde `/estado` desde el WiFi del barrio.
- [ ] `/sirena?on=1&modo=disuadir` suena + parpadea 60 seg y se apaga sola.
- [ ] `/sirena?on=0` apaga al instante.
- [ ] La app tiene la URL cargada y el Centro activó la sirena en un simulacro.
- [ ] Vecinos cargados y relacionados a su punto en la pestaña Carga.
- [ ] Batería conectada (desenchufá 220V 1 min y probá que suene).
- [ ] Cartel "PUNTO DE ALARMA VECINAL" visible.
- [ ] (Con latido) `/estado` muestra `uptime_min` y `rssi`, y el Centro lo ve 🟢 en menos de 2 min.
- [ ] (Con latido) Desenchufar el WiFi 6+ min → el Centro lo marca 🔴 Caído y avisa.

## 6. Fallas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| No responde la IP | Cambió la IP / se cayó el WiFi | IP fija en el router; reiniciar ESP32 |
| Suena pero no para | Programa viejo sin timeout | Subir este programa (60 seg auto) |
| Se reinicia al sonar | Fuente chica | Fuente 12V 5A real + cables gruesos |
| La app dice "Sin conexión" | Celular sin internet / URL mal | Revisar URL en Centro → Conexión |
| Suena con lluvia | Agua en la sirena | Bocina hacia abajo + silicona |
| Centro muestra ⚪ Sin datos | Punto sin programa de latido, o sin registrar | Subir programa sección 8 y crear el punto en Carga con el mismo ID |
| Centro muestra 🔴 Caído | Sin luz / sin WiFi / ESP32 colgado | Ver tabla de triaje (sección 8.5): luz del barrio, router, reiniciar punto |
| Latido responde `sin_punto` | El ID del firmware no existe en BD Postes | Crear el punto en Carga con ese mismo `id_poste` |
| Latido responde `bad_key` | API_KEY mal copiada en el firmware | Re-copiar desde proyecto Apps Script → Propiedades |

## 7. Mantenimiento

Revisar cada 3 meses: batería, precintos, silicona, probar un simulacro con el Centro.
Costo de reposición anual estimado: batería + LED ≈ $60.000 por punto.

---

## 8. Salud del punto: latido cada 60 segundos

El punto le avisa al backend "sigo vivo" cada 60 seg. Si el Centro/Admin no recibe aviso tras el umbral (default 5 min, configurable en Centro → Conexión), el punto se marca 🔴 **Caído** y suena alerta. Así el **Centro** informa y el **admin** verifica y repara.

**Requisito previo (hacer una sola vez):**
1. Actualizá `src/backend.gs` con la acción `latido` (ya incluida) → pegalo en Apps Script en el **mismo despliegue** → Versión nueva.
2. Creá el punto en la app (**Carga → Puntos de alarma**) y anotá su `id_poste` (ej: `punto-mz12`).
3. Sacá la **API_KEY** (Apps Script → Engrane → Propiedades) y la **URL /exec**.
4. Subí el programa de abajo (reemplaza al de 2.4) con esos 3 datos.

### 8.1 Programa ESP32 v2 con latido (reemplaza al de 2.4)

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <esp_system.h>

// ===== CONFIG DEL PUNTO (cambiar estos 5) =====
const char* WIFI_SSID   = "WIFI_DEL_BARRIO";
const char* WIFI_PASS   = "CLAVE_WIFI";
const char* BACKEND_URL = "https://script.google.com/macros/s/TU_ID/exec"; // URL /exec
const char* API_KEY     = "TU_API_KEY";   // Engrane proyecto > Propiedades
const char* ID_PUNTO    = "punto-mz12";   // = id_poste cargado en Carga
const char* FW          = "2.0-latido";
// ==============================================
const int PIN_SIRENA = 25;
const int PIN_LUZ    = 26;
const int PIN_LED    = 2;   // LED onboard: códigos de diagnóstico
const unsigned long TIEMPO_MS = 60000;
const unsigned long LATIDO_MS = 60000;

WebServer server(80);
unsigned long finAlarma = 0, tLuz = 0, tLatido = 0, tSinRed = 0;
String modoActual = "";
bool luzOn = false, motivoEnviado = false;
String motivoArranque = "";

String leerMotivo() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON:
    case ESP_RST_BROWNOUT: return "arranque_corte";
    case ESP_RST_EXT0:
    case ESP_RST_EXT1:     return "arranque_manual";
    case ESP_RST_SW:        return "arranque_software";
    case ESP_RST_TASK_WDT:
    case ESP_RST_INT_WDT:
    case ESP_RST_WDT:      return "arranque_watchdog";
    default:               return "arranque_otro";
  }
}

void blink(int n) {
  for (int i = 0; i < n; i++) {
    digitalWrite(PIN_LED, HIGH); delay(150);
    digitalWrite(PIN_LED, LOW);  delay(150);
  }
  delay(600);
}

void sirenaOff() {
  digitalWrite(PIN_SIRENA, LOW);
  digitalWrite(PIN_LUZ, LOW);
  finAlarma = 0; modoActual = "";
}

void handleSirena() {
  String on = server.hasArg("on") ? server.arg("on") : "1";
  if (on == "0") { sirenaOff(); server.send(200, "text/plain", "OK apagada"); return; }
  modoActual = server.hasArg("modo") ? server.arg("modo") : "disuadir";
  digitalWrite(PIN_SIRENA, HIGH);
  digitalWrite(PIN_LUZ, HIGH);
  luzOn = true; tLuz = millis();
  finAlarma = millis() + TIEMPO_MS;
  server.send(200, "text/plain", "OK encendida modo=" + modoActual);
}

void handleEstado() {
  bool activa = (finAlarma != 0 && millis() < finAlarma);
  String j = "{\"activa\":" + String(activa ? "true" : "false");
  j += ",\"modo\":\"" + modoActual + "\"";
  j += ",\"uptime_min\":" + String(millis() / 60000);
  j += ",\"rssi\":" + String(WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0);
  j += ",\"fw\":\"" + String(FW) + "\"}";
  server.send(200, "application/json", j);
}

bool enviarLatido() {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure cli; cli.setInsecure();
  HTTPClient http;
  http.begin(cli, BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  String mot = motivoEnviado ? "" : motivoArranque;
  String body = "{\"apiKey\":\"" + String(API_KEY) + "\",\"action\":\"latido\"";
  body += ",\"id_poste\":\"" + String(ID_PUNTO) + "\"";
  body += ",\"rssi\":" + String(WiFi.RSSI());
  body += ",\"uptime_min\":" + String(millis() / 60000);
  body += ",\"fw\":\"" + String(FW) + "\"";
  body += ",\"motivo\":\"" + mot + "\"}";
  int code = http.POST(body);
  String resp = http.getString();
  http.end();
  Serial.println("Latido -> HTTP " + String(code) + " " + resp);
  if (code == 200 && resp.indexOf("\"ok\":true") >= 0) {
    motivoEnviado = true;
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SIRENA, OUTPUT);
  pinMode(PIN_LUZ, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  sirenaOff();
  motivoArranque = leerMotivo();
  Serial.println("Motivo arranque: " + motivoArranque);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    delay(500); Serial.print(".");
  }
  Serial.print("\nIP del punto: ");
  Serial.println(WiFi.localIP());
  server.on("/sirena", handleSirena);
  server.on("/estado", handleEstado);
  server.on("/", []() {
    server.send(200, "text/plain", "Punto de alarma vecinal OK fw=" + String(FW));
  });
  server.begin();
  if (enviarLatido()) blink(1);
}

void loop() {
  server.handleClient();
  if (finAlarma != 0 && millis() > finAlarma) sirenaOff();
  if (finAlarma != 0) {
    unsigned long paso = (modoActual == "medica") ? 300 : (modoActual == "policia" ? 200 : 500);
    if (millis() - tLuz > paso) { tLuz = millis(); luzOn = !luzOn; digitalWrite(PIN_LUZ, luzOn); }
  }
  if (WiFi.status() != WL_CONNECTED) {
    if (tSinRed == 0) tSinRed = millis();
    if (millis() - tSinRed > 300000) ESP.restart(); // 5 min sin WiFi: reiniciar
  } else tSinRed = 0;
  if (millis() - tLatido > LATIDO_MS) {
    tLatido = millis();
    if (enviarLatido()) blink(1);
    else blink(3);
  }
}
```

### 8.2 Códigos del LED onboard (diagnóstico sin abrir la caja)

| LED | Significa |
|---|---|
| 1 parpadeo cada 60 seg | Latido OK, todo bien |
| 3 parpadeos cada 60 seg | WiFi bien pero el backend falló (URL/clave/ID mal, o sin internet) |
| Parpadeo continuo rápido | Buscando WiFi (revisar router y clave) |
| Fijo + sirena sonando | Alarma activa (normal) |

### 8.3 Motivos de arranque (el punto los reporta solo)

| `mot` | Significa | Acción |
|---|---|---|
| `arranque_corte` | Se cortó la luz o brownout | Revisar 220V/batería; si se repite, cambiar fuente |
| `arranque_manual` | Alguien apretó reset / sensor externo | Normal si fue mantenimiento; si no, revisar sabotaje |
| `arranque_watchdog` | El programa se colgó y se reinició solo | Actualizar firmware; revisar temperatura/humedad |
| `arranque_software` / `otro` | Reinicio por software | Observar si se repite |

### 8.4 Qué ve el Centro y qué hace el admin

- **Centro → 🏥 Salud de puntos**: 🟢 En línea / 🔴 Caído (hace X min) / ⚪ Sin datos / 🔧 En revisión / ⚫ Fuera de servicio, con 📶 señal, ⏱ tiempo encendido y motivo.
- Si un punto cae: suena aviso + cartel rojo. El **Centro** toca **📝 Reportar** (queda en el historial para el admin).
- El **admin** marca **🔧 En revisión** cuando sale el técnico y **✅ Marcar reparado** al volver, y prueba con un simulacro.

### 8.5 Triaje del admin (de más común a más raro)

| Estado en app | Causa probable | Solución |
|---|---|---|
| 🔴 Caído de noche | Corte de luz del alumbrado + batería agotada | Verificar luz de la cuadra; cambiar batería 12V 7Ah |
| 🔴 Caído siempre | Router del barrio apagado / cambió la clave WiFi | Re-encender router; actualizar `WIFI_PASS` y re-subir |
| 🔴 Caído uno solo | Fuente quemada / ESP32 colgado | Ir al punto, mirar LED, reiniciar; si no vuelve, cambiar fuente |
| 📶 más débil que -80 dBm | Punto lejos del router | Reorientar antena, subir el punto o poner repetidor |
| ⚪ Sin datos | Sin programa de latido o punto no registrado | Subir v2 + crear el punto con el mismo ID |
| 🟢 pero no suena | Relé/fusible/cable de sirena | Probar `/sirena?on=1` en el lugar; revisar relé y 12V |

### 8.6 Costo de datos con chip GSM (prepago)

Cada latido mueve ~7 KB (handshake HTTPS + JSON). Cuenta mensual ≈ `43.200 × 7 KB ÷ intervalo_min`:

| Latido cada | Datos/mes por punto | Detección de caída | Costo aprox. 2026 |
|---|---|---|---|
| 60 seg | ~300 MB | ~5 min | $6.000 – $9.000 (entra en recarga de $9.000 con 2 GB/30 días) |
| 2 min | ~150 MB | ~10 min | $5.000 – $7.000 |
| 5 min | ~60 MB | ~15–20 min | $3.000 – $5.000 (pack chico) |
| 10 min | ~30 MB | ~30 min | $3.000 – $4.000 |
| 15 min | ~20 MB | ~45–60 min | ~$3.000 |
| 20 min | ~15 MB | ~1 h | ~$3.000 |

20 puntos a 60 seg ≈ **$120.000 – $180.000/mes**; a 5 min ≈ **$60.000 – $100.000/mes**.
Recomendación: WiFi del barrio donde haya (costo $0) y GSM con latido de 5 min donde no.
Para cambiar el intervalo: `LATIDO_MS` en el firmware + umbral en app (Centro → Conexión, regla: umbral ≥ 3× intervalo).

Opción B (SMS) y C (enchufe): no tienen latido → muestran ⚪ Sin datos y se verifican con simulacro manual.

---

*Documento del proyecto Alarma Vecinal — Power By: GeoAlerta Sistemas.*
