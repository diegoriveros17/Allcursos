// scripts/usuarios_prueba.js
//
// Crea usuarios FALSOS para probar la plataforma, directo en la base de datos.
// No pasan por el código de verificación: quedan con el email ya verificado.
//
// Uso (desde la carpeta del proyecto):
//   node scripts/usuarios_prueba.js                    -> crea 20 estudiantes
//   node scripts/usuarios_prueba.js 50                 -> crea 50 estudiantes
//   node scripts/usuarios_prueba.js 30 --inscribir     -> crea 30 y los anota en los cursos
//   node scripts/usuarios_prueba.js --representantes   -> crea 3 representantes, cada uno con su institución
//   node scripts/usuarios_prueba.js 5 --representantes -> crea 5 representantes
//   node scripts/usuarios_prueba.js --borrar           -> borra TODOS los usuarios de prueba (y sus instituciones)
//
// Todos usan:
//   estudiantes:     prueba1@allcursos.test, prueba2@allcursos.test, ...
//   representantes:  repre1@allcursos.test, repre2@allcursos.test, ...
//   contraseña:      Prueba123
// El dominio ".test" está reservado para pruebas: nunca es un email real,
// así que nadie de verdad recibe correos de estos usuarios.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { sequelize } from "../src/config/database.js";
import {
  personasModel,
  usuariosModel,
  rolesModel,
  direccionesModel,
  cursosModel,
  inscripcionesModel,
  institucionesModel,
  representanteInstituModel,
} from "../src/models/index.js";

const DOMINIO = "@allcursos.test";
const PASSWORD = "Prueba123";
const DNI_ESTUDIANTES = 90000000; // 90.000.001 en adelante: DNIs de prueba que no chocan con DNIs reales
const DNI_REPRESENTANTES = 95000000; // 95.000.001 en adelante
const CUIT_PRUEBA = "99"; // Las instituciones de prueba tienen CUIT 99-xxxxxxxx-0 (no existe en la realidad)

const NOMBRES = ["Lucía", "Martina", "Sofía", "Valentina", "Camila", "Julieta", "Agustina", "Micaela", "Florencia", "Rocío",
  "Mateo", "Santiago", "Thiago", "Benjamín", "Joaquín", "Lautaro", "Tomás", "Facundo", "Nicolás", "Matías",
  "Gabriela", "Daiana", "Natalia", "Brenda", "Carla", "Diego", "Ramón", "Hugo", "Walter", "Alejandro"];
const APELLIDOS = ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "Romero", "Sosa",
  "Benítez", "Acosta", "Ojeda", "Giménez", "Cáceres", "Vera", "Ayala", "Aquino", "Báez", "Ramírez"];
const CIUDADES = ["Formosa", "Formosa", "Formosa", "Clorinda", "Pirané", "El Colorado", "Las Lomitas", "Ingeniero Juárez"];
const BARRIOS = ["San Martín", "Independencia", "Centro", "Villa del Carmen", "Namqom", "La Paz", "Guadalupe", "Eva Perón"];
const CALLES = ["Av. 25 de Mayo", "Av. Gutnisky", "Rivadavia", "Belgrano", "Mitre", "Saavedra", "España", "Moreno"];
const INSTITUCIONES = ["Centro de Formación Profesional N° 1", "Escuela de Oficios San Martín", "Instituto Técnico Clorinda",
  "Centro Comunitario Namqom", "Academia de Idiomas del Norte", "Fundación Aprender Formosa", "Escuela de Capacitación Laboral Pirané",
  "Instituto Superior El Colorado", "Centro Cultural Las Lomitas", "Cooperativa de Trabajo Guadalupe"];
const CARGOS = ["Director/a", "Coordinador/a de cursos", "Secretario/a académico/a", "Responsable de capacitación"];

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const entre = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const fechaNacimiento = (desde = 1975, hasta = 2008) =>
  `${entre(desde, hasta)}-${String(entre(1, 12)).padStart(2, "0")}-${String(entre(1, 28)).padStart(2, "0")}`;

async function buscarRol(nombre) {
  const rol = await rolesModel.findOne({ where: { nombre } });
  if (!rol) throw new Error(`No existe el rol "${nombre}". Arrancá el servidor una vez para que se creen los roles.`);
  return rol;
}

// Número más alto ya usado con ese prefijo (prueba7@... -> 7), para seguir la numeración
async function ultimoNumero(prefijo) {
  const existentes = await usuariosModel.findAll({
    where: { email_login: { [Op.like]: `${prefijo}%${DOMINIO}` } },
    attributes: ["email_login"],
  });
  const patron = new RegExp(`^${prefijo}(\\d+)@`);
  return existentes.reduce((max, u) => Math.max(max, Number(u.email_login.match(patron)?.[1] || 0)), 0);
}

// Crea dirección + persona + usuario (email verificado y aprobado) dentro de una transacción
async function crearUsuario({ rol, email, dni, passwordHash, nombre, apellido, nacimiento, transaction }) {
  const direccion = await direccionesModel.create(
    { calle: azar(CALLES), numero: String(entre(100, 3500)), barrio: azar(BARRIOS), ciudad: azar(CIUDADES), provincia: "Formosa" },
    { transaction },
  );
  const persona = await personasModel.create(
    {
      nombre,
      apellido,
      dni: String(dni),
      dni_verificado: "Verificado",
      telefono: `+54 9 370 4${String(entre(0, 999999)).padStart(6, "0")}`,
      fecha_nacimiento: nacimiento,
      direccion_id: direccion.id,
    },
    { transaction },
  );
  return usuariosModel.create(
    {
      persona_id: persona.id,
      rol_id: rol.id,
      email_login: email,
      password_hash: passwordHash,
      email_verificado: true, // Se saltea el código de verificación
      estado_aprobacion: "aprobado", // Los representantes no esperan la aprobación del administrador
      activo: true,
      // Sin notificaciones por email: así el servidor no intenta mandar correos a direcciones falsas.
      // (Igual ven sus avisos dentro de la plataforma cuando entran)
      acepta_notificaciones: false,
    },
    { transaction },
  );
}

async function crearEstudiantes(cantidad, inscribir) {
  const rol = await buscarRol("ciudadano");
  let numero = await ultimoNumero("prueba");
  const passwordHash = await bcrypt.hash(PASSWORD, 10); // Mismo hash para todos (mucho más rápido)
  const creados = [];

  for (let i = 0; i < cantidad; i++) {
    numero++;
    const nombre = azar(NOMBRES);
    const apellido = azar(APELLIDOS);
    const usuario = await sequelize.transaction((t) =>
      crearUsuario({
        rol,
        email: `prueba${numero}${DOMINIO}`,
        dni: DNI_ESTUDIANTES + numero,
        passwordHash,
        nombre,
        apellido,
        nacimiento: fechaNacimiento(),
        transaction: t,
      }),
    );
    creados.push({ usuario, nombre: `${nombre} ${apellido}` });
  }

  console.log(`\n✅ Se crearon ${creados.length} estudiantes de prueba:`);
  creados.slice(0, 10).forEach((c) => console.log(`   ${c.usuario.email_login.padEnd(28)} ${c.nombre}`));
  if (creados.length > 10) console.log(`   ... y ${creados.length - 10} más`);
  console.log(`\n   Contraseña de todos: ${PASSWORD}`);

  if (inscribir) await inscribirEnCursos(creados.map((c) => c.usuario));
}

// Crea representantes, cada uno con su propia institución ya aprobada (lista para subir cursos)
async function crearRepresentantes(cantidad) {
  const rol = await buscarRol("representante");
  let numero = await ultimoNumero("repre");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const creados = [];

  for (let i = 0; i < cantidad; i++) {
    numero++;
    const nombre = azar(NOMBRES);
    const apellido = azar(APELLIDOS);
    const nombreInstitucion = `${INSTITUCIONES[(numero - 1) % INSTITUCIONES.length]} (prueba ${numero})`;

    const usuario = await sequelize.transaction(async (t) => {
      const u = await crearUsuario({
        rol,
        email: `repre${numero}${DOMINIO}`,
        dni: DNI_REPRESENTANTES + numero,
        passwordHash,
        nombre,
        apellido,
        nacimiento: fechaNacimiento(1965, 1995),
        transaction: t,
      });
      const institucion = await institucionesModel.create(
        { nombre: nombreInstitucion, cuit: `${CUIT_PRUEBA}-${String(numero).padStart(8, "0")}-0`, estado_aprobacion: "aprobado" },
        { transaction: t },
      );
      await representanteInstituModel.create(
        { usuario_id: u.id, institucion_id: institucion.id, cargo: azar(CARGOS) },
        { transaction: t },
      );
      return u;
    });
    creados.push({ usuario, nombre: `${nombre} ${apellido}`, institucion: nombreInstitucion });
  }

  console.log(`\n✅ Se crearon ${creados.length} representantes de prueba (ya aprobados):`);
  creados.forEach((c) => console.log(`   ${c.usuario.email_login.padEnd(24)} ${c.nombre.padEnd(22)} ${c.institucion}`));
  console.log(`\n   Contraseña de todos: ${PASSWORD}`);
}

// Anota a cada estudiante en 1 a 3 cursos al azar, respetando el cupo
async function inscribirEnCursos(usuarios) {
  const cursos = await cursosModel.findAll({ attributes: ["id", "titulo", "cupo_maximo"] });
  if (cursos.length === 0) return console.log("\n⚠️  No hay cursos publicados: no se inscribió a nadie.");

  const ocupados = new Map();
  for (const c of cursos) {
    ocupados.set(c.id, await inscripcionesModel.count({ where: { curso_id: c.id, estado: { [Op.in]: ["Inscripto", "Cursando", "Finalizado"] } } }));
  }

  let total = 0;
  for (const u of usuarios) {
    const elegidos = [...cursos].sort(() => Math.random() - 0.5).slice(0, entre(1, Math.min(3, cursos.length)));
    for (const c of elegidos) {
      if (ocupados.get(c.id) >= c.cupo_maximo) continue; // Curso lleno
      await inscripcionesModel.create({ usuario_id: u.id, curso_id: c.id, estado: Math.random() < 0.5 ? "Inscripto" : "Cursando", contacto_verificado: true });
      ocupados.set(c.id, ocupados.get(c.id) + 1);
      total++;
    }
  }
  console.log(`\n📚 Se hicieron ${total} inscripciones en ${cursos.length} curso(s).`);
}

// Borra todos los usuarios de prueba (estudiantes y representantes) y las instituciones de prueba
async function borrar() {
  const usuarios = await usuariosModel.findAll({ where: { email_login: { [Op.like]: `%${DOMINIO}` } }, attributes: ["id", "persona_id"] });
  const instituciones = await institucionesModel.findAll({ where: { cuit: { [Op.like]: `${CUIT_PRUEBA}-%` } }, attributes: ["id"] });
  if (usuarios.length === 0 && instituciones.length === 0) return console.log("No hay usuarios de prueba para borrar.");

  const personaIds = usuarios.map((u) => u.persona_id);
  const institucionIds = instituciones.map((i) => i.id);
  const personas = personaIds.length ? await personasModel.findAll({ where: { id: personaIds }, attributes: ["direccion_id"] }) : [];
  const direccionIds = personas.map((p) => p.direccion_id).filter(Boolean);

  await sequelize.transaction(async (t) => {
    if (personaIds.length) {
      // Votos de ideas de encuestas (no tienen borrado en cascada)
      await sequelize.query("DELETE FROM encuestas_ideas_votos WHERE persona_id IN (:ids)", { replacements: { ids: personaIds }, transaction: t }).catch(() => {});
      await sequelize.query("UPDATE encuestas_ideas SET persona_id = NULL WHERE persona_id IN (:ids)", { replacements: { ids: personaIds }, transaction: t }).catch(() => {});
    }
    // Consultas que dejaron estos usuarios
    await sequelize.query("DELETE FROM consultas_curso WHERE email LIKE :dominio", { replacements: { dominio: `%${DOMINIO}` }, transaction: t }).catch(() => {});
    // Instituciones de prueba: se borran en cascada sus cursos, inscripciones, encuestas y consultas
    if (institucionIds.length) await institucionesModel.destroy({ where: { id: institucionIds }, transaction: t });
    // Al borrar la persona se borran en cascada su usuario, inscripciones, likes, respuestas, notificaciones...
    if (personaIds.length) await personasModel.destroy({ where: { id: personaIds }, transaction: t });
    if (direccionIds.length) await direccionesModel.destroy({ where: { id: direccionIds }, transaction: t });
  });
  console.log(`🗑️  Se borraron ${usuarios.length} usuario(s) de prueba y ${institucionIds.length} institución(es) de prueba con todos sus datos.`);
}

const args = process.argv.slice(2);
const numeroPedido = Number(args.find((a) => /^\d+$/.test(a)) || 0);
try {
  await sequelize.authenticate();
  sequelize.options.logging = false;
  if (args.includes("--borrar")) {
    await borrar();
  } else if (args.includes("--representantes")) {
    const cantidad = numeroPedido || 3;
    if (cantidad < 1 || cantidad > 50) throw new Error("La cantidad de representantes tiene que ser entre 1 y 50");
    await crearRepresentantes(cantidad);
  } else {
    const cantidad = numeroPedido || 20;
    if (cantidad < 1 || cantidad > 500) throw new Error("La cantidad tiene que ser entre 1 y 500");
    await crearEstudiantes(cantidad, args.includes("--inscribir"));
  }
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
