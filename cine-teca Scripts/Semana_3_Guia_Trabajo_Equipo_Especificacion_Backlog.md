**GUÍA DE TRABAJO EN EQUIPO**

Especificar y priorizar el producto

Semana 3 | Requisitos, aceptación y backlog trazable

|  |  |  |  |
| --- | --- | --- | --- |
| **SEMANA**  **3** | **RESULTADO**  **Backlog trazable** | **ENTRADA**  **Evidencia validada** | **DEFENSA**  **Semana 5** |

|  |
| --- |
| **Pregunta rectora: ¿Cómo convertimos evidencia validada en un producto construible, verificable y defendible?** |

# 1. Propósito y resultados esperados

**La Semana 3 transforma hallazgos y decisiones de alcance en requisitos, aceptación y un backlog priorizado que permita construir una base ejecutable en la Semana 4.**

| **Elemento** | **Definición de trabajo** |
| --- | --- |
| Especificar | Redactar requisitos funcionales, atributos de calidad, restricciones, reglas y escenarios verificables. |
| Trazar | Conectar evidencia, necesidad, requisito, aceptación, ítem de backlog y prueba prevista. |
| Priorizar | Ordenar ítems por valor, aprendizaje, riesgo y dependencias; justificar exclusiones. |
| Preparar | Acordar MVP, Definition of Ready, Definition of Done, estimación y plan de construcción de base ejecutable. |

## Productos de la semana

| **Producto** | **Para qué se utilizará** | **Criterio de suficiencia** |
| --- | --- | --- |
| Catálogo y glosario | Mantener significado común y verificable | Ids estables, fuentes y términos operativos |
| Matriz de trazabilidad | Defender por qué existe cada ítem | La cadena puede seguirse en ambos sentidos |
| Product Backlog priorizado | Seleccionar fundaciones ejecutables | Ítems pequeños, aceptables y ordenados |
| Plan de calidad | Integrar pruebas, seguridad y accesibilidad | Condiciones incluidas en aceptación y Done |

|  |
| --- |
| **Ejemplo TurnoÁgil:** EV-03 → N-01 → RF-01 → AC-01 → PBI-01: la incertidumbre observada se convierte en una señal de carga comprobable. |

# 2. Verificación de insumos de la Semana 2

**No comenzar redactando funcionalidades. Primero confirmar que la evidencia de entrada está identificada, accesible y vinculada a una decisión.**

| **Insumo** | **Estado** | **Ubicación / enlace** | **Decisión o uso en Semana 3** |
| --- | --- | --- | --- |
| *Declaración del problema y visión de CineTeca* | *Validado* | *Guía Semana 2, secciones 9 y 10 / repositorio del equipo* | *Base de las necesidades N-01 a N-05 y del objetivo del MVP* |
| *Registro de evidencia SES-01 (P01)* | *Validado* | *Guía Semana 2, sección 7 / notas anonimizadas del repositorio* | *Origen de EV-01 y EV-02 para RF-01, RF-02 y RF-03* |
| *Síntesis de hallazgos, insights y decisiones* | *Validado* | *Guía Semana 2, sección 8* | *Justifica priorizar gestión de estados y sugerencia filtrada* |
| *Criterios de éxito y umbrales* | *Validado* | *Guía Semana 2, sección 11* | *Se convierten en RNF-01, RNF-02 y RNF-03* |
| *Límites de alcance (Ahora / Después / Fuera)* | *Validado* | *Guía Semana 2, sección 11* | *Define lo que incluye y excluye el MVP* |
| *Registro inicial de riesgos* | *Parcial* | *Guía Semana 2, sección 12* | *Alimenta dependencias, riesgos y SPIKE-01* |

## Decisiones de entrada

| **ID** | **Decisión vigente** | **Evidencia** | **Qué podría hacerla cambiar** |
| --- | --- | --- | --- |
| *D-01* | *Excluir toda función de red social pública (feed, seguidores, foros)* | *EV-02: abandono de Letterboxd por presión social* | *Evidencia de que los usuarios necesitan compartir listas con un círculo cercano* |
| *D-02* | *Postergar Wrapped y estadísticas avanzadas a la Fase 2* | *Riesgo de sobrecarga registrado en Semana 2, sección 12* | *Que el catálogo y el motor de filtros se estabilicen antes de lo previsto* |
| *D-03* | *Incluir la sugerencia filtrada (Modo Ruleta) en el MVP* | *Insight de indecisión superior a 15 minutos al elegir* | *Que el sondeo muestre un uso previsto menor a una vez por mes* |
| *D-04* | *Usar metadatos externos con caché local y alta manual mínima* | *Riesgo R-01 de cuota y latencia de la API* | *Que la API imponga límites incompatibles con el uso académico* |

|  |
| --- |
| **Ejemplo TurnoÁgil:** Una decisión no se vuelve requisito automáticamente: primero se debe identificar la necesidad o restricción que representa. |

# 3. Fuentes y necesidades

**Registrar de dónde proviene cada necesidad. Distinguir lo observado de la interpretación del equipo.**

| **ID** | **Fuente** | **Evidencia o restricción** | **Necesidad / resultado** | **Confianza** |
| --- | --- | --- | --- | --- |
| *N-01* | *EV-01 · SES-01, P01 (entrevista, 26-08-2026)* | *Lista con más de 40 títulos sin categorizar en la app de notas del teléfono* | *Organizar los pendientes en un catálogo con estado, duración y plataforma* | *Alta* |
| *N-02* | *EV-02 · SES-01, P01* | *Desinstaló Letterboxd por sentirse juzgado al publicar reseñas* | *Registrar opinión y notas de forma privada, sin exposición pública* | *Alta* |
| *N-03* | *EV-03 · sondeo de patrones de decisión (15 espectadores)* | *Más de 15 minutos navegando catálogos sin lograr decidir* | *Reducir el tiempo de decisión con una sugerencia acotada al contexto* | *Media* |
| *N-04* | *EV-04 · síntesis de hallazgos, Semana 2, sección 8* | *Listas con más de 30 títulos archivados hace más de seis meses* | *Depurar los pendientes antiguos para mantener la lista confiable* | *Media* |
| *N-05* | *EV-05 · preferencia declarada por resúmenes tipo Wrapped* | *Interés en horas totales y géneros, sin exposición pública* | *Reflexionar sobre el propio consumo mediante métricas personales* | *Baja* |
| *RES-01* | *Riesgo R-01 y contexto académico del taller* | *Cuota y latencia de la API externa de metadatos de cine* | *Operar con caché local, sin dependencia crítica de la API en la demostración* | *Alta* |

## Prueba de necesidad

| **Comprobación** | **Sí / No** | **Evidencia o corrección** |
| --- | --- | --- |
| *¿Cada necesidad se apoya en evidencia registrada y ubicable?* | *Sí* | *N-01 a N-04 referencian evidencia con sesión y fecha* |
| *¿Se distingue lo observado de la interpretación del equipo?* | *Sí* | *La columna de evidencia cita hechos y citas; la necesidad expresa el resultado esperado* |
| *¿La necesidad expresa un resultado y no una solución?* | *Parcial sospechosooooo* | *N-03 se reescribió: de «modo ruleta» a «reducir el tiempo de decisión»* |
| *¿Existe alguna necesidad sin fuente suficiente?* | *Sí* | *N-05 mantiene confianza baja y depende del sondeo pendiente* |

# 4. Identificadores y glosario

**Asegurar que el equipo, el código, las pruebas y la defensa utilicen los mismos términos.**

| **Prefijo** | **Artefacto** | **Convención acordada** | **Ejemplo** |
| --- | --- | --- | --- |
| EV | Evidencia | Registro o síntesis revisable | EV-03 |
| N | Necesidad | Resultado requerido | N-01 |
| RF / RNF / RES | Requisito | Funcional / calidad / restricción | RF-01 |
| AC | Criterio de aceptación | Escenario comprobable | AC-01 |
| PBI / SPIKE | Backlog | Ítem de valor / investigación limitada | PBI-01 |
| T | Prueba prevista | Evidencia de verificación | T-01 |

## Glosario operativo

| **Término** | **Definición acordada** | **Ejemplo / límite** | **Responsable de aclarar** |
| --- | --- | --- | --- |
| *Estado de visualización* | *Etiqueta única y obligatoria de un título: Ver más tarde, Viendo, Terminado, Abandonado o Pausado* | *Un título tiene exactamente un estado; el cambio registra fecha* | *Sofia Espinosa* |
| *Lista de la vergüenza* | *Conjunto de títulos en «Ver más tarde» sin cambio de estado durante 180 días o más* | *No incluye títulos pausados ni Abandonados* | *Sofia Espinosa* |
| *Sugerencia filtrada (Modo Ruleta)* | *Selección aleatoria de un título del catálogo propio, acotada por filtros situacionales* | *Sólo considera títulos no vistos del propio usuario* | *Ivan Sanchez* |
| *Nota privada* | *Texto libre asociado a un título, legible únicamente por su autor* | *Máximo 2.000 caracteres; no se publica ni se comparte* | *Gustavo Espinoza* |
| *Calificación* | *Valor entre 0,25 y 5,00 estrellas en pasos de 0,25* | *5,00 se muestra con marco dorado; no admite el valor 0*  *Posible 0.25* | *Jairo Albornoz* |
| *Estado sin datos* | *Respuesta visible cuando ningún título cumple los filtros aplicados* | *No debe mostrar resultados obsoletos ni una pantalla vacía sin mensaje* | *Benjamín Garrido* |

|  |
| --- |
| **Ejemplo TurnoÁgil:** Definir “carga alta” con una condición operativa evita que una persona la interprete como fila larga y otra como demora estimada. |

# 5. Requisitos funcionales

**Redactar una condición singular, necesaria y verificable. Mantener el vínculo con la necesidad y evitar dictar implementación innecesaria.**

|  |
| --- |
| **Plantilla:** [ID] El producto debe [comportamiento observable] cuando [condición relevante], para satisfacer [necesidad]. |

| **ID** | **Necesidad** | **Requisito funcional** | **Fuente** | **Verificación prevista** |
| --- | --- | --- | --- | --- |
| *RF-01* | *N-01* | *El producto debe registrar un título con estado, duración y plataforma cuando el usuario lo agrega al catálogo, para satisfacer la organización de pendientes* | *EV-01* | *T-01 · prueba de integración del alta de título* |
| *RF-02* | *N-01* | *El producto debe cambiar el estado de un título entre los cinco estados definidos cuando el usuario lo edita, registrando la fecha del cambio* | *EV-01* | *T-02 · prueba unitaria de transición de estados* |
| *RF-03* | *N-02* | *El producto debe guardar una calificación en pasos de 0,25 y una nota privada cuando el usuario marca un título como Terminado* | *EV-02* | *T-03 · prueba unitaria de validación de la escala* |
| *RF-04* | *N-03* | *El producto debe sugerir un único título del catálogo cuando el usuario aplica filtros de duración, género y estado no visto* | *EV-03* | *T-04 · prueba de integración del motor de filtros* |
| *RF-05* | *N-03* | *El producto debe mostrar un estado sin datos indicando la razón cuando ningún título cumple los filtros aplicados* | *EV-03* | *T-05 · prueba de caso límite sin resultados* |
| *RF-06* | *N-04* | *El producto debe listar los títulos en «Ver más tarde» sin cambios durante 180 días o más cuando el usuario abre la revisión de pendientes* | *EV-04* | *T-06 · prueba unitaria del cálculo de antigüedad* |

## Revisión de calidad del requisito

| **Requisito** | **Necesario** | **Singular** | **No ambiguo** | **Factible** | **Verificable** | **Corrección pendiente** |
| --- | --- | --- | --- | --- | --- | --- |
| *RF-01* | *Sí* | *Sí* | *Sí* | *Sí* | *Sí* | *Sin corrección pendiente* |
| *RF-03* | *Sí* | *No* | *Sí* | *Sí* | *Sí* | *Separar calificación y nota privada en RF-03 y RF-03b antes de la Semana 4* |
| *RF-04* | *Sí* | *Sí* | *Parcial* | *Sí* | *Sí* | *Definir «aleatorio» como muestreo uniforme sin repetición en la misma sesión* |
| *RF-05* | *Sí* | *Sí* | *Sí* | *Sí* | *Sí* | *Sin corrección pendiente* |

|  |
| --- |
| **Ejemplo TurnoÁgil:** “El sistema debe ser intuitivo y rápido” mezcla cualidades y no es verificable; separar en requisitos medibles. |

# 6. Calidad, restricciones, seguridad y privacidad

**Los atributos de calidad deben incluir condición, respuesta y medida. Las restricciones deben justificar el límite impuesto.**

| **ID** | **Tipo** | **Condición** | **Respuesta requerida** | **Medida / prueba** | **Fuente** |
| --- | --- | --- | --- | --- | --- |
| *RNF-01* | *Rendimiento* | *Catálogo de hasta 500 títulos con filtros aplicados* | *Devolver la sugerencia en menos de 2 segundos* | *Medición del percentil 95 en T-07 con catálogo de prueba* | *Criterio de éxito, Semana 2* |
| *RNF-02* | *Usabilidad* | *Usuario nuevo registra su primera película* | *Completar título, estado y calificación en menos de 30 segundos* | *Prueba con 5 usuarios: 80% bajo el umbral (T-08)* | *Criterio de éxito, Semana 2* |
| *RNF-03* | *Mantenibilidad* | *Lógica de estados y de filtrado* | *Cobertura de pruebas unitarias igual o superior al 70%* | *Informe de cobertura en integración continua (T-09)* | *Criterio de éxito, Semana 2* |
| *RNF-04* | *Accesibilidad* | *Vistas de catálogo y de sugerencia* | *Contraste mínimo AA y operación completa por teclado* | *Revisión WCAG 2.2 nivel AA (T-10)* | *WCAG 2.2* |
| *RES-01* | *Restricción* | *Datos usados en investigación y demostración* | *Emplear sólo datos sintéticos o anonimizados, sin datos reales de terceros* | *Revisión del conjunto de datos inicial en la revisión cruzada* | *Consentimiento, Semana 2* |
| *RES-02* | *Restricción* | *Dependencia de metadatos externos* | *Funcionar con caché local si la API no responde* | *T-11 · prueba con la API simulada fuera de servicio* | *Riesgo R-01* |
| *SEG-01* | *Seguridad y privacidad* | *Notas privadas y listas del usuario* | *Restringir lectura y escritura al propietario autenticado* | *T-12 · prueba de acceso denegado a otro usuario* | *Riesgo R-04* |

## Revisión de exposición

| **Elemento** | **¿Se necesita?** | **Riesgo** | **Tratamiento / criterio** |
| --- | --- | --- | --- |
| *Correo electrónico del usuario* | *Sí* | *Identificación de la cuenta; filtración a través de registros* | *Cifrado en tránsito y exclusión del correo de los registros* |
| *Notas privadas* | *Sí* | *Exposición de contenido íntimo* | *Seguridad a nivel de fila y acceso exclusivo del propietario (SEG-01)* |
| *Historial de visualización* | *Sí* | *Inferencia de un perfil personal* | *Privado por defecto; sin compartición en el MVP* |
| *Datos reales de terceros* | *No* | *Uso indebido de información personal* | *Excluido por RES-01: sólo datos sintéticos en la demostración* |
| *Ubicación o identificador de dispositivo* | *No* | *Riesgo sin beneficio para la necesidad* | *No se recolecta* |

|  |
| --- |
| **Ejemplo TurnoÁgil:** El caso no usa datos reales para simular realismo: la restricción RES-01 reduce riesgo y complejidad sin afectar la pregunta de aprendizaje. |

# 7. Historias de usuario

**La historia mantiene visible el rol, la capacidad y el beneficio. Complementar con requisitos, reglas y aceptación.**

|  |
| --- |
| **Plantilla:** Como [rol en contexto], quiero [capacidad] para [beneficio o decisión]. |

| **ID** | **Historia** | **Necesidad** | **Requisitos** | **Prioridad inicial** |
| --- | --- | --- | --- | --- |
| *HU-01* | *Como espectador con una lista saturada, quiero registrar una película con su estado y duración para recuperarla después sin volver a buscarla* | *N-01* | *RF-01, RF-02* | *Alta* |
| *HU-02* | *Como cinéfilo, quiero calificar con precisión y escribir una nota privada para conservar mi impresión sin publicarla* | *N-02* | *RF-03, SEG-01* | *Alta* |
| *HU-03* | *Como espectador con poco tiempo, quiero recibir una sugerencia acotada por duración y género para decidir rápido qué ver* | *N-03* | *RF-04, RF-05, RNF-01* | *Alta* |
| *HU-04* | *Como usuario con pendientes antiguos, quiero ver qué guardé hace más de seis meses para depurar mi lista* | *N-04* | *RF-06* | *Media* |
| *HU-05* | *Como usuario constante, quiero ver métricas personales de mi consumo para reflexionar sobre mi hábito* | *N-05* | *Fase 2 (fuera del MVP)* | *Baja* |

## Prueba de valor

| **Historia** | **¿Beneficio observable?** | **¿Mantiene abierta la solución?** | **Corrección** |
| --- | --- | --- | --- |
| *HU-01* | *Sí: el título se recupera con filtros en lugar de una lista plana* | *Sí: no fija formulario ni tecnología* | *Sin corrección* |
| *HU-03* | *Sí: reducción medible del tiempo de decisión* | *Parcial: la palabra «ruleta» sugiere el mecanismo* | *Beneficio reformulado como «decidir rápido»; el mecanismo queda en RF-04* |
| *HU-04* | *Sí: la lista deja de acumular títulos olvidados* | *Sí* | *Fijar 180 días como umbral acordado en el glosario* |
| *HU-05* | *Parcial: el beneficio es reflexivo y difícil de observar en la Semana 4* | *Sí* | *Mantener fuera del MVP hasta contar con datos de uso* |

# 8. Criterios de aceptación y casos límite

**Redactar escenarios normales, alternativos y de error. Una persona ajena al equipo debe poder decidir si el criterio pasa o falla.**

|  |
| --- |
| **Plantilla:** Dado [contexto], cuando [acción o evento], entonces [resultado observable]. |

| **ID** | **PBI / requisito** | **Tipo** | **Dado** | **Cuando** | **Entonces** |
| --- | --- | --- | --- | --- | --- |
| *AC-01* | *PBI-01 / RF-01* | *Normal* | *un usuario autenticado con su catálogo abierto* | *registra un título con estado «Ver más tarde» y duración 155 minutos* | *el título aparece en el catálogo con ese estado y su fecha de alta* |
| *AC-02* | *PBI-01 / RF-02* | *Normal* | *un título en estado «Ver más tarde»* | *el usuario lo cambia a «Viendo»* | *el estado se actualiza y queda registrada la fecha del cambio* |
| *AC-03* | *PBI-01 / RF-01* | *Error* | *un formulario de alta sin título o sin duración* | *el usuario intenta guardar* | *el sistema rechaza el alta e indica el campo faltante* |
| *AC-04* | *PBI-02 / RF-03* | *Normal* | *un título marcado como Terminado* | *el usuario asigna 4,25 estrellas y escribe una nota privada* | *la calificación y la nota quedan guardadas y visibles sólo para él* |
| *AC-05* | *PBI-02 / RF-03* | *Error* | *el usuario intenta ingresar 4,30 estrellas* | *guarda la calificación* | *el sistema rechaza el valor y admite únicamente pasos de 0,25* |
| *AC-06* | *PBI-03 / RF-04* | *Normal* | *un catálogo con títulos no vistos de distintos géneros* | *el usuario pide una sugerencia con duración menor a 100 minutos y género comedia* | *el sistema muestra un único título que cumple ambos filtros* |
| *AC-07* | *PBI-03 / RF-05* | *Alternativo* | *ningún título del catálogo cumple los filtros aplicados* | *el usuario pide una sugerencia* | *el sistema muestra el estado sin datos e indica qué filtro no tuvo resultados* |
| *AC-08* | *PBI-04 / RF-06* | *Límite* | *un título en «Ver más tarde» con exactamente 180 días sin cambios* | *el usuario abre la revisión de pendientes* | *el título aparece en la lista de depuración* |

## Reglas de negocio y bordes

| **ID** | **Regla** | **Límite o excepción** | **Criterios afectados** |
| --- | --- | --- | --- |
| *RN-01* | *Un título tiene exactamente un estado de visualización a la vez* | *No se admiten estados simultáneos ni títulos sin estado* | *AC-01, AC-02* |
| *RN-02* | *La calificación admite valores de 0,25 a 5,00 en pasos de 0,25* | *No se admite el valor 0 ni pasos intermedios* | *AC-04, AC-05* |
| *RN-03* | *La sugerencia sólo considera títulos no vistos del propio catálogo* | *Excluye Terminado, Abandonado y catálogos de otros usuarios* | *AC-06, AC-07* |
| *RN-04* | *La lista de la vergüenza incluye títulos en «Ver más tarde» con 180 días o más sin cambio* | *Excluye Pausado y Abandonado* | *AC-08* |
| *RN-05* | *Una nota privada sólo puede ser leída por su autor* | *Sin excepciones en el MVP; tampoco es visible para el equipo* | *AC-04* |

|  |
| --- |
| **Ejemplo TurnoÁgil:** El camino feliz no basta: el estado sin datos evita que la persona decida usando información obsoleta. |

# 9. Matriz de trazabilidad

**Mantener enlaces estables. Si cambia una evidencia, la matriz debe mostrar qué requisitos, aceptación y backlog revisar.**

| **Evidencia / restricción** | **Necesidad** | **Requisito** | **Criterio** | **PBI** | **Prueba prevista** | **Estado** |
| --- | --- | --- | --- | --- | --- | --- |
| *EV-01* | *N-01* | *RF-01* | *AC-01, AC-03* | *PBI-01* | *T-01* | *Listo* |
| *EV-01* | *N-01* | *RF-02* | *AC-02* | *PBI-01* | *T-02* | *Listo* |
| *EV-02* | *N-02* | *RF-03* | *AC-04, AC-05* | *PBI-02* | *T-03* | *Listo* |
| *EV-02* | *N-02* | *SEG-01* | *AC-04* | *PBI-02* | *T-12* | *En revisión* |
| *EV-03* | *N-03* | *RF-04* | *AC-06* | *PBI-03* | *T-04* | *Listo* |
| *EV-03* | *N-03* | *RF-05* | *AC-07* | *PBI-03* | *T-05* | *Listo* |
| *EV-04* | *N-04* | *RF-06* | *AC-08* | *PBI-04* | *T-06* | *Pendiente* |
| *RES-01 / R-01* | *Operar sin datos reales* | *RES-01, RES-02* | *Incluido en Definition of Done* | *PBI-01 a PBI-04* | *T-11* | *En revisión* |

## Análisis de cambio

| **Cambio posible** | **Artefactos a revisar** | **Responsable** | **Fecha** |
| --- | --- | --- | --- |
| *El sondeo muestra bajo interés en la sugerencia aleatoria* | *N-03, RF-04, RF-05, AC-06, AC-07, PBI-03* | *Sofia Espinosa* | *05-09-2026* |
| *La API de metadatos limita la cuota disponible* | *RES-02, RNF-01, T-11, PBI-01* | *Ivan Sanchez* | *05-09-2026* |
| *El umbral de 180 días resulta arbitrario para los usuarios* | *Glosario, RN-04, RF-06, AC-08* | *Benjamín Garrido* | *08-09-2026* |
| *Se solicita compartir listas con un círculo cercano* | *D-01, SEG-01, alcance del MVP* | *Sofia Espinosa* | *12-09-2026* |

# 10. Ficha de Product Backlog Item

**Cada ítem debe facilitar conversación, decisión y verificación. Duplicar esta ficha para los ítems prioritarios.**

| **Campo** | **Definición del ítem** |
| --- | --- |
| ID y título | *PBI-03 · Sugerencia filtrada de qué ver* |
| Historia / valor | *HU-03: decidir en menos de un minuto qué ver según el tiempo disponible y el género* |
| Evidencia y necesidad | *EV-03 (más de 15 minutos navegando catálogos) → N-03* |
| Incluye | *Filtros de duración, género y estado no visto; sugerencia de un único título; estado sin datos con la razón* |
| No incluye | *Recomendación por afinidad, historial de sugerencias e integración con catálogos de streaming* |
| Requisitos | *RF-04, RF-05, RNF-01, RNF-04, RN-03* |
| Aceptación | *AC-06 (normal) y AC-07 (sin resultados)* |
| Dependencias / riesgos | *Depende del catálogo de PBI-01; riesgo R-02 (filtros insuficientes) y SPIKE-01* |
| Estimación preliminar | *5 puntos · tamaño relativo M* |
| Responsable de aclarar | *Ivan Sanchez, con apoyo de Sofia Espinosa (Product Owner)* |

## Comprobación de preparación

| **Criterio** | **Sí / No** | **Observación** |
| --- | --- | --- |
| *Valor y necesidad identificados y trazables* | *Sí* | *EV-03 → N-03 → RF-04 y RF-05* |
| *Criterios de aceptación redactados y verificables* | *Sí* | *AC-06 y AC-07 revisados por una persona ajena al ítem* |
| *Dependencias conocidas y tratadas* | *Parcial* | *Requiere el catálogo de PBI-01 en un entorno común* |
| *El tamaño permite terminarlo dentro de la semana* | *Sí* | *Estimado en 5 puntos con un corte vertical delgado* |
| *Pruebas previstas definidas* | *Sí* | *T-04 y T-05 con datos sintéticos* |

# 11. División vertical del trabajo

**Dividir por comportamiento de extremo a extremo. Las tareas técnicas pueden existir dentro del ítem, pero no deben sustituir el incremento demostrable.**

| **Capacidad grande** | **Corte vertical** | **Valor / aprendizaje** | **Aceptación mínima** | **Fuera del corte** |
| --- | --- | --- | --- | --- |
| *Gestión completa del catálogo personal* | *PBI-01: alta de un título con estado y duración* | *Habilita toda la trazabilidad y prueba el modelo de datos* | *AC-01, AC-03* | *Edición masiva e importación de listas* |
| *Registro de opinión personal* | *PBI-02: calificación de 0,25 y nota privada de un título terminado* | *Prueba la hipótesis de privacidad (N-02)* | *AC-04, AC-05* | *Emojis personalizados e historial de ediciones* |
| *Decisión asistida* | *PBI-03: sugerencia filtrada con estado sin datos* | *Prueba la hipótesis central de indecisión (N-03)* | *AC-06, AC-07* | *Aprendizaje de preferencias y exclusión por repetición* |
| *Depuración de pendientes* | *PBI-04: lista de títulos con 180 días o más sin cambio* | *Verifica el valor de la limpieza (N-04)* | *AC-08* | *Gestos de deslizamiento y notificaciones* |
| *Reflexión sobre el consumo* | *Fuera del corte de la Semana 4* | *Valor aún no demostrable sin historial de uso* | *No aplica* | *Resumen anual y panel de estadísticas (Fase 2)* |

## Tareas técnicas dentro del item prioritario

| **PBI** | **Tarea** | **Resultado verificable** | **Responsable** |
| --- | --- | --- | --- |
| *PBI-03* | *Definir el contrato del servicio de filtrado (entradas y salidas)* | *Contrato documentado y revisado en el repositorio* | *Ivan Sanchez* |
| *PBI-03* | *Implementar el motor de filtros por duración, género y estado* | *Función con pruebas unitarias en verde (T-04)* | *Ivan Sanchez* |
| *PBI-03* | *Implementar la selección aleatoria sin repetición dentro de la sesión* | *Prueba que verifica la no repetición en diez llamadas* | *Gustavo Espinoza* |
| *PBI-03* | *Construir la vista de sugerencia y el estado sin datos* | *Pantalla operable por teclado con contraste AA (T-05, T-10)* | *Jairo Albornoz* |
| *PBI-03* | *Cargar un conjunto de datos sintéticos de 50 títulos* | *Carga inicial reproducible y sin datos reales (RES-01)* | *Gustavo Espinoza* |
| *PBI-03* | *Configurar el informe de cobertura en la integración continua* | *Cobertura publicada igual o superior al 70% (T-09)* | *Benjamín Garrido* |

|  |
| --- |
| **Ejemplo TurnoÁgil:** “Crear base de datos” no es un incremento de valor; “mostrar carga simulada con estado sin datos y prueba” sí lo es. |

# 12. Priorización y objetivo del MVP

**La prioridad debe poder explicarse mediante valor, aprendizaje, riesgo y dependencia. No convertir la matriz en una fórmula automática.**

| **Orden** | **Ítem** | **Valor** | **Aprendizaje** | **Riesgo reducido** | **Dependencia** | **Justificación** |
| --- | --- | --- | --- | --- | --- | --- |
| *1* | *PBI-01 · Alta de título con estado* | *Alto* | *Medio* | *Alto* | *Ninguna* | *Sin catálogo no existe ningún otro ítem verificable* |
| *2* | *PBI-03 · Sugerencia filtrada* | *Alto* | *Alto* | *Alto* | *PBI-01* | *Prueba la hipótesis central del producto en la Semana 4* |
| *3* | *PBI-02 · Calificación y nota privada* | *Alto* | *Alto* | *Medio* | *PBI-01* | *Valida la hipótesis de privacidad con bajo costo técnico* |
| *4* | *PBI-04 · Lista de la vergüenza* | *Medio* | *Medio* | *Bajo* | *PBI-01* | *Depende del umbral de 180 días, aún sin validar* |
| *5* | *SPIKE-01 · Fuente de metadatos* | *Bajo* | *Alto* | *Alto* | *Ninguna* | *Reduce la incertidumbre de RES-02 antes de comprometer el diseño* |
| *6* | *PBI-05 · Listas y carpetas temáticas* | *Medio* | *Bajo* | *Bajo* | *PBI-01* | *Aporta orden pero no prueba ninguna hipótesis abierta* |
| *7* | *PBI-06 · Panel de estadísticas* | *Bajo* | *Medio* | *Bajo* | *PBI-01, PBI-02* | *Excluido del MVP: requiere historial de uso acumulado* |
| *8* | *PBI-07 · Resumen anual (Wrapped)* | *Bajo* | *Bajo* | *Bajo* | *PBI-06* | *Excluido por riesgo de sobrecarga (decisión D-02)* |

## Objetivo y límites del MVP

| **Elemento** | **Definición** |
| --- | --- |
| Objetivo | *Demostrar que un catálogo personal con estados y una sugerencia filtrada reducen el tiempo de decisión sin exponer socialmente al usuario* |
| Incluye | *PBI-01, PBI-02 y PBI-03 con sus criterios de aceptación y pruebas previstas* |
| Podría incluir | *PBI-04 (lista de la vergüenza), si el equipo cierra antes el corte prioritario* |
| Excluye | *Red social pública, streaming de video, venta de entradas, resumen anual y estadísticas avanzadas* |
| Señal de aprendizaje | *75% de las sugerencias aceptadas con tres descartes o menos y registro completo en menos de 30 segundos* |

# 13. Dependencias, riesgos y spikes

**Cada spike debe tener una pregunta, un límite de tiempo, evidencia de salida y una decisión esperada.**

| **Ítem** | **Dependencia o riesgo** | **Tipo** | **Tratamiento** | **Responsable** | **Fecha** |
| --- | --- | --- | --- | --- | --- |
| *PBI-01* | *Esquema de datos común aún no acordado* | *Dependencia interna* | *Definir el esquema en la primera sesión de la Semana 4* | *Ivan Sanchez* | *01-09-2026* |
| *PBI-01* | *Cuota y latencia de la API de metadatos (R-01)* | *Riesgo técnico* | *Caché local y SPIKE-01 acotado* | *Ivan Sanchez* | *02-09-2026* |
| *PBI-03* | *Filtros insuficientes para el usuario (R-02)* | *Riesgo de producto* | *Validar los filtros mínimos con 5 usuarios antes de cerrar el ítem* | *Sofia Espinosa* | *03-09-2026* |
| *PBI-02* | *Exposición de notas privadas (R-04)* | *Riesgo de seguridad* | *Seguridad a nivel de fila y prueba T-12 incluida en Done* | *Gustavo Espinoza* | *04-09-2026* |
| *Todos* | *Entorno compartido e integración continua no disponibles* | *Dependencia externa* | *Configurar el entorno y la integración continua antes del día 2* | *Benjamín Garrido* | *02-09-2026* |
| *PBI-04* | *Umbral de 180 días sin validar con usuarios* | *Riesgo de producto* | *Confirmar con usuarios; el ítem se mantiene fuera del corte prioritario* | *Sofia Espinosa* | *08-09-2026* |

## Ficha de spike

| **Campo** | **Definición** |
| --- | --- |
| ID y pregunta | *SPIKE-01 · ¿Qué fuente de metadatos de películas permite alta manual y consulta con caché dentro de los límites del proyecto?* |
| Límite | *6 horas de trabajo de dos personas, cerrado el 02-09-2026* |
| Evidencia de salida | *Comparación documentada de dos alternativas con cuotas, latencia medida y ejemplo de respuesta servida desde caché* |
| Decisión esperada | *Elegir la fuente de metadatos y confirmar o descartar RES-02* |
| No es salida suficiente | *Una opinión sin mediciones, o una integración completa sin decisión registrada* |

# 14. Definition of Ready y Definition of Done

**Ready hace visible lo necesario para iniciar. Done integra valor, pruebas, revisión, seguridad, trazabilidad y evidencia individual.**

## Definition of Ready del equipo

| **Criterio** | **Aplica** | **Cómo se comprueba** |
| --- | --- | --- |
| *Valor y necesidad trazables hasta la evidencia* | *Sí* | *La matriz muestra la cadena EV → N → RF → AC → PBI* |
| *Criterios de aceptación verificables por alguien ajeno al ítem* | *Sí* | *Revisión cruzada por otro integrante del equipo* |
| *Reglas de negocio y casos límite identificados* | *Sí* | *Sección de reglas y bordes actualizada* |
| *Dependencias resueltas o con tratamiento acordado* | *Sí* | *Tabla de dependencias con responsable y fecha* |
| *Estimación acordada por el equipo* | *Sí* | *Tamaño relativo registrado en la ficha del ítem* |
| *Requisitos de seguridad y accesibilidad aplicables identificados* | *Sí* | *SEG-01 y RNF-04 referenciados en el ítem* |

## Definition of Done de la unidad

| **Dimensión** | **Condición verificable** | **Evidencia** |
| --- | --- | --- |
| *Funcionalidad* | *Todos los criterios de aceptación del ítem pasan* | *Registro de ejecución de los criterios en el repositorio* |
| *Pruebas* | *Pruebas unitarias y de integración previstas en verde* | *Informe de ejecución de T-01 a T-06* |
| *Cobertura* | *Cobertura igual o superior al 70% en lógica de estados y filtros* | *Informe de cobertura publicado en la integración continua* |
| *Revisión* | *Pull Request aprobado por al menos otro desarrollador* | *Historial de Pull Requests aprobados en el repositorio* |
| *Seguridad y privacidad* | *Acceso a notas restringido al propietario y sin datos reales* | *T-12 aprobada y revisión del conjunto de datos inicial* |
| *Accesibilidad* | *Operación por teclado y contraste AA en las vistas del ítem* | *Lista de verificación WCAG 2.2 nivel AA* |
| *Trazabilidad y evidencia individual* | *Ítem enlazado en la matriz y bitácora individual actualizada* | *Matriz de trazabilidad y bitácoras de la semana* |

|  |
| --- |
| **Ejemplo TurnoÁgil:** PBI-01 no está Done si la pantalla muestra “Alta” pero no contempla datos obsoletos o no existen pruebas reproducibles. |

# 15. Estimación y plan de la Semana 4

**Usar tamaño relativo para seleccionar un objetivo coherente con capacidad y calidad. Si no alcanza, reducir alcance antes que Definition of Done.**

| **Ítem** | **Tamaño relativo** | **Incertidumbre** | **Dependencias** | **¿Seleccionado?** | **Razón** |
| --- | --- | --- | --- | --- | --- |
| *PBI-01 · Alta de título con estado* | *M (5)* | *Media* | *Ninguna* | *Sí* | *Base ejecutable de todo lo demás* |
| *PBI-03 · Sugerencia filtrada* | *M (5)* | *Alta* | *PBI-01* | *Sí* | *Prueba la hipótesis central del MVP* |
| *PBI-02 · Calificación y nota privada* | *S (3)* | *Baja* | *PBI-01* | *Sí* | *Bajo costo y alto valor de aprendizaje* |
| *SPIKE-01 · Fuente de metadatos* | *S (2)* | *Alta* | *Ninguna* | *Sí* | *Acotado a 6 horas; reduce la incertidumbre técnica* |
| *PBI-04 · Lista de la vergüenza* | *S (3)* | *Media* | *PBI-01* | *No* | *Reserva de alcance si queda capacidad disponible* |
| *PBI-06 · Panel de estadísticas* | *L (8)* | *Alta* | *PBI-01, PBI-02* | *No* | *Excede la capacidad de la semana y no prueba ninguna hipótesis* |

## Objetivo de la Semana 4

| **Elemento** | **Acuerdo** |
| --- | --- |
| Objetivo | *Demostrar un corte vertical en el que el usuario registra títulos y recibe una sugerencia filtrada, incluido el estado sin datos* |
| Items | *PBI-01, PBI-03, PBI-02 y SPIKE-01 · 15 puntos comprometidos* |
| Calidad no negociable | *Criterios de aceptación en verde, cobertura igual o superior al 70%, revisión por Pull Request y acceso privado a las notas* |
| Riesgo principal | *Dependencia de la fuente de metadatos (R-01), tratada con SPIKE-01 y caché local* |
| Demostración | *Recorrido en vivo: alta de título, calificación privada y sugerencia filtrada, incluido el caso sin resultados* |

## Plan de trabajo

| **Día / hito** | **Resultado** | **Responsable** | **Revisión** |
| --- | --- | --- | --- |
| *Día 1 · 01-09-2026* | *Esquema de datos acordado y entorno con integración continua* | *Ivan Sanchez* | *Benjamín Garrido* |
| *Día 2 · 02-09-2026* | *SPIKE-01 cerrado con la decisión de fuente de metadatos* | *Ivan Sanchez y Gustavo Espinoza* | *Sofia Espinosa* |
| *Día 3 · 03-09-2026* | *PBI-01 con AC-01 a AC-03 en verde* | *Jairo Albornoz* | *Ivan Sanchez* |
| *Día 4 · 04-09-2026* | *PBI-02 con AC-04, AC-05 y la prueba de privacidad T-12* | *Gustavo Espinoza* | *Jairo Albornoz* |
| *Día 5 · 05-09-2026* | *PBI-03 con AC-06, AC-07 y cobertura publicada* | *Ivan Sanchez* | *Benjamín Garrido* |
| *Día 6 · 08-09-2026* | *Ensayo de la demostración y revisión cruzada de Definition of Done* | *Benjamín Garrido* | *Todo el equipo* |

# 16. Evidencias y revisión cruzada

**La extensión no reemplaza la trazabilidad. Cada evidencia debe tener ubicación, responsable y estado.**

| **Evidencia** | **Estado** | **Ubicación / enlace** | **Responsable** |
| --- | --- | --- | --- |
| Insumos de Semana 2 verificados | *Completo* | *Repositorio del equipo · /docs/semana-2/* | *Ivan Sanchez* |
| Necesidades y fuentes identificadas | *Completo* | */docs/semana-3/necesidades.md* | *Sofia Espinosa* |
| Glosario e identificadores acordados | *Completo* | */docs/semana-3/glosario.md* | *Benjamín Garrido* |
| Requisitos funcionales y de calidad | *Completo* | */docs/semana-3/requisitos.md* | *Ivan Sanchez* |
| Restricciones, seguridad y privacidad | *Completo* | */docs/semana-3/requisitos.md (RNF, RES y SEG)* | *Gustavo Espinoza* |
| Historias y criterios de aceptación | *Completo* | */docs/semana-3/aceptacion.md* | *Sofia Espinosa* |
| Matriz de trazabilidad | *Completo* | */docs/semana-3/trazabilidad.csv* | *Jairo Albornoz* |
| Backlog priorizado y fichas de PBI | *Completo* | *Tablero del repositorio · épica MVP* | *Sofia Espinosa* |
| MVP, dependencias, spikes y estimación | *Completo* | */docs/semana-3/mvp-riesgos.md* | *Benjamín Garrido* |
| Ready, Done y plan de Semana 4 | *Completo* | */docs/semana-3/ready-done.md* | *Benjamín Garrido* |
| Bitácoras individuales | *Parcial* | */docs/semana-3/bitacoras/* | *Cada integrante* |

## Revisión cruzada

| **Criterio** | **Cumple** | **Observación / acción** |
| --- | --- | --- |
| *Cada requisito es verificable por una persona ajena al equipo* | *Sí* | *RF-04 se precisó tras revisar la definición de «aleatorio»* |
| *La matriz de trazabilidad puede recorrerse en ambos sentidos* | *Sí* | *Verificado desde T-05 hacia EV-03* |
| *Los ítems del corte prioritario son verticales y demostrables* | *Sí* | *Ninguno es una tarea técnica aislada* |
| *La prioridad se explica por valor, aprendizaje, riesgo y dependencia* | *Sí* | *Justificación registrada ítem por ítem* |
| *Seguridad, privacidad y accesibilidad están en aceptación y en Done* | *Sí* | *SEG-01 y RNF-04 incluidos en la Definition of Done* |
| *Las exclusiones están justificadas* | *Parcial* | *Falta registrar en el tablero la razón de excluir PBI-05* |

# 17. Bitácora individual

**La evidencia individual muestra comprensión, criterio y responsabilidad. No se evalúa por cantidad de commits o líneas.**

| **Dato** | **Respuesta** |
| --- | --- |
| Nombre | *Ivan Sanchez* |
| Equipo / producto | *CineTeca · Taller de Desarrollo de Software* |
| Periodo | *Semana 3 (31-08-2026 al 04-09-2026)* |

## Registro de aprendizaje y contribución

| **Pregunta** | **Respuesta personal** |
| --- | --- |
| ¿Qué contribución significativa realicé? | *Redacté los requisitos funcionales RF-01 a RF-06 y los atributos de calidad, y construí la matriz de trazabilidad desde la evidencia de la Semana 2 hasta las pruebas previstas.* |
| ¿Qué decisión puedo explicar y justificar? | *Priorizar PBI-03 sobre PBI-04: la sugerencia filtrada prueba la hipótesis central de indecisión, mientras el umbral de 180 días sigue sin validar con usuarios.* |
| ¿Qué evidencia o requisito analicé? | *Analicé EV-03 (más de 15 minutos navegando catálogos) y la convertí en N-03, RF-04 y RF-05, incorporando el caso sin resultados que faltaba en el camino feliz.* |
| ¿Qué revisión hice al trabajo de otra persona? | *Revisé los criterios de aceptación redactados por Sofia y detecté que AC-05 no fijaba el paso de 0,25; se corrigió mediante la regla RN-02.* |
| ¿Qué aprendí o corregí? | *Aprendí que un requisito que mezcla cualidades no es verificable: separé «rápido e intuitivo» en RNF-01 (2 segundos) y RNF-02 (30 segundos) con medidas explícitas.* |
| ¿Cuál es mi próxima acción? | *Cerrar SPIKE-01 sobre la fuente de metadatos y dejar el esquema de datos con el motor de filtros probado antes del día 3 de la Semana 4.* |

## Trazabilidad individual

| **Evidencia** | **Ubicación / enlace** | **Qué demuestra** |
| --- | --- | --- |
| *Requisitos RF-01 a RF-06 y RNF-01 a RNF-04* | */docs/semana-3/requisitos.md* | *Redacción verificable y vinculada a necesidades* |
| *Matriz de trazabilidad* | */docs/semana-3/trazabilidad.csv* | *Cadena completa EV → N → RF → AC → PBI → T* |
| *Ficha de PBI-03* | *Tablero del repositorio · ítem PBI-03* | *Corte vertical con aceptación y estimación* |
| *Revisión de AC-05* | *Comentario de revisión en el tablero* | *Revisión cruzada del trabajo de otra persona* |

# Anexo. Cierre y fuentes

**Antes de finalizar, distingan lo listo, lo pendiente y la decisión que debe resolverse antes de comenzar la construcción.**

## Comprobación final

| **Comprobación** | **Listo** | **Pendiente / responsable** |
| --- | --- | --- |
| *Cada necesidad tiene evidencia identificable* | *Sí* | *Cerrado* |
| *Requisitos funcionales y de calidad verificables* | *Sí* | *Cerrado* |
| *Criterios con casos normales, alternativos y de error* | *Sí* | *Cerrado* |
| *Matriz de trazabilidad completa y recorrible* | *Sí* | *Cerrado* |
| *Backlog priorizado con justificación y MVP acordado* | *Sí* | *Cerrado* |
| *Definition of Ready y Definition of Done acordadas* | *Sí* | *Cerrado* |
| *Decisión previa a construir: fuente de metadatos* | *No* | *SPIKE-01 · Ivan Sanchez · 02-09-2026* |

## Fuentes de referencia

ISO/IEC/IEEE 29148:2018. Requirements engineering. https://www.iso.org/standard/72089.html

Schwaber, K. y Sutherland, J. The Scrum Guide, 2020. https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf

GOV.UK Service Manual. Writing user stories. https://www.gov.uk/service-manual/agile-delivery/writing-user-stories

Cucumber. Gherkin reference. https://cucumber.io/docs/gherkin/reference/

NIST SP 800-218. Secure Software Development Framework 1.1. https://csrc.nist.gov/pubs/sp/800/218/final

W3C. Web Content Accessibility Guidelines (WCAG) 2.2. https://www.w3.org/TR/WCAG22/

|  |
| --- |
| **Transición a la Semana 4:** Construir primero el corte vertical que prueba la hipótesis central. Mantener aceptación, pruebas, seguridad, revisión y trazabilidad dentro de Definition of Done. |