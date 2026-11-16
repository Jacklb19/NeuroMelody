# Contrato de `/v1/melodies` (ADR-66)

Las melodías que la persona guarda desde Escuchar. Una melodía es una semilla, sus elecciones de sonido, su paso y el segundo en que se guardó: no es un dato de salud. Por eso las tres rutas piden una cuenta (token válido, no anónimo), pero **no** segundo factor ni el consentimiento de sincronización de las sesiones.

La API llama a la base con el token de la persona: las políticas RLS vuelven a comprobar que cada melodía es suya, y la de otra cuenta responde igual que una que no existe.

## Forma de una melodía

| Campo | Tipo y rango |
|---|---|
| `id` | UUID (lo genera el dispositivo; va en la ruta al guardar) |
| `name` | Texto de 1 a 60 caracteres, sin espacios al principio ni al final |
| `seed` | Entero de 0 a 2³¹−1 |
| `instrument` | `warm`, `piano` o `bowls` |
| `ambience` | `none`, `rain`, `sea` o `wind` |
| `profile` | `original`, `minimal` o `immersive` |
| `level` | `high`, `intermediate`, `target` o `sleep` |
| `position_seconds` | Entero de 0 a 7200, y como mucho la duración de la pieza |
| `duration_minutes` | 15, 30, 45 o 60 (ADR-67); las guardadas antes de existir valen 30 |
| `music_mix`, `ambience_mix` | Número de 0 a 1 |
| `synthesis_version` | Entero de 1 a 32 767 |
| `created_at`, `updated_at` | Fecha y hora con zona; `updated_at` no es anterior a `created_at` |

No se admite ningún otro campo. El dueño no viaja: es la cuenta del token.

## Rutas

| Método y ruta | Cuerpo | Éxito | Errores propios |
|---|---|---|---|
| `GET /v1/melodies` | — | 200 `{"melodies": [...]}`, de la que cambió más reciente a la más antigua (como mucho 50) | |
| `PUT /v1/melodies/{id}` | La melodía sin `id` | 201 `{"id", "created": true}` si la crea; 200 `{"id", "created": false}` si ya existía | 409 `limit_reached` (la cuenta ya guarda 50); 409 `session_conflict` (el id es de otra cuenta) |
| `DELETE /v1/melodies/{id}` | — | 204 | 404 `not_found` |

Comunes: 401 `unauthenticated`, 422 `invalid_request` y 502 `storage_unavailable`.

**Guardar dos veces no duplica.** Si la melodía existe, la base solo aplica la versión con el `updated_at` más reciente, y solo cambia el nombre y la mezcla: lo que la hace sonar (semilla, sonido, paso y segundo) no cambia.

## Sincronización en el front (`src/features/listen/melodySync.ts`)

1. Primero se envían los borrados que esperan en la cola de la cuenta.
2. Después se pide la lista. Para cada melodía:
   - En los dos lados: gana la de `updated_at` más reciente.
   - Solo en el dispositivo: si la nube la tenía antes (`synced`), se borró en otro dispositivo y se borra aquí; si no, se envía.
   - Solo en la nube: se trae al dispositivo.
3. Con 409 `limit_reached` se deja de enviar; las demás siguen en el dispositivo y la pantalla lo dice.
4. Una API sin la ruta (404 al listar) deja las melodías solo en el dispositivo, sin error.

El registro de lo sincronizado y la cola de borrados viven en `localStorage` por cuenta (`neuromelody.melody-sync.<cuenta>`) y se borran con la cuenta.

## Publicación

Primero se aplican las migraciones `back/supabase/migrations/20261117000000_melodies.sql` y `20261117010000_melody_duration.sql` en Supabase, en ese orden, después se publica el back y por último el front. El front publicado antes que el back funciona igual: las melodías se quedan en el dispositivo.
