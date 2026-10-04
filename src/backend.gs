/*** BACKEND ALARMA VECINAL - Google Apps Script ***/
/* Instalacion rapida (5 min):
  1. Crea un Google Sheet nuevo.
  2. Extensiones > Apps Script > pega este archivo > Guarda > Ejecuta setupUnaVez > Autoriza.
  3. Engrane proyecto > Propiedades de secuencia de comandos > agrega API_KEY con una clave larga.
  4. Implementar > Nueva implementacion > Aplicacion web > Ejecutar como: Yo, Acceso: Cualquiera > Copia la URL /exec.
  5. Pega URL + API_KEY en la pestana Centro > Backend Sheets de la app.
  Hojas exactas: "BD Vecino" | "BD Postes" | "Usuarios de app" | "Auditoria"
*/
var HOJAS = {
  vecino: "BD Vecino",
  postes: "BD Postes",
  usuarios: "Usuarios de app",
  auditoria: "Auditoria",
  sesiones: "Sesiones",
  incidentes: "Incidentes"
};
var HEADERS = {};
HEADERS[HOJAS.vecino] = ["id","nombre","direccion","telefono","poste_id","lat","lng","activo","fecha_registro","notas"];
HEADERS[HOJAS.postes] = ["id_poste","nombre","direccion","lat","lng","esp_url","estado","ultima_conexion","notas"];
HEADERS[HOJAS.usuarios] = ["username","rol","vecino_id","activo","creado","nota"];
HEADERS[HOJAS.auditoria] = ["timestamp","tipo_evento","actor","detalle","id_ref","extra"];
HEADERS[HOJAS.sesiones] = ["token","username","rol","vecino_id","poste_id","expira","creado"];
HEADERS[HOJAS.incidentes] = ["id_alarma","tipo","subtipo","condicion","sintesis","cierre","operador","actualizado"];

function setupUnaVez() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function(n){
    var h = ss.getSheetByName(n) || ss.insertSheet(n);
    if (h.getLastRow() === 0) h.appendRow(HEADERS[n]);
    else {
      var cur = h.getRange(1,1,1,h.getLastColumn()).getValues()[0];
      if (String(cur[0]).toLowerCase().indexOf("id") < 0 && cur.join("") !== "") h.insertRowBefore(1), h.getRange(1,1,1,HEADERS[n].length).setValues([HEADERS[n]]);
    }
    h.setFrozenRows(1);
  });
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty("API_KEY")) p.setProperty("API_KEY", Utilities.getUuid() + Utilities.getUuid());
}

function verApiKey() {
  Logger.log(PropertiesService.getScriptProperties().getProperty("API_KEY"));
  return PropertiesService.getScriptProperties().getProperty("API_KEY");
}
function _ensureCol(hoja, col) {
  var h = _sheet(hoja), lc = h.getLastColumn();
  var head = h.getRange(1,1,1,lc).getValues()[0].map(String);
  if (head.indexOf(col) < 0) h.getRange(1, lc+1).setValue(col);
  return h;
}
function _sheet(n) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(n) || ss.insertSheet(n);
  if (h.getLastRow() === 0) h.appendRow(HEADERS[n]);
  return h;
}
function _isHash(s) { return /^[0-9a-f]{64}$/i.test(String(s || "")); }
function _sha256hex(s) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  var h = "";
  for (var i = 0; i < d.length; i++) { var v = d[i] < 0 ? d[i] + 256 : d[i]; var x = v.toString(16); h += (x.length === 1 ? "0" + x : x); }
  return h;
}
function _ok(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function _checkKey(k) {
  var real = PropertiesService.getScriptProperties().getProperty("API_KEY") || "";
  return k && real && k === real;
}
function _rows(n) {
  var h = _sheet(n), lr = h.getLastRow(), lc = h.getLastColumn();
  if (lr < 2) return [];
  var v = h.getRange(2, 1, lr-1, lc).getValues();
  var head = h.getRange(1,1,1,lc).getValues()[0];
  return v.filter(function(r){ var s=String(r.join("")).trim(); if(!s) return false; var first=String(r[0]).trim().toLowerCase();
    if(first==="id"||first==="id_poste"||first==="username"||first==="timestamp") return false; return true; }).map(function(r){
    var o = {}; head.forEach(function(c,i){ o[String(c)] = r[i]; }); return o;
  });
}
function _limpiaSesiones() {
  var h = _sheet(HOJAS.sesiones);
  var lr = h.getLastRow(); if (lr < 2) return;
  var head = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].map(String);
  var ei = head.indexOf("expira");
  if (ei < 0) return;
  var now = Date.now();
  var vals = h.getRange(2, 1, lr - 1, head.length).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    var exp = Date.parse(vals[i][ei]);
    if (isNaN(exp) || exp < now) h.deleteRow(i + 2);
  }
}
function _nuevaSesion(u) {
  _limpiaSesiones();
  var tok = Utilities.getUuid() + Utilities.getUuid();
  _sheet(HOJAS.sesiones).appendRow([_sha256hex(tok), u.username, u.rol, u.vecino_id || "", u.poste_id || "", new Date(Date.now() + 24 * 3600 * 1000).toISOString(), new Date().toISOString()]);
  return tok;
}
function _actorToken(t) {
  if (!t) return null;
  var h = _sheet(HOJAS.sesiones);
  var lr = h.getLastRow(); if (lr < 2) return null;
  var head = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].map(String);
  var ti = head.indexOf("token"), ei = head.indexOf("expira");
  if (ti < 0) return null;
  var want = _sha256hex(String(t));
  var vals = h.getRange(2, 1, lr - 1, head.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][ti]) === want) {
      var exp = ei >= 0 ? Date.parse(vals[i][ei]) : NaN;
      if (isNaN(exp) || exp < Date.now()) return {expirado:true};
      return {username:String(vals[i][head.indexOf("username")] || ""), rol:String(head.indexOf("rol") >= 0 ? vals[i][head.indexOf("rol")] : "vecino") || "vecino", vecino_id:String(head.indexOf("vecino_id") >= 0 ? vals[i][head.indexOf("vecino_id")] : ""), poste_id:String(head.indexOf("poste_id") >= 0 ? vals[i][head.indexOf("poste_id")] : "")};
    }
  }
  return null;
}
function _reqActor(b) {
  var a = _actorToken((b || {}).token);
  if (!a) return {error:"token_invalido"};
  if (a.expirado) return {error:"token_expirado"};
  return {actor:a};
}
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (!_checkKey(p.apiKey)) return _ok({ok:false, error:"bad_key"});
    var a = p.action || "ping";
    if (a === "ping") return _ok({ok:true, ts:new Date().toISOString()});
    var __chkG = _reqActor(p);
    if (__chkG.error) return _ok({ok:false, error:__chkG.error});
    if (a === "vecinos") return _ok({ok:true, data:_rows(HOJAS.vecino)});
    if (a === "postes") return _ok({ok:true, data:_rows(HOJAS.postes)});
    if (a === "usuarios") {
      var uu = _rows(HOJAS.usuarios).map(function(u){ var x={}; for(var k in u) x[k]=u[k]; delete x.clave; return x; });
      return _ok({ok:true, data:uu});
    }
    if (a === "incidentes") {
      var __chkI = _reqActor(p);
      if (__chkI.error) return _ok({ok:false, error:__chkI.error});
      return _ok({ok:true, data:_rows(HOJAS.incidentes)});
    }
    if (a === "auditoria") {
      var lim = Math.min(parseInt(p.limit||"100",10)||100, 500);
      var d = _rows(HOJAS.auditoria);
      return _ok({ok:true, data:d.slice(-lim).reverse()});
    }
    return _ok({ok:false, error:"bad_action"});
  } catch(err) { return _ok({ok:false, error:String(err)}); }
}
function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!_checkKey(b.apiKey)) return _ok({ok:false, error:"bad_key"});
    var a = b.action;
    if (a === "logout") {
      var lh = _sheet(HOJAS.sesiones);
      var llr = lh.getLastRow();
      if (llr >= 2) {
        var lhead = lh.getRange(1, 1, 1, lh.getLastColumn()).getValues()[0].map(String);
        var lti = lhead.indexOf("token");
        if (lti >= 0 && b.token) {
          var wantL = _sha256hex(String(b.token));
          var lcol = lh.getRange(2, lti + 1, llr - 1, 1).getValues();
          for (var li2 = 0; li2 < lcol.length; li2++) if (String(lcol[li2][0]) === wantL) { lh.deleteRow(li2 + 2); break; }
        }
      }
      return _ok({ok:true});
    }
    if (a === "revoke") {
      var __chkR = _reqActor(b);
      if (__chkR.error) return _ok({ok:false, error:__chkR.error});
      if (String(__chkR.actor.rol).toLowerCase() !== "admin") return _ok({ok:false, error:"sin_permiso"});
      var rh = _sheet(HOJAS.sesiones);
      var rlr = rh.getLastRow();
      if (rlr >= 2) rh.deleteRows(2, rlr - 1);
      return _ok({ok:true});
    }
    if (a === "upsertVecino") {
      var __chkV = _reqActor(b);
      if (__chkV.error) return _ok({ok:false, error:__chkV.error});
      var rolV = String(__chkV.actor.rol || "").toLowerCase();
      _ensureCol(HOJAS.vecino, "poste_id");
      var vid = b.id || ("v"+Date.now().toString(36));
      if (rolV === "vecino") {
        if (!__chkV.actor.vecino_id) return _ok({ok:false, error:"sin_permiso"});
        vid = __chkV.actor.vecino_id;
      } else if (rolV !== "admin" && rolV !== "carga") {
        return _ok({ok:false, error:"sin_permiso"});
      }
      return _ok(_mergeUpsert(HOJAS.vecino, "id", vid, _pick(b, ["nombre","direccion","telefono","poste_id","lat","lng","activo","notas"]),
        {id: vid, nombre:"", direccion:"", telefono:"", poste_id:"", lat:"", lng:"", activo:"SI", fecha_registro:new Date().toISOString(), notas:""}));
    }
    if (a === "upsertPoste") {
      var __chkP = _reqActor(b);
      if (__chkP.error) return _ok({ok:false, error:__chkP.error});
      var rolP = String(__chkP.actor.rol || "").toLowerCase();
      if (rolP !== "admin" && rolP !== "carga") return _ok({ok:false, error:"sin_permiso"});
      var pid = b.id_poste || ("p"+Date.now().toString(36));
      return _ok(_mergeUpsert(HOJAS.postes, "id_poste", pid, _pick(b, ["nombre","direccion","lat","lng","esp_url","estado","notas"]),
        {id_poste: pid, nombre:"", direccion:"", lat:"", lng:"", esp_url:"", estado:"activo", ultima_conexion:new Date().toISOString(), notas:""}));
    }
    if (a === "latido") {
      var lid = String(b.id_poste || "");
      if (!lid) return _ok({ok:false, error:"sin_punto"});
      _ensureCol(HOJAS.postes, "diag");
      var lh2 = _sheet(HOJAS.postes);
      var lhead2 = lh2.getRange(1,1,1,lh2.getLastColumn()).getValues()[0].map(String);
      var li2 = lhead2.indexOf("id_poste"), lr2 = lh2.getLastRow(), frow2 = -1;
      if (lr2 >= 2 && li2 >= 0) {
        var lcol2 = lh2.getRange(2, li2+1, lr2-1, 1).getValues();
        for (var lj = 0; lj < lcol2.length; lj++) if (String(lcol2[lj][0]) === lid) { frow2 = lj + 2; break; }
      }
      if (frow2 < 0) return _ok({ok:false, error:"sin_punto"});
      function lset(nm, val) { var ii = lhead2.indexOf(nm); if (ii >= 0) lh2.getRange(frow2, ii+1).setValue(val); }
      lset("ultima_conexion", new Date().toISOString());
      var dg = "rssi:" + String(b.rssi !== undefined ? b.rssi : "") + "|up:" + String(b.uptime_min !== undefined ? b.uptime_min : "") + "|v:" + String(b.fw || "") + "|mot:" + String(b.motivo || "");
      lset("diag", dg);
      if (String(b.motivo || "").indexOf("arranque") === 0) {
        _sheet(HOJAS.auditoria).appendRow([new Date().toISOString(), "punto_reporte", lid, String(b.motivo || ""), lid, dg]);
      }
      return _ok({ok:true});
    }
    if (a === "upsertUsuario") {
      _ensureCol(HOJAS.usuarios, "clave");
      _ensureCol(HOJAS.usuarios, "poste_id");
      var un = String(b.username||"").trim().toLowerCase();
      if (!un) return _ok({ok:false, error:"sin_username"});
      var ROLES_OK = ["vecino","centro","carga","visualizador","admin","poste"];
      var wantRol = String(b.rol||"").toLowerCase();
      var actorRol = "";
      var hh = _sheet(HOJAS.usuarios), hhead = hh.getRange(1,1,1,hh.getLastColumn()).getValues()[0].map(String);
      var ui = hhead.indexOf("username"), ri = hhead.indexOf("rol"), plr = hh.getLastRow();
      var prev = null, totalUsers = 0;
      if (plr >= 2 && ui >= 0) {
        var ucol = hh.getRange(2, ui+1, plr-1, 1).getValues();
        for (var ui2=0;ui2<ucol.length;ui2++) {
          var nm = String(ucol[ui2][0]).trim().toLowerCase();
          if (nm === "" || nm === "username") continue;
          totalUsers++;
          if (nm === un) {
            var prow = hh.getRange(ui2+2,1,1,hhead.length).getValues()[0];
            prev = {rol: ri>=0 ? String(prow[ri]).toLowerCase() : ""};
          }
        }
      }
      var targetRol = b.hasOwnProperty("rol") ? wantRol : (prev ? prev.rol : "vecino");
      if (b.hasOwnProperty("rol") && ROLES_OK.indexOf(targetRol) < 0)
        return _ok({ok:false, error:"rol_invalido"});
      var bootstrap = (totalUsers === 0 && !prev);
      if (!bootstrap) {
        var __chkU = _reqActor(b);
        if (__chkU.error) return _ok({ok:false, error:__chkU.error});
        actorRol = String(__chkU.actor.rol || "").toLowerCase();
      }
      if (!bootstrap && totalUsers > 0 && actorRol !== "admin" && actorRol !== "carga")
        return _ok({ok:false, error:"sin_permiso_usuarios"});
      if (!bootstrap && (targetRol === "admin" || (prev && prev.rol === "admin")) && actorRol !== "admin")
        return _ok({ok:false, error:"solo_admin_puede_admin"});
      if (!bootstrap && actorRol === "carga") {
        var okSet = ["vecino","carga"];
        if (okSet.indexOf(targetRol) < 0 || (prev && okSet.indexOf(prev.rol) < 0))
          return _ok({ok:false, error:"carga_solo_vecino_carga"});
      }
      var upatch = _pick(b, ["rol","vecino_id","activo","nota","clave","poste_id"]);
      if (upatch.clave && !_isHash(upatch.clave)) upatch.clave = _sha256hex(un + "|" + String(upatch.clave));
      if (!upatch.hasOwnProperty("poste_id") && b.hasOwnProperty("vecino_id")) {
        var vvid = String(b.vecino_id||"");
        if (vvid) {
          var vh = _sheet(HOJAS.vecino), vhead = vh.getRange(1,1,1,vh.getLastColumn()).getValues()[0].map(String);
          var vi = vhead.indexOf("id"), vpi = vhead.indexOf("poste_id"), vlr = vh.getLastRow();
          if (vi >= 0 && vpi >= 0 && vlr >= 2) {
            var vcol = vh.getRange(2, vi+1, vlr-1, 1).getValues();
            for (var vi2=0;vi2<vcol.length;vi2++) if (String(vcol[vi2][0])===vvid) {
              upatch.poste_id = String(vh.getRange(vi2+2, vpi+1).getValue()||"");
              break;
            }
          }
        } else upatch.poste_id = "";
      }
      return _ok(_mergeUpsert(HOJAS.usuarios, "username", un, upatch,
        {username: un, rol:"vecino", vecino_id:"", poste_id:"", activo:"SI", creado:new Date().toISOString(), nota:"", clave:""}));
    }
    if (a === "login") {
      var lun = String(b.username || "").trim().toLowerCase();
      var uh = _sheet(HOJAS.usuarios);
      var uhead = uh.getRange(1, 1, 1, uh.getLastColumn()).getValues()[0].map(String);
      function ug(nm) { var ii = uhead.indexOf(nm); return ii >= 0 ? ii : -1; }
      var uii = ug("username"), cii = ug("clave"), aii = ug("activo");
      var lur = uh.getLastRow(), frow = -1;
      if (lur >= 2 && uii >= 0) {
        var ucol = uh.getRange(2, uii + 1, lur - 1, 1).getValues();
        for (var li = 0; li < ucol.length; li++) if (String(ucol[li][0]).trim().toLowerCase() === lun) { frow = li + 2; break; }
      }
      if (frow < 0) return _ok({ok:false, error:"no_existe"});
      var lrow = uh.getRange(frow, 1, 1, uhead.length).getValues()[0];
      function gv(nm) { var ii = ug(nm); return ii >= 0 ? lrow[ii] : ""; }
      if (String(aii >= 0 ? lrow[aii] : "SI") === "NO") return _ok({ok:false, error:"desactivado"});
      var stored = String(cii >= 0 ? lrow[cii] : "");
      var prueba = String(b.prueba || "");
      var okL = false;
      if (stored && prueba && stored === prueba && _isHash(stored)) okL = true;
      else if (stored && prueba && !_isHash(stored) && _sha256hex(lun + "|" + stored) === prueba) {
        if (cii >= 0) uh.getRange(frow, cii + 1).setValue(prueba);
        okL = true;
      }
      if (!okL) return _ok({ok:false, error:"clave"});
      var rolR = String(gv("rol") || "vecino"), vidR = String(gv("vecino_id") || ""), pidR = String(gv("poste_id") || "");
      var tok = _nuevaSesion({username:lun, rol:rolR, vecino_id:vidR, poste_id:pidR});
      return _ok({ok:true, user:{username:lun, rol:rolR, vecino_id:vidR, poste_id:pidR, activo:String(aii >= 0 ? lrow[aii] : "SI")}, token:tok});
    }
    if (a === "upsertIncidente") {
      var __chkN = _reqActor(b);
      if (__chkN.error) return _ok({ok:false, error:__chkN.error});
      var rolN = String(__chkN.actor.rol || "").toLowerCase();
      if (rolN !== "admin" && rolN !== "centro") return _ok({ok:false, error:"sin_permiso"});
      if (!b.id_alarma) return _ok({ok:false, error:"sin_id"});
      var cond = String(b.condicion || "").toUpperCase();
      if (cond !== "TENTATIVA" && cond !== "CONSUMADO") cond = "";
      return _ok(_mergeUpsert(HOJAS.incidentes, "id_alarma", String(b.id_alarma), {tipo:String(b.tipo||""), subtipo:String(b.subtipo||""), condicion:cond, sintesis:String(b.sintesis||""), cierre:String(b.cierre||""), operador:__chkN.actor.username, actualizado:new Date().toISOString()},
        {id_alarma:String(b.id_alarma), tipo:"", subtipo:"", condicion:"", sintesis:"", cierre:"", operador:__chkN.actor.username, actualizado:new Date().toISOString()}));
    }
    if (a === "evento") {
      var __chkE = _reqActor(b);
      if (__chkE.error) return _ok({ok:false, error:__chkE.error});
      _sheet(HOJAS.auditoria).appendRow([new Date().toISOString(), b.tipo||"alarma", b.actor||__chkE.actor.username, b.detalle||"", b.id_ref||"", b.extra||""]);
      return _ok({ok:true});
    }
    return _ok({ok:false, error:"bad_action"});
  } catch(err) { return _ok({ok:false, error:String(err)}); }
}
function _mergeUpsert(hoja, keyCol, keyVal, patch, defaults) {
  var h = _sheet(hoja);
  var head = h.getRange(1,1,1,h.getLastColumn()).getValues()[0].map(String);
  var ki = head.indexOf(keyCol);
  var lr = h.getLastRow(), found = -1;
  if (lr >= 2 && ki >= 0) {
    var col = h.getRange(2, ki+1, lr-1, 1).getValues();
    for (var i=0;i<col.length;i++) if (String(col[i][0])===String(keyVal)) { found=i+2; break; }
  }
  if (found > 0) {
    var cur = h.getRange(found,1,1,head.length).getValues()[0];
    var row = head.map(function(c,idx){ return patch.hasOwnProperty(c) ? patch[c] : cur[idx]; });
    h.getRange(found,1,1,row.length).setValues([row]);
  } else {
    var full = {};
    for (var k in defaults) full[k] = defaults[k];
    for (var k2 in patch) full[k2] = patch[k2];
    h.appendRow(head.map(function(c){ return full[c] !== undefined ? full[c] : ""; }));
  }
  return {ok:true, id: keyVal};
}
function _pick(b, keys) { var o={}; keys.forEach(function(k){ if (b.hasOwnProperty(k) && b[k] !== undefined) o[k]=b[k]; }); return o; }
