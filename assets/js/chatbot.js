// assets/js/chatbot.js
// Widget flotante de chat, disponible en toda la plataforma. Si la página
// define `window.__cursoIdActual` (por ejemplo detalles.html ya cargó un
// curso), se lo manda al backend para que el chatbot priorice ese curso.
(function () {
  const estilos = document.createElement("style");
  estilos.textContent = `
    #chatbotBurbuja {
      position: fixed; bottom: 20px; right: 20px; z-index: 1055;
      width: 58px; height: 58px; border-radius: 50%;
      background: #212529; color: #fff; border: none;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
      font-size: 1.5rem; display: flex; align-items: center; justify-content: center;
      cursor: pointer;
    }
    #chatbotPanel {
      position: fixed; bottom: 90px; right: 20px; z-index: 1055;
      width: 320px; max-width: calc(100vw - 40px); height: 420px;
      background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25);
      display: none; flex-direction: column; overflow: hidden;
      font-family: inherit;
    }
    #chatbotPanel.abierto { display: flex; }
    #chatbotPanel header {
      background: #212529; color: #fff; padding: 10px 14px;
      display: flex; justify-content: space-between; align-items: center;
      font-weight: 600; font-size: .95rem;
    }
    #chatbotMensajes {
      flex: 1; overflow-y: auto; padding: 10px; background: #f8f9fa;
    }
    .chatbot-msg { margin-bottom: 8px; max-width: 85%; padding: 8px 10px; border-radius: 10px; font-size: .85rem; white-space: pre-line; }
    .chatbot-msg.bot { background: #e9ecef; color: #212529; border-bottom-left-radius: 2px; }
    .chatbot-msg.usuario { background: #0d6efd; color: #fff; margin-left: auto; border-bottom-right-radius: 2px; }
    #chatbotForm { display: flex; border-top: 1px solid #dee2e6; }
    #chatbotInput { flex: 1; border: none; padding: 10px; font-size: .85rem; outline: none; }
    #chatbotForm button { border: none; background: #0d6efd; color: #fff; padding: 0 16px; }
  `;
  document.head.appendChild(estilos);

  const burbuja = document.createElement("button");
  burbuja.id = "chatbotBurbuja";
  burbuja.innerHTML = `<i class="bi bi-chat-dots-fill"></i>`;
  burbuja.title = "Asistente de AllCursos";

  const panel = document.createElement("div");
  panel.id = "chatbotPanel";
  panel.innerHTML = `
    <header>
      <span><i class="bi bi-robot me-1"></i> Asistente AllCursos</span>
      <button type="button" id="chatbotCerrar" style="background:none;border:none;color:#fff;font-size:1.1rem;">&times;</button>
    </header>
    <div id="chatbotMensajes"></div>
    <form id="chatbotForm">
      <input type="text" id="chatbotInput" placeholder="Preguntame sobre los cursos..." maxlength="500" autocomplete="off">
      <button type="submit"><i class="bi bi-send-fill"></i></button>
    </form>
  `;

  document.body.appendChild(burbuja);
  document.body.appendChild(panel);

  const contenedorMensajes = panel.querySelector("#chatbotMensajes");
  const form = panel.querySelector("#chatbotForm");
  const input = panel.querySelector("#chatbotInput");

  let saludoMostrado = false;

  function agregarMensaje(texto, tipo) {
    const burbujaMsj = document.createElement("div");
    burbujaMsj.className = `chatbot-msg ${tipo}`;
    burbujaMsj.textContent = texto;
    contenedorMensajes.appendChild(burbujaMsj);
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
  }

  burbuja.addEventListener("click", () => {
    panel.classList.toggle("abierto");
    if (panel.classList.contains("abierto") && !saludoMostrado) {
      saludoMostrado = true;
      agregarMensaje(
        "¡Hola! Puedo ayudarte con dudas sobre los cursos publicados: requisitos, lugar, modalidad, cupos o contacto. ¿En qué te ayudo?",
        "bot",
      );
    }
  });

  panel.querySelector("#chatbotCerrar").addEventListener("click", () => {
    panel.classList.remove("abierto");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mensaje = input.value.trim();
    if (!mensaje) return;

    agregarMensaje(mensaje, "usuario");
    input.value = "";
    input.disabled = true;

    const pensando = document.createElement("div");
    pensando.className = "chatbot-msg bot";
    pensando.textContent = "Escribiendo...";
    contenedorMensajes.appendChild(pensando);
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

    try {
      const respuesta = await fetch(`${window.location.origin}/api/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje,
          curso_id: window.__cursoIdActual || null,
        }),
      });
      const datos = await respuesta.json();
      pensando.remove();
      agregarMensaje(
        datos.respuesta || "No pude responderte en este momento.",
        "bot",
      );
    } catch (error) {
      pensando.remove();
      agregarMensaje("No pude conectarme con el servidor. Probá de nuevo.", "bot");
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
})();
