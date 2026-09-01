// src/utils/cron.service.js
//
// Tareas programadas de mantenimiento. Por ahora sólo una: pasar a
// "Finalizado" las inscripciones de cursos cuya fecha_fin ya pasó, para que
// el representante no tenga que hacerlo manualmente alumno por alumno.
// Esto habilita automáticamente la descarga del certificado.

import cron from "node-cron";
import { Op } from "sequelize";
import { cursosModel } from "../models/cursos.model.js";
import { inscripcionesModel } from "../models/inscripciones.model.js";

export async function finalizarCursosVencidos() {
  const hoy = new Date().toISOString().slice(0, 10);

  const cursosVencidos = await cursosModel.findAll({
    where: { fecha_fin: { [Op.lt]: hoy } },
    attributes: ["id", "titulo"],
  });
  if (cursosVencidos.length === 0) return;

  const idsCursos = cursosVencidos.map((c) => c.id);
  const [actualizadas] = await inscripcionesModel.update(
    { estado: "Finalizado" },
    {
      where: {
        curso_id: idsCursos,
        estado: { [Op.in]: ["Inscripto", "Cursando"] },
      },
    },
  );

  if (actualizadas > 0) {
    console.log(
      `🕓 Auto-finalización: se marcaron ${actualizadas} inscripción(es) como Finalizado en ${cursosVencidos.length} curso(s) vencido(s).`,
    );
  }
}

// Corre una vez al iniciar el servidor (por si estuvo apagado varios días) y
// después todos los días a las 3 AM.
export function iniciarTareasProgramadas() {
  finalizarCursosVencidos().catch((e) =>
    console.error("Error en la auto-finalización inicial:", e.message),
  );

  cron.schedule("0 3 * * *", () => {
    finalizarCursosVencidos().catch((e) =>
      console.error("Error en la auto-finalización programada:", e.message),
    );
  });
}
