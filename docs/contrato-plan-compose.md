# Contrato del plan a partir de un texto (ADR-68)

16 nov 2026. Aprobado por el usuario. Front y back, sin migración ni dependencias. Amplía ADR-08/36 y gasta la cuota de ADR-54.

`POST /v1/plans/compose`: cuenta autenticada (basta `aal1`). Es el único punto en el que el modelo de lenguaje lee texto escrito por la persona.

## Petición

| Campo | Valores |
|---|---|
| `consent` | Booleano. El front envía `true` al pulsar «Enviar»: pulsar es el consentimiento y no hay otro aviso en pantalla. Con `false` responde 403 `consent_required` sin llamar al modelo ni gastar cuota. |
| `text` | Texto de 1 a 300 caracteres tras quitar los espacios de los extremos (`PLAN_TEXT_MAX_CHARS` en los dos repos). |
| `local_hour` | 0 a 23, o `null`. |
| `locale` | `es` o `en`. |

Un campo desconocido, un texto vacío o largo, o una hora fuera de rango responden 422 `invalid_request` sin repetir lo enviado.

## Respuesta 200

| Campo | Valores |
|---|---|
| `goal` | Un id de `goalCatalog.ts` (`relax`, `rest_before_sleep`, `calm_after_activity`, `slow_breathing`, `pause`) o `null`. |
| `duration_minutes` | 10, 15, 20, 30, 45 o 60 (`DURATIONS_MIN`). |
| `world` | Uno de los seis mundos de `worldCatalog.ts`. El mundo fija instrumento, ambiente y textura. |
| `mode` | `adaptive` o `fixed`. |
| `note` | Una frase de hasta 160 caracteres que describe solo el plan, o `null`. |
| `generated` | Siempre `true`. |
| `model` | Nombre del modelo. |

El front vuelve a validar cada campo contra sus propios catálogos; si algo no encaja, no muestra nada y lo trata como `unknown`.

## Errores

| Código | Cuándo |
|---|---|
| 401 `unauthenticated` | Sin token o con uno que no verifica. |
| 403 `consent_required` | `consent` es `false`. |
| 422 `invalid_request` | La petición no tiene la forma descrita. |
| 429 `rate_limited` | La cuenta agotó sus 30 llamadas del día (ADR-54). |
| 502 `language_model_unavailable` | El modelo no respondió, respondió fuera del esquema o eligió algo fuera de los catálogos. |

En cualquier error la pantalla lo dice en una línea y el plan manual sigue igual.

## Lo que se protege

- **El texto no se guarda en ningún sitio.** No toca la base, no pasa por la caché de la API (`cache=False`: cada envío pregunta al modelo y gasta cuota) y no se escribe en ningún registro; los registros solo anotan nombres de campos y tipos de error. El front no lo guarda en el dispositivo: vive en el campo mientras la pantalla está abierta.
- **Inyección de instrucciones.** El texto viaja entre `<person_text>` y `</person_text>`, sin `<` ni `>`, y el modelo recibe la orden de tratarlo como datos. Aunque las siguiera, solo puede devolver valores de los catálogos.
- **Lenguaje.** La frase pasa por el filtro clínico de `assistance.py` y por otro de palabras sobre la persona (sentir, ánimo, estrés, cansancio, «ayudar», «mejor», salud…). Si no pasa, se descarta y el plan llega con `note: null`, sin error: alguien que escribe «me siento mal» nunca lee un comentario sobre cómo está.
- **El modelo no decide la música en vivo** (ADR-05/19): solo propone el plan con que empieza la sesión.
