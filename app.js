import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const el = (id) => document.getElementById(id);
const toastEl = el("toast");
function toast(msg){
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=> toastEl.style.display="none", 2600);
}

function setOnlinePill(){
  const pill = el("syncPill");
  pill.textContent = navigator.onLine ? "Online" : "Offline";
}
window.addEventListener("online", setOnlinePill);
window.addEventListener("offline", setOnlinePill);
setOnlinePill();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const viewLogin = el("viewLogin");
const viewApp = el("viewApp");
const boloList = el("boloList");
const jornadaList = el("jornadaList");
const emptyBolos = el("emptyBolos");
const emptyJornadas = el("emptyJornadas");
const userLabel = el("userLabel");
const btnLogout = el("btnLogout");
const btnRefresh = el("btnRefresh");
const btnNewBolo = el("btnNewBolo");
const cardDetail = el("cardDetail");

const btnLoginGoogle = el("btnLoginGoogle");
const btnLoginEmail = el("btnLoginEmail");
const btnSignupEmail = el("btnSignupEmail");
const email = el("email");
const password = el("password");

const detailTitle = el("detailTitle");
const detailMeta = el("detailMeta");
const btnEditBolo = el("btnEditBolo");
const btnDeleteBolo = el("btnDeleteBolo");
const btnNewJornada = el("btnNewJornada");
const btnExportCsv = el("btnExportCsv");

const totalHoras = el("totalHoras");
const totalJE = el("totalJE");
const totalNoct = el("totalNoct");

const modal = el("modal");
const modalTitle = el("modalTitle");
const modalBody = el("modalBody");
const modalHint = el("modalHint");
const modalSave = el("modalSave");

let currentUser = null;
let bolos = [];
let jornadas = [];
let currentBoloId = null;

function fmtDate(d){
  if(!d) return "—";
  return new Date(d+"T00:00:00").toLocaleDateString("es-ES");
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}
function statusTag(status){
  const s = (status || "abierto").toLowerCase();
  const cls = s === "abierto" ? "open" : (s === "cerrado" ? "closed" : "invoiced");
  return `<span class="tag ${cls}">${s}</span>`;
}
function hhmmToMin(t){
  if(!t) return null;
  const [h,m] = t.split(":").map(Number);
  if(Number.isNaN(h)||Number.isNaN(m)) return null;
  return h*60+m;
}
function minToHM(min){
  const h = Math.floor(min/60);
  const m = min%60;
  return `${h}h ${m}m`;
}
function calcTotalMin(entrada, salida, descansoMin){
  const e = hhmmToMin(entrada);
  const s = hhmmToMin(salida);
  if(e==null || s==null) return 0;
  let diff = s - e;
  if(diff < 0) diff += 24*60; // cruza medianoche
  diff -= (parseInt(descansoMin||0,10) || 0);
  return Math.max(0, diff);
}

// Auth actions
btnLoginGoogle.addEventListener("click", async ()=>{
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if(error) toast("Error Google: " + error.message);
});

btnLoginEmail.addEventListener("click", async ()=>{
  const em = email.value.trim();
  const pw = password.value;
  const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
  if(error) toast("Error login: " + error.message);
});

btnSignupEmail.addEventListener("click", async ()=>{
  const em = email.value.trim();
  const pw = password.value;
  const { error } = await supabase.auth.signUp({ email: em, password: pw });
  if(error) toast("Error registro: " + error.message);
  else toast("Cuenta creada. Revisa tu email si pide confirmación.");
});

btnLogout.addEventListener("click", async ()=>{
  await supabase.auth.signOut();
});

// Data load
async function loadBolos(){
  const { data, error } = await supabase.from("bolos").select("*").order("created_at", { ascending:false });
  if(error){ toast("Error cargando bolos: " + error.message); return; }
  bolos = data || [];
  renderBolos();
}

async function loadJornadas(boloId){
  const { data, error } = await supabase.from("jornadas").select("*").eq("bolo_id", boloId).order("fecha", { ascending:true });
  if(error){ toast("Error cargando jornadas: " + error.message); return; }
  jornadas = data || [];
  renderJornadas();
}

btnRefresh.addEventListener("click", async ()=>{
  toast("Sincronizando…");
  await loadBolos();
  if(currentBoloId) await loadJornadas(currentBoloId);
  toast("Listo");
});

// Render
function renderBolos(){
  boloList.innerHTML = "";
  emptyBolos.style.display = bolos.length ? "none" : "block";
  bolos.forEach(b => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="row">
        <div class="title">${escapeHtml(b.nombre || "Sin nombre")}</div>
        <div class="right">${statusTag(b.estado)}</div>
      </div>
      <div class="meta">
        <span>Cliente: ${escapeHtml(b.cliente || "—")}</span>
        <span>Inicio: ${b.fecha_inicio ? fmtDate(b.fecha_inicio) : "—"}</span>
        <span>Fin: ${b.fecha_fin ? fmtDate(b.fecha_fin) : "—"}</span>
      </div>
    `;
    div.addEventListener("click", ()=> openBolo(b.id));
    boloList.appendChild(div);
  });
}

function renderJornadas(){
  jornadaList.innerHTML = "";
  emptyJornadas.style.display = jornadas.length ? "none" : "block";

  let totalMin = 0, totalJe = 0, totalNoct = 0;

  jornadas.forEach(j => {
    const mins = calcTotalMin(j.entrada, j.salida, j.descanso_min);
    totalMin += mins;
    totalJe += (parseInt(j.je||0,10) || 0);
    totalNoct += (parseInt(j.noct||0,10) || 0);

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="row">
        <div class="title">${j.fecha ? fmtDate(j.fecha) : "—"}</div>
        <div class="right"><span class="pill">${minToHM(mins)}</span></div>
      </div>
      <div class="meta">
        <span>Entrada: ${escapeHtml(j.entrada || "—")}</span>
        <span>Salida: ${escapeHtml(j.salida || "—")}</span>
        <span>Descanso: ${escapeHtml(String(j.descanso_min ?? 0))} min</span>
        <span>JE: ${escapeHtml(String(j.je ?? 0))}</span>
        <span>Noct: ${escapeHtml(String(j.noct ?? 0))}</span>
      </div>
      ${j.notas ? `<div class="muted" style="margin-top:8px">${escapeHtml(j.notas)}</div>` : ""}
      <div class="split" style="margin-top:10px">
        <button class="btn small" data-act="edit">Editar</button>
        <button class="btn small danger" data-act="del">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-act="edit"]').addEventListener("click", (e)=>{ e.stopPropagation(); editJornada(j); });
    div.querySelector('[data-act="del"]').addEventListener("click", (e)=>{ e.stopPropagation(); deleteJornada(j.id); });
    jornadaList.appendChild(div);
  });

  totalHoras.textContent = minToHM(totalMin);
  totalJE.textContent = `JE: ${totalJe}`;
  totalNoct.textContent = `Noct: ${totalNoct}`;
}

// Detail open
async function openBolo(id){
  currentBoloId = id;
  const bolo = bolos.find(b=>b.id===id);
  if(!bolo) return;
  detailTitle.textContent = bolo.nombre || "Bolo";
  detailMeta.innerHTML = `Cliente: <b>${escapeHtml(bolo.cliente||"—")}</b> · ${statusTag(bolo.estado)} · ${bolo.fecha_inicio ? fmtDate(bolo.fecha_inicio) : "—"} → ${bolo.fecha_fin ? fmtDate(bolo.fecha_fin) : "—"}`;
  cardDetail.style.display = "block";
  await loadJornadas(id);
}

// CRUD: Bolo
btnNewBolo.addEventListener("click", ()=> editBolo(null));
btnEditBolo.addEventListener("click", ()=>{
  const bolo = bolos.find(b=>b.id===currentBoloId);
  editBolo(bolo||null);
});
btnDeleteBolo.addEventListener("click", async ()=>{
  if(!currentBoloId) return;
  if(!confirm("¿Eliminar este bolo y todas sus jornadas?")) return;
  await supabase.from("jornadas").delete().eq("bolo_id", currentBoloId);
  const { error } = await supabase.from("bolos").delete().eq("id", currentBoloId);
  if(error) toast("Error eliminando bolo: " + error.message);
  else {
    toast("Bolo eliminado");
    currentBoloId = null;
    cardDetail.style.display = "none";
    await loadBolos();
  }
});

function editBolo(bolo){
  modalTitle.textContent = bolo ? "Editar bolo" : "Nuevo bolo";
  modalHint.textContent = bolo ? "Actualiza los campos y guarda" : "Rellena y guarda";
  const estado = (bolo?.estado || "abierto").toLowerCase();
  modalBody.innerHTML = `
    <label>Nombre</label>
    <input id="m_nombre" value="${escapeHtml(bolo?.nombre || "")}" placeholder="Ej: Evento corporativo" />
    <label>Cliente</label>
    <input id="m_cliente" value="${escapeHtml(bolo?.cliente || "")}" placeholder="Ej: Agencia XYZ" />
    <label>Ubicación</label>
    <input id="m_ubicacion" value="${escapeHtml(bolo?.ubicacion || "")}" placeholder="Ej: Barcelona" />
    <div class="grid grid2">
      <div>
        <label>Fecha inicio</label>
        <input id="m_inicio" type="date" value="${bolo?.fecha_inicio || ""}" />
      </div>
      <div>
        <label>Fecha fin</label>
        <input id="m_fin" type="date" value="${bolo?.fecha_fin || ""}" />
      </div>
    </div>
    <label>Estado</label>
    <select id="m_estado">
      <option value="abierto" ${estado==="abierto"?"selected":""}>abierto</option>
      <option value="cerrado" ${estado==="cerrado"?"selected":""}>cerrado</option>
      <option value="facturado" ${estado==="facturado"?"selected":""}>facturado</option>
    </select>
  `;

  modalSave.onclick = async (e)=>{
    e.preventDefault();
    const payload = {
      user_id: currentUser.id,
      nombre: document.getElementById("m_nombre").value.trim(),
      cliente: document.getElementById("m_cliente").value.trim(),
      ubicacion: document.getElementById("m_ubicacion").value.trim(),
      fecha_inicio: document.getElementById("m_inicio").value || null,
      fecha_fin: document.getElementById("m_fin").value || null,
      estado: document.getElementById("m_estado").value
    };
    const res = bolo?.id
      ? await supabase.from("bolos").update(payload).eq("id", bolo.id).select("*").single()
      : await supabase.from("bolos").insert(payload).select("*").single();

    if(res.error) toast("Error guardando bolo: " + res.error.message);
    else {
      toast("Bolo guardado");
      modal.close();
      await loadBolos();
      if(res.data?.id) await openBolo(res.data.id);
    }
  };

  modal.showModal();
}

// CRUD: Jornada
btnNewJornada.addEventListener("click", ()=> editJornada(null));

function editJornada(j){
  if(!currentBoloId) return;
  modalTitle.textContent = j ? "Editar jornada" : "Nueva jornada";
  modalHint.textContent = "Si cruza medianoche, pon la salida (ej 02:00).";
  modalBody.innerHTML = `
    <div class="grid grid2">
      <div>
        <label>Fecha</label>
        <input id="j_fecha" type="date" value="${j?.fecha || new Date().toISOString().slice(0,10)}" />
      </div>
      <div>
        <label>Descanso (min)</label>
        <input id="j_descanso" type="number" min="0" step="5" value="${j?.descanso_min ?? 0}" />
      </div>
    </div>
    <div class="grid grid2">
      <div>
        <label>Entrada</label>
        <input id="j_entrada" type="time" value="${j?.entrada || ""}" />
      </div>
      <div>
        <label>Salida</label>
        <input id="j_salida" type="time" value="${j?.salida || ""}" />
      </div>
    </div>
    <div class="grid grid2">
      <div>
        <label>JE</label>
        <input id="j_je" type="number" min="0" step="1" value="${j?.je ?? 0}" />
      </div>
      <div>
        <label>Noct</label>
        <input id="j_noct" type="number" min="0" step="1" value="${j?.noct ?? 0}" />
      </div>
    </div>
    <label>Notas</label>
    <textarea id="j_notas" placeholder="Opcional">${escapeHtml(j?.notas || "")}</textarea>
  `;

  modalSave.onclick = async (e)=>{
    e.preventDefault();
    const payload = {
      user_id: currentUser.id,
      bolo_id: currentBoloId,
      fecha: document.getElementById("j_fecha").value || null,
      entrada: document.getElementById("j_entrada").value || null,
      salida: document.getElementById("j_salida").value || null,
      descanso_min: parseInt(document.getElementById("j_descanso").value||"0",10) || 0,
      je: parseInt(document.getElementById("j_je").value||"0",10) || 0,
      noct: parseInt(document.getElementById("j_noct").value||"0",10) || 0,
      notas: document.getElementById("j_notas").value.trim() || null
    };
    if(!payload.fecha){ toast("Pon una fecha."); return; }

    const res = j?.id
      ? await supabase.from("jornadas").update(payload).eq("id", j.id).select("*").single()
      : await supabase.from("jornadas").insert(payload).select("*").single();

    if(res.error) toast("Error guardando jornada: " + res.error.message);
    else {
      toast("Jornada guardada");
      modal.close();
      await loadJornadas(currentBoloId);
    }
  };

  modal.showModal();
}

async function deleteJornada(id){
  if(!confirm("¿Eliminar esta jornada?")) return;
  const { error } = await supabase.from("jornadas").delete().eq("id", id);
  if(error) toast("Error eliminando jornada: " + error.message);
  else { toast("Jornada eliminada"); await loadJornadas(currentBoloId); }
}

// Export CSV
btnExportCsv.addEventListener("click", ()=>{
  const bolo = bolos.find(b=>b.id===currentBoloId);
  if(!bolo) return;
  const rows = [];
  rows.push(["Bolo", bolo.nombre||"", "Cliente", bolo.cliente||"", "Ubicación", bolo.ubicacion||""]);
  rows.push([]);
  rows.push(["Fecha","Entrada","Salida","Descanso(min)","Total(min)","JE","Noct","Notas"]);
  jornadas.forEach(j=>{
    const mins = calcTotalMin(j.entrada, j.salida, j.descanso_min);
    rows.push([j.fecha||"", j.entrada||"", j.salida||"", String(j.descanso_min??0), String(mins), String(j.je??0), String(j.noct??0), (j.notas||"").replace(/\n/g," ")]);
  });
  const csv = rows.map(r=> r.map(v=> `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bolo_${(bolo.nombre||"sin_nombre").replace(/\s+/g,"_")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Session handling
async function handleSession(){
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;

  if(!currentUser){
    viewLogin.style.display = "block";
    viewApp.style.display = "none";
    btnLogout.style.display = "none";
    userLabel.textContent = "";
    return;
  }

  viewLogin.style.display = "none";
  viewApp.style.display = "block";
  btnLogout.style.display = "inline-block";
  userLabel.textContent = currentUser.email || currentUser.id;

  await loadBolos();
}

supabase.auth.onAuthStateChange(() => handleSession());
handleSession();
