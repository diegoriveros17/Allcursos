import { Router } from "express";
import {
    agregarRepresentanteIntu,
    editarRepresentanteIntu,
    eliminarRepresentanteInstitu,
    getTodayRepresentantes,
    idRepresentanteIntu,
} from "../controllers/representantes.inti.controllers.js";

export const representanteIntiRouter = Router();

representanteIntiRouter.post("/representanteIntu", agregarRepresentanteIntu);
representanteIntiRouter.get("/representanteIntu", getTodayRepresentantes);
representanteIntiRouter.delete(
    "/representanteIntu/:id",
    eliminarRepresentanteInstitu,
);
representanteIntiRouter.get("/representanteIntu/:id", idRepresentanteIntu);
representanteIntiRouter.put("/representanteIntu/:id", editarRepresentanteIntu);
