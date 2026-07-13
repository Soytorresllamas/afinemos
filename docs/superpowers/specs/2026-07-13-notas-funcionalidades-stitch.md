# Notas de funcionalidades — mocks Stitch (Neon Tokyo)

Fuente: `~/Downloads/stitch_vocal_pulse_studio/` (3 pantallas + 2 DESIGN.md).
Los mocks usan el nombre "VocalFlow" — se ignora; el nombre es **Afinemos**.
El sistema visual (Neon Tokyo) ya se aplicó a la app el 2026-07-13.

## Ideas que valen la pena (por fase futura)

### Fase 3 — Entrenamiento de oído (ya planeada en el spec)
- Categoría «Auditivo» con su propio progreso (mock: librería).
- Ejercicio «Intervalos mayores» como juego auditivo con XP.

### Dashboard de progreso (candidato a Fase 3.5 o 4)
- **Racha de días** (mock: «Racha de actividad: 07 días») — ya contemplada en el spec («racha»), el mock da el patrón visual (badge con flama).
- **Actividad semanal**: barras por día separando tipo de ejercicio (vocal vs técnica). Datos ya existen en `SessionRecord`; falta agregación por día.
- **% de dominio por categoría** (mock: PROGRESS_LEVEL por respiración/afinación/vocalización/auditivo) — promedio móvil de calificaciones por tipo de ejercicio.
- **Reto diario** («Sostener Do (C4) — 10 s») con barra de progreso y XP — encaja con el detector de nota sostenida que ya existe.
- **Misión del día**: un ejercicio recomendado según el historial (el peor promedio primero).

### Afinador (mejoras incrementales, cualquier fase)
- **Nota detectada + desviación numérica en cents** como tarjeta de datos (mock: «La4 (A4) · +5 cents») — hoy sólo hay burbuja; el dato numérico es buen segundo nivel de lectura.
- **Consejo contextual** según el error dominante (mock: «Aumenta el apoyo diafragmático para estabilizar el tono»).
- **Sensibilidad del micrófono ajustable** (slider) — mapear a los umbrales RMS/claridad.
- **Tono de referencia configurable** (A4=440 vs otros) — trivial con `A4_FREQ` parametrizable.
- **Vista histórico vs tiempo real** de la sesión de afinación.
- **Visualizador de frecuencia en vivo** (barras estilo ecualizador al pie) — decorativo pero da vida; los datos ya salen del analizador.
- **Trail de pitch tipo cometa** (DESIGN.md de Vocal Resonance): la burbuja deja estela que se desvanece.

### Librería de ejercicios (cuando crezca el catálogo)
- Filtros por nivel (principiante/intermedio/avanzado) y búsqueda.
- **Rutina de calentamiento diaria** (5 ejercicios encadenados) — encaja con «rutinas cortas 5-10 min» del spec de Fase 2; hoy los ejercicios son sueltos.
- Categorías con ícono y progreso (respiración, afinación, vocalización, auditivo).

### Sistema de XP (transversal)
- XP por ejercicio completado (mock: +150/+250 XP). Alternativa ligera a la gamificación; se guarda junto a las sesiones.

## Fuera de alcance (conflicto con el spec — NO incorporar sin decisión explícita)
- **Ranking global / social** (mock: dashboard) — el spec dice «sin cuentas, sin social».
- **Masterclasses en video con entrenadores** (mock: librería) — sin contenido remoto ni grabaciones.
- **Grabar y compartir** (mock: botón GRABAR + share) — grabar localmente podría valer; compartir implica salida de datos, contradice «100 % local». Decidir aparte.
- **Categoría respiración con ejercicios de capacidad pulmonar** — no medible con pitch; requeriría diseño propio (¿RMS sostenido?). Anotado, no prometido.

## Sistema visual aplicado (referencia)
- DESIGN.md raíz (Neon Tokyo) es el que gobierna: `#ff2d78` rosa (CTA/foco), `#00ffcc` cian (datos/secundario), `#ffe04a` amarillo (badges), fondo `#0a0a12`, Sora/Inter/Space Grotesk, glow difuso 12-20px, máx. 2 neones por vista, neón nunca en superficies grandes.
- El DESIGN.md de `vocal_resonance/` es una variante (morado/glassmorphism, Anybody/Plus Jakarta) — NO aplicada; guardar como alternativa.
- Colores semánticos de afinación adaptados a neón manteniendo semántica del spec: afinado `#3dffa0`, cerca `#ffe04a`, lejos `#ff4d5e`.
