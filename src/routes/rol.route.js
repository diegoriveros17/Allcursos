import { Router } from "express";
import {
    agregarRoles,
    borrarRoles,
    editarRoles,
    verPorIdRoles,
    verTodosRoles,
} from "../controllers/rol.controller.js";

export const rolesRoutes = Router();

rolesRoutes.post("/roles", agregarRoles);
rolesRoutes.get("/roles", verTodosRoles);
rolesRoutes.get("/roles/:id", verPorIdRoles);
rolesRoutes.delete("/roles/:id", borrarRoles);
rolesRoutes.put("/roles/:id", editarRoles);