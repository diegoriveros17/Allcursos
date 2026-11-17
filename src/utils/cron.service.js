// src/utils/cron.service.js
//
// Tareas programadas de mantenimiento. Por ahora sólo una: cuando pasa la
// fecha_fin de un curso, las inscripciones activas pasan a "Finalizado"
// (terminó la cursada). Esto NO emite certificados: el representante tiene
// que revisar quién cumplió y emitirlos desde la página de alumnos. Por eso
// se le avisa en la campanita.

import cron from "node-cron";
import { Op } from "sequelize";
import { cursosModel } from "../models/cursos.model.js";
import { inscripcionesModel } from "../models/inscripciones.model.js";
import { notificarRepresentantes } from "./notificaciones.service.js";
import { finalizarEncuestasVencidas } from "../controllers/encuesta.controller.js";

export async function finalizarCursosVencidos() {
  const hoy = new Date().toISOString().slice(0, 10);

  const cursosVencidos = await cursosModel.findAll({
    where: { fecha_fin: { [Op.lt]: hoy } },
    attributes: ["id", "titulo", "institucion_id"],
  });

  for (const curso of cursosVencidos) {
    const [actualizadas] = await inscripcionesModel.update(
      { estado: "Finalizado" },
      { where: { curso_id: curso.id, estado: { [Op.in]: ["Inscripto", "Cursando"] } } },
    );
    if (actualizadas === 0) continue;

    console.log(`🕓 "${curso.titulo}" terminó: ${actualizadas} alumno(s) pasaron a Finalizado (falta que la institución emita los certificados).`);
    await notificarRepresentantes(curso.institucion_id, {
      tipo: "inscripcion",
      titulo: `Terminó "${curso.titulo}": emití los certificados`,
      mensaje: `${actualizadas} alumno(s) terminaron la cursada. Revisá quién cumplió y emitile su certificado.`,
      url: `alumnos_x_curso.html?id=${curso.id}`,
    }).catch((e) => console.error("Error avisando fin de curso:", e.message));
  }
}

// Corre una vez al iniciar el servidor (por si estuvo apagado varios días) y
// después todos los días a las 3 AM.
export function iniciarTareasProgramadas() {
  finalizarCursosVencidos().catch((e) =>
    console.error("Error en la auto-finalización inicial:", e.message),
  );
  finalizarEncuestasVencidas().catch((e) =>
    console.error("Error finalizando encuestas vencidas:", e.message),
  );

  cron.schedule("0 3 * * *", () => {
    finalizarCursosVencidos().catch((e) =>
      console.error("Error en la auto-finalización programada:", e.message),
    );
    // Encuestas con fecha de cierre vencida: dejan de verse
    finalizarEncuestasVencidas().catch((e) =>
      console.error("Error finalizando encuestas vencidas:", e.message),
    );
  });
}
