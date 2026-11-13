// assets/js/chatbot.js
// Widget flotante del asistente. Responde sólo sobre AllCursos.
// - Si la página define `window.__cursoIdActual` (detalles.html), se prioriza ese curso.
// - Muestra tarjetas (imagen + enlace) de los cursos de los que habla.
// - Puede OFRECER inscribir al usuario o mostrarle sus cursos, pero sólo lo hace
//   si el usuario toca "Sí": recién ahí se llama a la API normal con su sesión.
// - No se muestra a los representantes (ellos administran cursos desde su panel).
(function () {
  const leerSesion = () => {
    try {
      return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch {
      return null;
    }
  };
  if (leerSesion()?.rol === "representante") return;

  const IMAGEN_POR_DEFECTO = "assets/img/curso_programacion.webp";

  const estilos = document.createElement("style");
  estilos.textContent = `
    #chatbotBurbuja {
      position: fixed; bottom: 20px; right: 20px; z-index: 1055;
      width: 58px; height: 58px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #1e3a5f, #2f7d6b); color: #fff;
      box-shadow: 0 8px 20px rgba(20, 41, 67, .35);
      font-size: 1.5rem; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform .2s ease;
    }
    #chatbotBurbuja:hover { transform: scale(1.06); }
    #chatbotPanel {
      position: fixed; bottom: 90px; right: 20px; z-index: 1055;
      width: 370px; max-width: calc(100vw - 32px); height: 540px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: 16px; box-shadow: 0 16px 40px rgba(16, 24, 40, .25);
      display: none; flex-direction: column; overflow: hidden; font-family: inherit;
    }
    #chatbotPanel.abierto { display: flex; animation: chatbotEntrar .2s ease-out; }
    @keyframes chatbotEntrar { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    #chatbotPanel header {
      background: linear-gradient(120deg, #142943, #1e3a5f 60%, #24566e); color: #fff;
      padding: 12px 14px; display: flex; align-items: center; gap: 10px;
    }
    .chatbot-avatar {
      width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
      background: rgba(255,255,255,.15); font-size: 1.1rem; flex-shrink: 0;
    }
    .chatbot-titulo { font-weight: 700; font-size: .95rem; line-height: 1.1; }
    .chatbot-estado { font-size: .72rem; color: #6fd1b8; }
    #chatbotCerrar { margin-left: auto; background: none; border: none; color: #fff; font-size: 1.3rem; line-height: 1; opacity: .8; }
    #chatbotCerrar:hover { opacity: 1; }
    #chatbotMensajes { flex: 1; overflow-y: auto; padding: 12px; background: #f6f7f9; }
    .chatbot-msg {
      margin-bottom: 8px; max-width: 88%; padding: 9px 12px; border-radius: 14px;
      font-size: .86rem; line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere;
    }
    .chatbot-msg.bot { background: #fff; color: #1d2939; border: 1px solid #e4e7ec; border-bottom-left-radius: 4px; }
    .chatbot-msg.usuario { background: #1e3a5f; color: #fff; margin-left: auto; border-bottom-right-radius: 4px; }
    .chatbot-escribiendo span {
      display: inline-block; width: 6px; height: 6px; margin: 0 1px; border-radius: 50%;
      background: #98a2b3; animation: chatbotPunto 1s infinite ease-in-out;
    }
    .chatbot-escribiendo span:nth-child(2) { animation-delay: .15s; }
    .chatbot-escribiendo span:nth-child(3) { animation-delay: .3s; }
    @keyframes chatbotPunto { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
    .chatbot-tarjetas { display: flex; flex-direction: column; gap: 6px; margin: -2px 0 10px; max-width: 88%; }
    .chatbot-tarjeta {
      display: flex; gap: 10px; align-items: center; padding: 6px; border-radius: 12px;
      background: #fff; border: 1px solid #e4e7ec; color: #1d2939; text-decoration: none;
      transition: border-color .2s ease, box-shadow .2s ease;
    }
    .chatbot-tarjeta:hover { border-color: #2f7d6b; box-shadow: 0 4px 12px rgba(47,125,107,.15); color: #1d2939; }
    .chatbot-tarjeta img { width: 56px; height: 56px; border-radius: 9px; object-fit: cover; flex-shrink: 0; background: #eef0f3; }
    .chatbot-tarjeta-titulo { font-weight: 700; font-size: .82rem; line-height: 1.2; }
    .chatbot-tarjeta-meta { font-size: .72rem; color: #667085; margin-top: 2px; }
    .chatbot-tarjeta-ver { font-size: .72rem; font-weight: 700; color: #2f7d6b; margin-top: 3px; }
    .chatbot-acciones { display: flex; gap: 6px; margin: -2px 0 10px; flex-wrap: wrap; }
    .chatbot-acciones button, .chatbot-acciones a {
      border-radius: 999px; padding: 6px 14px; font-size: .8rem; font-weight: 600; text-decoration: none; border: 1px solid;
    }
    .chatbot-si { background: #2f7d6b; border-color: #2f7d6b !important; color: #fff; }
    .chatbot-no { background: #fff; border-color: #d0d5dd !important; color: #344054; }
    .chatbot-acciones button:disabled { opacity: .55; }
    #chatbotSugerencias { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; background: #f6f7f9; }
    #chatbotSugerencias button {
      border: 1px solid #c8dcd6; background: #fff; color: #235e51; border-radius: 999px;
      padding: 4px 10px; font-size: .76rem; font-weight: 600;
    }
    #chatbotSugerencias button:hover { background: #eaf5f2; }
    #chatbotForm { display: flex; gap: 8px; align-items: center; padding: 10px; border-top: 1px solid #e4e7ec; background: #fff; }
    #chatbotInput { flex: 1; border: 1px solid #e4e7ec; border-radius: 999px; padding: 8px 14px; font-size: .86rem; outline: none; }
    #chatbotInput:focus { border-color: #2f7d6b; box-shadow: 0 0 0 3px rgba(47,125,107,.15); }
    #chatbotForm button {
      width: 38px; height: 38px; flex-shrink: 0; border: none; border-radius: 50%;
      background: #2f7d6b; color: #fff; display: grid; place-items: center;
    }
    #chatbotForm button:disabled { opacity: .5; }
    .chatbot-aviso { font-size: .68rem; color: #98a2b3; text-align: center; padding: 0 10px 8px; background: #fff; }
  `;
  document.head.appendChild(estilos);

  const burbuja = document.createElement("button");
  burbuja.id = "chatbotBurbuja";
  burbuja.type = "button";
  burbuja.innerHTML = `<i class="bi bi-chat-dots-fill"></i>`;
  burbuja.title = "Asistente de AllCursos";
  burbuja.setAttribute("aria-label", "Abrir el asistente de AllCursos");

  const panel = document.createElement("div");
  panel.id = "chatbotPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Asistente AllCursos");
  panel.innerHTML = `
    <header>
      <span class="chatbot-avatar"><i class="bi bi-robot"></i></span>
      <div>
        <div class="chatbot-titulo">Asistente AllCursos</div>
        <div class="chatbot-estado">● Responde sobre cursos y la plataforma</div>
      </div>
      <button type="button" id="chatbotCerrar" aria-label="Cerrar">&times;</button>
    </header>
    <div id="chatbotMensajes" aria-live="polite"></div>
    <div id="chatbotSugerencias"></div>
    <form id="chatbotForm">
      <input type="text" id="chatbotInput" placeholder="Preguntame sobre los cursos..." maxlength="500" autocomplete="off">
      <button type="submit" aria-label="Enviar"><i class="bi bi-send-fill"></i></button>
    </form>
    <div class="chatbot-aviso">Sólo respondo sobre AllCursos. Nunca te voy a pedir tu contraseña.</div>
  `;

  document.body.appendChild(burbuja);
  document.body.appendChild(panel);

  const contenedorMensajes = panel.querySelector("#chatbotMensajes");
  const sugerencias = panel.querySelector("#chatbotSugerencias");
  const form = panel.querySelector("#chatbotForm");
  const input = panel.querySelector("#chatbotInput");
  const botonEnviar = form.querySelector("button");

  const historial = []; // { rol: "usuario" | "bot", texto }
  let saludoMostrado = false;
  let enviando = false;

  // Se calculan al abrir el chat (en el detalle, el curso se carga después que este script)
  const preguntasSugeridas = () =>
    window.__cursoIdActual
      ? ["¿Qué requisitos tiene este curso?", "¿Cuándo empieza?", "¿Quedan cupos?", "Quiero inscribirme"]
      : ["¿Qué cursos hay disponibles?", "¿Hay cursos virtuales?", "¿Cómo obtengo mi certificado?", "Ver mis cursos"];

  // Crea un elemento con clase y texto (textContent: nunca se interpreta como HTML)
  const el = (tag, clase, texto) => {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  };
  const bajar = () => (contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight);

  function agregarMensaje(texto, tipo) {
    contenedorMensajes.appendChild(el("div", `chatbot-msg ${tipo}`, texto));
    bajar();
  }

  // Tarjeta de un curso: imagen, título, institución y enlace a su página
  function agregarTarjetas(cursos) {
    if (!Array.isArray(cursos) || cursos.length === 0) return;
    const grupo = el("div", "chatbot-tarjetas");
    cursos.forEach((c) => {
      const enlace = el("a", "chatbot-tarjeta");
      enlace.href = `detalles.html?id=${encodeURIComponent(c.id)}`;
      const img = el("img");
      img.src = c.imagen_url || IMAGEN_POR_DEFECTO;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => (img.src = IMAGEN_POR_DEFECTO);
      const info = el("div");
      info.append(
        el("div", "chatbot-tarjeta-titulo", c.titulo),
        el("div", "chatbot-tarjeta-meta", [c.institucion, c.modalidad, `${c.disponibles} de ${c.cupo_maximo} cupos`].filter(Boolean).join(" · ")),
        el("div", "chatbot-tarjeta-ver", "Ver curso →"),
      );
      enlace.append(img, info);
      grupo.appendChild(enlace);
    });
    contenedorMensajes.appendChild(grupo);
    bajar();
  }

  // Botones de una acción ofrecida por el asistente
  function agregarBotones(botones) {
    const fila = el("div", "chatbot-acciones");
    botones.forEach((b) => {
      const boton = b.href ? el("a", b.clase, b.texto) : el("button", b.clase, b.texto);
      if (b.href) boton.href = b.href;
      else {
        boton.type = "button";
        boton.addEventListener("click", async () => {
          fila.querySelectorAll("button").forEach((x) => (x.disabled = true)); // Se responde una sola vez
          await b.alHacerClic();
        });
      }
      fila.appendChild(boton);
    });
    contenedorMensajes.appendChild(fila);
    bajar();
  }

  const recordar = (rol, texto) => historial.push({ rol, texto });

  async function llamarApi(ruta, opciones = {}) {
    const token = localStorage.getItem("token");
    const respuesta = await fetch(`${window.location.origin}/api${ruta}`, {
      ...opciones,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const datos = await respuesta.json().catch(() => ({}));
    return { ok: respuesta.ok, datos };
  }

  function mostrarAccion(accion) {
    if (!accion) return;
    if (accion.tipo === "iniciar_sesion") {
      agregarBotones([
        { texto: "Iniciar sesión", clase: "chatbot-si", href: "login.html" },
        { texto: "Registrarme", clase: "chatbot-no", href: "formulario_registro.html" },
      ]);
      return;
    }
    const cancelar = () => {
      const texto = "Listo, no hice nada. ¿Te ayudo con otra cosa?";
      agregarMensaje(texto, "bot");
      recordar("usuario", "No");
      recordar("bot", texto);
    };
    if (accion.tipo === "confirmar_inscripcion" && accion.curso) {
      agregarBotones([
        {
          texto: "Sí, inscribirme",
          clase: "chatbot-si",
          alHacerClic: async () => {
            const { ok, datos } = await llamarApi("/inscripciones", { method: "POST", body: JSON.stringify({ curso_id: accion.curso.id }) });
            const texto = ok
              ? `¡Listo! ${(datos.mensaje || "Inscripción registrada").replace(/\.$/, "")}.\n• Curso: ${accion.curso.titulo}\n• Lo ves en Mi Panel › Mis cursos`
              : `No pude inscribirte: ${datos.mensaje || (datos.errores || []).join(", ") || "probá de nuevo desde la página del curso."}`;
            agregarMensaje(texto, "bot");
            recordar("usuario", "Sí, inscribime");
            recordar("bot", texto);
            if (ok) agregarBotones([{ texto: "Ir a Mi Panel", clase: "chatbot-no", href: "dashboard.html" }]);
          },
        },
        { texto: "No, gracias", clase: "chatbot-no", alHacerClic: cancelar },
      ]);
    }
    if (accion.tipo === "confirmar_ver_inscripciones") {
      agregarBotones([
        {
          texto: "Sí, mostrame",
          clase: "chatbot-si",
          alHacerClic: async () => {
            const { ok, datos } = await llamarApi("/inscripciones/mias");
            let texto;
            if (!ok) texto = datos.mensaje || "No pude consultar tus cursos. Probá iniciar sesión de nuevo.";
            else if (!(datos.inscripciones || []).length) texto = "Todavía no estás inscripto en ningún curso. ¿Querés que te recomiende alguno?";
            else texto = `Tus cursos:\n${datos.inscripciones.map((i) => `• ${i.curso?.titulo || "Curso"}: ${i.estado}`).join("\n")}`;
            agregarMensaje(texto, "bot");
            // Al historial sólo va que el usuario aceptó (sus datos no se mandan a la IA)
            recordar("usuario", "Sí, mostrame mis cursos");
            recordar("bot", "Le mostré sus cursos.");
            if (ok && datos.inscripciones?.length) agregarBotones([{ texto: "Ir a Mi Panel", clase: "chatbot-no", href: "dashboard.html" }]);
          },
        },
        { texto: "No", clase: "chatbot-no", alHacerClic: cancelar },
      ]);
    }
  }

  function mostrarSugerencias() {
    sugerencias.replaceChildren(
      ...preguntasSugeridas().map((texto) => {
        const boton = el("button", "", texto);
        boton.type = "button";
        boton.addEventListener("click", () => enviar(texto));
        return boton;
      }),
    );
  }

  burbuja.addEventListener("click", () => {
    panel.classList.toggle("abierto");
    if (panel.classList.contains("abierto")) {
      if (!saludoMostrado) {
        saludoMostrado = true;
        agregarMensaje(
          "¡Hola! Soy el asistente de AllCursos. Te ayudo a encontrar cursos (requisitos, lugar, cupos, fechas) y a usar la plataforma. ¿Qué querés saber?",
          "bot",
        );
        mostrarSugerencias();
      }
      input.focus();
    }
  });

  panel.querySelector("#chatbotCerrar").addEventListener("click", () => panel.classList.remove("abierto"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("abierto")) panel.classList.remove("abierto");
  });

  async function enviar(mensaje) {
    if (!mensaje || enviando) return;
    enviando = true;
    sugerencias.replaceChildren(); // Las sugerencias se ocultan después de la primera pregunta
    agregarMensaje(mensaje, "usuario");
    input.value = "";
    input.disabled = true;
    botonEnviar.disabled = true;

    const escribiendo = el("div", "chatbot-msg bot chatbot-escribiendo");
    escribiendo.setAttribute("aria-label", "Escribiendo");
    escribiendo.append(el("span"), el("span"), el("span"));
    contenedorMensajes.appendChild(escribiendo);
    bajar();

    let datos = {};
    let ok = false;
    try {
      const r = await llamarApi("/chatbot", {
        method: "POST",
        body: JSON.stringify({ mensaje, curso_id: window.__cursoIdActual || null, historial: historial.slice(-8) }),
      });
      ok = r.ok;
      datos = r.datos;
    } catch {
      datos = { respuesta: "No pude conectarme con el servidor. Probá de nuevo." };
    } finally {
      escribiendo.remove();
      const texto = datos.respuesta || datos.mensaje || "No pude responderte en este momento.";
      agregarMensaje(texto, "bot");
      if (ok) {
        recordar("usuario", mensaje);
        recordar("bot", texto);
        agregarTarjetas(datos.cursos);
        mostrarAccion(datos.accion);
      }
      input.disabled = false;
      botonEnviar.disabled = false;
      enviando = false;
      input.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    enviar(input.value.trim());
  });
})();
