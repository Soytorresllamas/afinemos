# Afinado — entrenador vocal personal (diseño)

Fecha: 2026-07-12
Estado: aprobado por Marcelo

## Propósito

App personal para aprender a cantar y afinar mejor. Usuario único (Marcelo),
principiante total: no lee partituras ni conoce los nombres de las notas.
La app debe hablar primero en términos visuales (más agudo ↑ / más grave ↓)
y enseñar los nombres de las notas de forma secundaria y gradual.

Sin cuentas, sin servidor, sin monetización.

## Decisiones de alcance

- **Plataforma:** una sola app web responsiva que funcione en la Mac y en el
  teléfono. Instalable como PWA (ícono en el teléfono, funciona sin conexión).
- **Enfoque elegido:** opción A — 100 % del lado del cliente, construida por
  fases usables de forma independiente. Se descartó usar apps existentes
  (opción B) y app nativa (opción C: demasiado esfuerzo para el beneficio).
- **Sin grabaciones comerciales:** el modo canción usa melodías definidas como
  secuencias de notas dentro de la app (dominio público o tradicionales).
  Evita derechos de autor y complejidad de sincronización de audio.

## Arquitectura y stack

- Vite + React + TypeScript (mismo mundo que Cosoteca, sin curva nueva).
- **Entrada de audio:** Web Audio API (`getUserMedia` + `AnalyserNode`).
- **Detección de tono:** librería `pitchy` (algoritmo McLeod / MPM), corriendo
  ~20–30 veces por segundo sobre la señal del micrófono.
- **Tonos de referencia:** Tone.js (sintetizador + pianito de referencia).
- **Persistencia:** IndexedDB local. Exportar/importar progreso como JSON.
- **PWA:** manifest + service worker (precache de la app completa; no hay
  contenido remoto que sincronizar).
- Sin backend, sin base de datos externa, sin variables de entorno secretas.

### Módulos

| Módulo | Responsabilidad |
|---|---|
| `audio/` | captura de micrófono, detección de pitch, umbral de ruido |
| `music/` | lógica pura: frecuencia→nota, desviación en cents, escalas, rango vocal |
| `exercises/` | definición y calificación de ejercicios (precisión + estabilidad) |
| `progress/` | sesiones, historial, racha, export/import (IndexedDB) |
| `ui/` | pantallas y visualización (burbuja de tono, karaoke, juegos de oído) |

`music/` y `exercises/` son módulos puros sin dependencia del navegador:
ahí vive casi toda la lógica testeable.

## Funcionalidad por fases

### Fase 1 — Afinador vocal (el corazón)

- Asistente inicial de **rango vocal**: cantas tu nota cómoda más grave y más
  aguda; todo ejercicio posterior se genera dentro de ese rango.
- Pantalla de afinación: la app toca una nota objetivo; al cantar, una burbuja
  sube o baja según tu tono. Colores: verde = afinado (±25 cents),
  ámbar = cerca (±50 cents), rojo = lejos.
- Lenguaje visual primero («más agudo ↑ / más grave ↓»); el nombre de la nota
  aparece como dato secundario para irlo aprendiendo.

### Fase 2 — Ejercicios guiados

- Rutinas cortas (5–10 min): mantener una nota estable, escalas de 3 y 5
  notas, sirenas (glissandos).
- Dinámica: la app toca → tú repites → calificación por precisión (qué tan
  cerca) y estabilidad (qué tanto tiembla el tono).

### Fase 3 — Entrenamiento de oído

- Juegos sin cantar: «¿cuál nota es más aguda?», imitar intervalos.
- Dificultad progresiva (intervalos grandes → pequeños).

### Fase 4 — Modo canción

- Melodías sencillas (cumpleaños feliz, tradicionales de dominio público)
  como secuencias de notas; vista tipo karaoke con la melodía desplazándose
  y tu tono superpuesto. Transposición automática a tu rango vocal.

## Datos y progreso

- IndexedDB: sesiones (fecha, ejercicio, calificación), rango vocal, racha.
- Exportar/importar JSON manual para respaldo o cambio de dispositivo.

## Casos difíciles

- **Sin permiso de micrófono:** pantalla que explica cómo activarlo por
  navegador; la app no arranca ejercicios sin señal.
- **Ruido de fondo:** umbral de volumen (gate) para ignorar silencio y
  murmullos; sólo se evalúa cuando hay voz clara y pitch con confianza alta
  (pitchy reporta claridad; descartar lecturas por debajo del umbral).
- **Voz grave vs aguda:** todo relativo al rango vocal detectado.
- **iOS/Safari:** el AudioContext sólo puede iniciar tras un gesto del
  usuario → botón explícito «empezar sesión» antes de cualquier audio.

## Pruebas

- Vitest sobre `music/` y `exercises/` (módulos puros): conversión
  frecuencia→nota, cents, generación de ejercicios dentro del rango,
  calificación.
- Detección de pitch: tests con señales sintéticas (una senoidal de 440 Hz
  debe reportar La4 con desviación ~0 cents).
- Lo dependiente de micrófono real y latencia se verifica manualmente en
  Mac y teléfono.

## Fuera de alcance

- Cuentas, sincronización en la nube, social, monetización.
- Análisis de timbre, vibrato avanzado o técnica vocal más allá de afinación.
- Grabaciones o pistas de canciones comerciales.
