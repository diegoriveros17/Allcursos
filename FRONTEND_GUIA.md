# Guía rápida del frontend

El backend, las variables de entorno y las rutas de la API no fueron modificados.

## Dónde editar

- `index.html`: portada, buscador y contenedor del catálogo de cursos.
- `login.html`: pantalla de inicio de sesión.
- `formulario_registro.html`: registro de ciudadano o institución.
- `recuperar_contrasena.html`: recuperación de contraseña.
- `dashboard.html`, `detalles.html`, `alumnos_x_curso.html` y `verificar_certificado.html`: pantallas internas.
- `assets/css/style.css`: todos los estilos visuales. Las variables de color están al principio del archivo.
- `assets/js/`: comportamiento del navegador y llamadas a la API. Conserva los `id` de los formularios si cambiás el HTML, porque JavaScript los utiliza.

## Personalizar colores

En `assets/css/style.css`, editá solo estos valores para cambiar la identidad visual de forma global:

```css
--brand-primary: #1768e8;
--brand-success: #159a63;
--brand-accent: #f3b610;
--text-dark: #14233a;
```

## Ejecutar el proyecto

Usá el mismo comando que ya utilizabas para iniciar el servidor. El frontend sigue consumiendo las rutas existentes a través de `assets/js/api.js` y no requiere cambios en `.env`.
