# Taller · Ensamblaje visual

Adaptación del código proporcionado en `swagelok-assembly-builder (2).zip`. Conserva el motor original de ensamblaje y los nueve recursos de imagen, con una nueva interfaz de taller y gestión de proyectos.

## Ejecutar la aplicación

Con Node.js 20 o posterior instalado, abre una terminal en esta carpeta y ejecuta `npm start`. No requiere instalar dependencias. Abre http://127.0.0.1:4174.

En el proyecto CRM principal se usa `npm run dev:assembly` y http://127.0.0.1:4173. La versión anterior sigue disponible en `/clasico/` durante esa vista previa.

Para usarla desde dispositivos diferentes, publica estos archivos estáticos en un servidor HTTPS. Los proyectos son locales a cada navegador; exporta/importa JSON para trasladarlos. No hay sincronización de cuentas.

## Qué se conserva

- Regulador KPR, manómetro PGI, adaptador 400-1-4, unión SS-400-6, tee SS-400-3 y válvulas SS-1RS4 y SS-43GS4.
- Imágenes del catálogo aportado y vistas C1/C2 de las válvulas.
- Ajuste de conexiones NPT, movimiento de grupos conectados, giro y eliminación.
- Tubos rectos y dobleces de 45° y 90°, con propiedades editables.
- Deshacer, rehacer, zoom, rejilla y gestos de desplazamiento del código original.

## Mejoras

- Nueva organización visual: biblioteca, mesa, detalle y materiales.
- Diseño adaptable para computadora, tablet y celular.
- Botones para añadir piezas sin arrastrar; selector del conjunto y botones de puertos para conectar tubos.
- Proyectos con nombre y notas, guardado automático y manual, apertura y eliminación con confirmación.
- Exportación e importación JSON validada antes de modificar el conjunto. Hasta 100 proyectos, 200 piezas por proyecto y archivos de 2 MB.
- CSV de materiales y vista de impresión para guardar como PDF.
- Avisos ante fallos de almacenamiento y protección para no sobrescribir datos locales dañados o cambios de otra pestaña.

## Notas de ingeniería

El catálogo, imágenes, posiciones de puertos y especificaciones corresponden al código aportado. No se han certificado físicamente. KPR y PGI son familias que requieren una configuración completa antes de compra. Los tramos de tubo requieren especificar longitud y espesor. El dibujo no está calibrado como un plano dimensional.

La herramienta no valida presión, temperatura, compatibilidad química o procedimientos de montaje. Consulta los documentos del fabricante y el plano aprobado para la ejecución física.

## Estructura

- `app.js`: motor del código original.
- `workshop.js`: interfaz, proyectos, materiales y integración con el motor.
- `project-data.js`: validación de archivos y consolidación de materiales.
- `styles.css`: estilos originales de piezas y controles.
- `workshop.css`: tema y distribución responsive.
- `assets/`: imágenes aportadas, sin modificaciones.

## Validación

En el repositorio principal: `npm test` ejecuta 11 pruebas que cubren ambos talleres, referencias de archivos, conservación de conexiones y vistas, importaciones inválidas, reutilización de puertos y exportaciones. Compilación y sintaxis JavaScript verificadas. No se realizaron pruebas visuales en navegador ni en dispositivos físicos.

Los JSON del taller conceptual anterior tienen otro formato; se abren en la versión anterior. Esta adaptación usa `taller-visual-v1` y conserva las vistas y conexiones propias de tu motor.
