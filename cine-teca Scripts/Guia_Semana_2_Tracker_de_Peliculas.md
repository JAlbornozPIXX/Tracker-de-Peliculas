# Guía de Trabajo en Equipo: Descubrir y Validar el Producto

**Nombres:** Jairo Albornoz, Sofia Espinosa, Gustavo Espinoza, Benjamín Garrido, Ivan Sanchez

|  |  |  |  |
| --- | --- | --- | --- |
| **Semana 2 | Taller de Desarrollo de Software** | **Resultado:** Necesidad validada | **Entrega:** Fundaciones del producto | **Defensa:** Semana 5 |

**Fecha: 31-08-2026**

**Pregunta rectora:** ¿Qué evidencia demuestra que el problema existe y vale la pena resolverlo?

## 1. Propósito y Resultados Esperados

Al terminar la semana, el equipo debe poder explicar qué aprendió, de quién obtuvo evidencia y qué decisión cambió como consecuencia.

| Elemento | Definición de trabajo |
| --- | --- |
| **Distinguir** | Hechos, supuestos, problemas, necesidades y soluciones. |
| **Investigar** | Usuarios, contexto, alternativas actuales, barreras y consecuencias. |
| **Sintetizar** | Evidencia, patrones, insights y decisiones revisables. |
| **Definir** | Problema, visión, propuesta de valor, alcance, criterios de éxito y riesgos. |

## 2. Acuerdo de Trabajo del Equipo

Reglas operativas, roles y mecanismos observables de coordinación y toma de decisiones.

|  |  |  |  |
| --- | --- | --- | --- |
| **Nombre del producto** | CineTeca | **Integrantes del equipo** | Jairo Albornoz, Sofia Espinosa, Gustavo Espinoza, Benjamín Garrido, Ivan Sanchez |
| **Fecha** | 24-08-2026 | **Roles Principales** | PO: Sofia | Scrum Master: Benjamin | Devs: Ivan, Gustavo, Jairo |

### Reglas Acordadas

| Área | Acuerdo observable | Cómo verificaremos su cumplimiento |
| --- | --- | --- |
| **Comunicación** | Canal oficial centralizado para coordinación técnica y avisos; respuestas en menos de 12 horas en días hábiles. | Confirmación de lectura y registro de acuerdos en el canal de equipo. |
| **Reuniones y coordinación** | Sincronización semanal fija y dailies asincrónicos tres veces por semana en el tablero de trabajo. | Registro de asistencia y minutas breves en el repositorio del proyecto. |
| **Toma de decisiones** | Priorización de producto guiada por la Product Owner (Sofía) y facilitación del Scrum Master (Benjamin); factibilidad técnica evaluada por los desarrolladores. | Registro en la matriz de decisiones del repositorio. |
| **Revisión antes de integrar** | Todo Pull Request requiere la revisión y aprobación de al menos un desarrollador para antes de hacer merge a la rama principal. | Configuración de branch protection y logs de PRs aprobados en GitHub. |
| **Desacuerdos y escalamiento** | Debate técnico fundamentado en criterios de arquitectura y valor; mediación del Scrum Master y consulta docente en caso de bloqueo. | Documentación del caso en la bitácora si requirió mediación formal. |
| **Uso y declaración de IA** | Uso de IA como soporte de desarrollo y documentación; el código debe ser comprendido, testeado y declarado en los commits. | Verificación en revisiones de código y bitácoras individuales. |

### Responsabilidades Iniciales

| Actividad | Responsable | Apoyo | Fecha |
| --- | --- | --- | --- |
| Preparar investigación | Sofia Espinosa | Benjamin Garrido | 24-08-2026 |
| Contactar participantes | Benjamin Garrido | Jairo Albornoz | 25-08-2026 |
| Facilitar sesiones | Benjamin Garrido | Ivan Sanchez | 26-08-2026 |
| Registrar y sintetizar | Gustavo Espinoza | Todos | 27-08-2026 |

## 3. Enmarcar el Problema

| Concepto | Descripción del equipo | Evidencia actual |
| --- | --- | --- |
| **Idea inicial** | Diseñar y desarrollar un tracker de películas íntimo y personal que permita organizar, calificar, analizar y gamificar el hábito cinematográfico. | Inspiración en Letterboxd, Trakt.tv y Spotify Wrapped, adaptado a un enfoque sin presión social de red pública. |
| **Problema observable** | Tener decenas de películas dispersas en múltiples plataformas, olvidar por qué se guardaron, repetir búsquedas y perder tiempo decidiendo qué ver. | Comentarios de usuarios con listas saturadas en blocs de notas y sesiones de streaming donde se invierten más de 15 minutos en navegar catálogos. |
| **Necesidad o resultado** | Un entorno personal centralizado para organizar pendientes, tomar decisiones de visualización rápidas y reflexionar sobre el consumo a través de métricas claras. | Preferencia declarada por herramientas privadas y filtros situacionales (ej. duración y género) antes que algoritmos comerciales. |
| **Solución hipotética** | Tracker de películas con estados de visualización, puntuación precisa (0.25 estrellas), modo ruleta con restricciones, notas privadas, depuración de 'pila de la vergüenza' y resumen anual gamificado. | Prototipos conceptuales presentados y estructuración de historias de usuario orientadas a organización, decisión y memoria. |

### Inventario de Supuestos

| Supuesto | Impacto si es falso | Evidencia necesaria | Pregunta de investigación |
| --- | --- | --- | --- |
| Los usuarios prefieren registrar notas y calificaciones privadas sin la presión social de una red comunitaria. | Alto (obligaría a reorientar la arquitectura hacia feed público y comentarios). | Motivos de abandono de plataformas como Letterboxd reportados por usuarios. | ¿Qué te frena al registrar opiniones o reseñas públicas en apps de cine? |
| La selección al azar con restricciones (modo ruleta) reduce drásticamente el tiempo de indecisión. | Medio (el modo ruleta tendría baja frecuencia de uso). | Aceptación de recomendaciones aleatorias basadas en filtros simples de tiempo/género. | ¿Cómo resuelves el momento en que ninguna opción del catálogo te convence? |
| Tener películas guardadas por más de 6 meses ('lista de la vergüenza') genera fricción mental y necesidad de depuración. | Medio (bastaría con una lista estática sin caducidad ni gestos). | Porcentaje de películas olvidadas en listas personales que el usuario nunca vuelve a abrir. | ¿Qué haces cuando revisas películas que guardaste hace más de medio año? |
| Las estadísticas visuales y el resumen anual tipo Wrapped motivan el registro continuo. | Bajo/Medio (se enfocaría sólo en gestión básica de inventario). | Interés y retención vinculados a paneles de tiempo invertido y mapas de calor. | ¿Revisas habitualmente métricas o resúmenes de consumo en tus plataformas digitales? |

## 4. Usuarios e Interesados

| Actor o rol | Relación con el problema | Qué necesitamos aprender | Acceso |
| --- | --- | --- | --- |
| **Espectador habitual / Estudiante** | Ve películas semanalmente en plataformas de streaming; acumula recomendaciones y sufre fatiga de decisión. | Factores que determinan su elección inmediata y cómo almacena recomendaciones. | Directo (compañeros y entorno universitario). |
| **Cinéfilo / Organizador de maratones** | Consume cine con alta frecuencia; busca clasificar minuciosamente, seguir sagas y escribir notas privadas. | Nivel de granularidad exigido en puntuaciones (0.25 estrellas) y tags temáticos. | Directo (grupos de interés en cine). |
| **Usuario multicuenta de streaming** | Tiene contenido repartido en 3+ plataformas sin un lugar unificado donde recordar qué está viendo o pendiente. | Fricciones al alternar catálogos y cómo gestiona el abandono de títulos. | Directo. |
| **Equipo y Docencia del Taller** | Supervisa el cumplimiento metodológico, rigor de ingeniería, trazabilidad y arquitectura técnica. | Criterios de evaluación, rúbricas de entrega y estándares del marco Scrum. | Semanal en sesiones de cátedra. |

## 5. Plan de Investigación

| Objetivo de aprendizaje | Decisión que podría cambiar |
| --- | --- |
| Identificar cómo registran y rescatan películas pendientes los usuarios en su día a día. | Priorizar sincronización con APIs externas versus ingreso manual simplificado con estados. |
| Determinar si la funcionalidad de selección al azar (ruleta con restricciones) aporta valor real en momentos de parálisis por decisión. | Incluir el modo ruleta en el MVP inicial o relegarlo a una etapa secundaria. |
| Comprender las causas por las cuales los usuarios dejan de registrar su consumo en aplicaciones sociales de cine. | Eliminar totalmente dependencias sociales y reforzar el carácter personal y privado de las fichas. |

### Diseño de las Actividades

| Pregunta | Método | Participantes / fuente | Responsable | Fecha |
| --- | --- | --- | --- | --- |
| ¿Qué barreras existen al gestionar listas de películas? | Entrevista semiestructurada | 5 estudiantes consumidores de streaming | Sofia Espinosa | 25-08-2026 |
| ¿Cómo interactúan los usuarios con sus notas y pendientes actuales? | Observación contextual de notas y apps | 3 cinéfilos frecuentes | Benjamin Garrido | 26-08-2026 |
| ¿Cuánto tiempo se pierde decidiendo qué película ver? | Sondeo rápido de patrones de decisión | 15 espectadores generales | Ivan Sanchez | 26-08-2026 |

## 6. Guión de Entrevista

| Momento | Pregunta o indicación | Qué buscamos aprender |
| --- | --- | --- |
| **Contexto** | ¿Con qué frecuencia ves películas y qué plataformas o medios utilizas? | Contexto general y hábitos de consumo. |
| **Experiencia reciente** | Cuéntame la última vez que te recomendaron una película o guardaste una para ver después. | Hechos reales del flujo de captura de información. |
| **Profundización** | ¿Qué hiciste cuando finalmente te sentaste a verla? ¿La encontraste fácilmente? | Decisiones de búsqueda y pérdida de contexto. |
| **Barreras** | ¿Qué es lo más frustrante al intentar elegir una película cuando tienes tiempo limitado? | Fricciones situacionales y consecuencias de la sobrecarga. |
| **Solución actual** | ¿Cómo registras o recuerdas hoy las películas que ya viste y tu opinión sobre ellas? | Herramientas sustitutas actuales (bloc de notas, memoria, Letterboxd). |
| **Pregunta propia 1** | ¿Qué haces exactamente cuando tienes ganas de ver una película pero ninguna de la portada de streaming te convence? | Validación de la necesidad del modo ruleta y filtros específicos. |
| **Pregunta propia 2** | ¿Alguna vez has querido guardar una opinión o reflexión privada de una película sin sentir la obligación de publicarla en redes? | Validación del valor de la intimidad y notas privadas. |

## 7. Registro de Evidencia

| Sesión | Fecha | Participante / Código | Método | Responsables |
| --- | --- | --- | --- | --- |
| SES-01 | 26-08-2026 | P01 (Estudiante / Consumidor Streaming) | Entrevista semiestructurada | Benjamin Garrido, Ivan Sanchez |

### Notas de la Sesión

| Evidencia observable | Cita o registro | Interpretación e Implicación |
| --- | --- | --- |
| Muestra una lista en la app de notas del teléfono con más de 40 títulos sin categorizar. | *"Tengo decenas de películas guardadas en notas, pero al final nunca las reviso porque no sé cuál dura poco o en qué plataforma está cuando estoy cansado."* | Las listas planas generan fatiga. Se requieren filtros rápidos de duración, género y estado. |
| Probó Letterboxd durante un mes y lo desinstaló. | *"Me daba flojera escribir críticas porque sentía que la gente juzgaba mi opinión o que debía ser un crítico profesional."* | Existe demanda clara de un entorno privado con notas íntimas y calificaciones precisas (0.25 estrellas). |

## 8. Síntesis de Hallazgos

| Patrón o tensión | Evidencias que lo sostienen | Confianza | Qué falta investigar |
| --- | --- | --- | --- |
| Acumulación pasiva y olvido de películas guardadas ("pila de la vergüenza"). | Usuarios reportan listas de más de 30 títulos archivados hace más de 6 meses sin intención real de verlos. | Alta | Comprobar si la limpieza por gestos genera alivio en la experiencia. |
| Interés por resúmenes estadísticos personales sin exposición pública. | Preferencia por reportes tipo Spotify Wrapped pero consumidos individualmente. | Alta | Métricas de mayor valor (géneros, horas totales, actores o directores). |

### Insights y Decisiones

| Insight sustentado | Decisión del equipo | Artefacto afectado | Responsable |
| --- | --- | --- | --- |
| Los usuarios abandonan el registro si requiere escribir reseñas largas o participar en foros. | Focalizar en gestión de estados (Ver más tarde, Viendo, Terminado, Abandonado, Pausado) y notas privadas. | Backlog del producto | Sofia Espinosa |
| La indecisión surge de no poder filtrar por restricciones de tiempo y género inmediatas. | Priorizar el Modo Ruleta con filtros situacionales (menos de 100 min, no vista, género) en el primer ciclo. | Requisitos del sistema | Ivan Sanchez |

## 9. Declaración del Problema

|  |  |
| --- | --- |
| **Usuario principal** | Espectadores habituales y cinéfilos que consumen películas en streaming y otros medios. |
| **Resultado que necesita** | Organizar sus listas pendientes, seleccionar rápidamente qué ver según su contexto y conservar sus impresiones personales. |
| **Evidencia o contexto** | Tienen decenas de títulos dispersos en notas y múltiples catálogos, olvidando qué guardaron y perdiendo más de 15 minutos al elegir. |
| **Barrera actual** | Las plataformas están diseñadas para empujar consumo inmediato de sus propios catálogos y las apps existentes imponen presión social. |
| **Consecuencia** | Detención por decisión, acumulación indefinida de pendientes y pérdida de la memoria cinéfila personal. |

## 10. Visión y Propuesta de Valor

|  |  |
| --- | --- |
| **Usuarios** | Espectadores y cinéfilos que buscan organizar y reflexionar sobre su consumo cinematográfico. |
| **Necesidad** | Centralizar pendientes, resolver la indecisión al elegir y guardar impresiones personales sin juicio externo. |
| **Producto / Categoría** | CineTeca, una plataforma web/móvil de tracking y análisis personal de cine. |
| **Beneficio principal** | Organización centralizada, elección ágil mediante modo ruleta con restricciones y reflexión a través de estadísticas y resúmenes anuales. |
| **Alternativa actual** | Letterboxd, Trakt.tv, blocs de notas y listas nativas de plataformas de streaming. |
| **Diferenciador** | Enfoque íntimo y personal sin presión de red social, escala precisa de calificación de 0.25 estrellas, depuración activa de la 'lista de la vergüenza' y gamificación personal (desafíos y Wrapped). |

## 11. Criterios de Éxito y Alcance

| Criterio | Tipo | Indicador / Evidencia | Umbral | Decisión asociada |
| --- | --- | --- | --- | --- |
| Facilidad de registro de película | Resultado | Tiempo para registrar, calificar y asignar estado. | < 30 segundos (80% usuarios) | Optimizar formulario de carga rápida. |
| Efectividad del Modo Ruleta | Calidad | Número de descartes antes de seleccionar título sugerido. | ≤ 3 descartes (75% casos) | Refinar filtros por duración y género. |
| Estabilidad y cobertura técnica | Actividad / Calidad | Cobertura de tests unitarios en lógica de filtrado y estados. | ≥ 70% cobertura | Integrar validación automática en CI/CD. |

### Límites de Alcance

| Ahora (MVP / Fase 1) | Después (Fase 2) | Fuera (Exclusiones) |
| --- | --- | --- |
| * Catálogo y gestión de estados (Ver más tarde, Viendo, Terminado, Abandonado, Pausado). * Sistema de calificación hasta 5 estrellas con pasos de 0.25 y marcos dorados para 5 estrellas. * Notas privadas y emojis personalizados por película. * Modo Ruleta con restricciones rápidas (género, duración, no vistas). * Listas y carpetas temáticas básicas. | * Módulo 'Pila de la vergüenza' (>6 meses) con limpieza rápida por gestos (swipe). * Panel avanzado de estadísticas (mapa de calor y actividad mensual/anual). * Generador de tarjetas gráficas del resumen anual (Wrapped). * Seguimiento de desafíos y barras de progreso para sagas. | * Red social pública (feed social general, seguidores abiertos, foros de debate). * Reproducción directa o streaming de video. * Integración de compra de entradas de cine o venta de suscripciones. |

## 12. Registro Inicial de Riesgos

| Riesgo | Categoría | Prob. | Impacto | Evidencia / Acción | Responsable |
| --- | --- | --- | --- | --- | --- |
| Límites de cuota o latencia en la API externa de metadatos de cine. | Técnico | Alta | Alto | Implementar capa de caché local y almacenamiento en base de datos. | Ivan Sanchez |
| El modo ruleta resulte poco atractivo si los filtros no son suficientemente específicos. | Producto | Media | Medio | Validar filtros mínimos situacionales con usuarios de prueba. | Sofia Espinosa |
| Sobrecarga de trabajo al intentar implementar el generador de Wrapped en el primer sprint. | Proyecto | Media | Alto | Mover Wrapped y gráficos avanzados a la Fase 2 del backlog. | Benjamin Garrido |
| Exposición accidental de notas o listas privadas de los usuarios. | Seguridad / Privacidad | Baja | Alto | Políticas de seguridad a nivel de fila y autenticación segura. | Gustavo / Jairo |

## 13. Bitácora Individual (Ivan Sanchez)

|  |  |
| --- | --- |
| **Nombre** | Ivan Sanchez |
| **Equipo / Producto** | CineTeca |
| **Periodo Registrado** | Semana 2 (24-08-2026 al 28-08-2026) |

### Registro de Aprendizaje y Contribución

| Pregunta | Respuesta personal |
| --- | --- |
| ¿Qué contribución significativa realicé? | Delimité técnicamente el alcance del MVP frente a fases posteriores, estructuré el inventario de supuestos de búsqueda y formulé la declaración integrada del problema. |
| ¿Qué decisión puedo explicar y justificar? | La postergación del generador de infografías (Wrapped) a la Fase 2 para concentrar los esfuerzos iniciales en la robustez del CRUD de estados y el motor de filtros del modo ruleta. |
| ¿Qué evidencia obtuve o analicé? | Analicé el patrón de fricción de los usuarios al enfrentarse a listas planas en notas del móvil y el tiempo promedio perdido al navegar catálogos sin filtros específicos. |
| ¿Qué revisión hice al trabajo de otra persona? | Revisé el guion de entrevista formulado por Sofia y Benjamin, asegurando preguntas abiertas basadas en comportamientos pasados y eliminando sesgos de aprobación. |
| ¿Qué aprendí o corregí? | Aprendí que el valor central de una herramienta de seguimiento de cine no radica en las funciones comunitarias, sino en la rapidez para decidir qué ver y la privacidad de la memoria cinéfila. |
| ¿Cuál es mi próxima acción? | Diseñar el esquema de base de datos para soportar los 5 estados de películas, notas privadas y la escala de puntuación con precisión de 0.25 estrellas. |

## Anexo: Guión de Información y Consentimiento

|  |  |
| --- | --- |
| **Propósito** | Investigar hábitos, problemas y necesidades al organizar, seleccionar y calificar películas. |
| **Actividad solicitada** | Entrevista individual semiestructurada de 15 a 20 minutos. |
| **Datos que se registrarán** | Notas de respuestas y citas textuales anonimizadas. |
| **Uso previsto** | Fines estrictamente académicos para el Taller de Desarrollo de Software. |
| **Personas con acceso** | Integrantes del equipo de desarrollo y equipo docente. |
| **Lugar y plazo de conservación** | Repositorio privado del equipo, con eliminación al cierre del semestre. |
| **Retiro de participación** | Participación voluntaria; retiro disponible en cualquier momento comunicándose al facilitador. |