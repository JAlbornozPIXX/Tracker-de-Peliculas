Desarrollo de
Aplicaciones Móviles
Electivo III - INF-526

Román Gajardo

rpgajardo@ucm.cl

Contenidos

• Programa del Curso
• Evaluaciones
• React Native -  Expo
• Instalación
• Typescript
• Navegación y Componentes Básicos
• Flex - Ejercicios

Programa

• Unidad  1: Visión General y entornos de desarrollo. (React Native)
• Unidad  2: Desarrollo de aplicaciones móviles. (React-Native)
• Unidad  3:  Implementación  de  proyectos  con  dispositivos  móviles

(React-Native)

Evaluaciones

• Evaluación 1 (20%) — 25-09-2026:

• Entrega de Informe con propuesta de desarrollo

• Evaluación 2 (40%) —23-10-2026:

• Presentación  navegación  de  pantallas  y  funcionalidad

mínima(MVP)

• Evaluación 3 (40%) — 27-11-2026:
• Presentación proyecto completo.

React Native

• React Native es un Marco de código abierto para crear aplicaciones de
Android  e  IOS  utilizando  React  y  las  capacidades  nativas  de  la
plataforma de aplicaciones

• Se utiliza Javascript para acceder a las API de la plataforma , así como
para  describir  la  apariencia  y  comportamiento  de  la  UI  mediante
componentes React

Componentes y JSX en React Native

Expo

• Plataforma  sobre  React  Native  que  simplifica  el  setup,  provee  APIs
nativas listas para usar (camara, GPS, notificaciones), y permite probar
sin Xcode ni Android Studio.

Instalación

Instalación

• Instalar una única vez:

npm install --global expo-cli

• Crear un proyecto:

npx create-expo-app@latest projectName

Typescript: Concepto

• TypeScript es un superset de Javascript que agrega tapado estático.
• Esto significa que ahora se puede declarar que tipo de dato espera una

variable, función o componente

• Los errores se detectan en tiempo de desarrollo.

Typescript: Tipos de datos

Typescript: interfaces

• Define  la  forma  de  un  objeto,
es  la  forma  mas  común  de
tipar objetos en React Native

Typescript: Types

• Regla general, se recomienda
usar  interfaces  para  objetos
y  type  para  uniones  o  alias
simples

Typescript: Funciones

• Acepta  funciones  tradicionales  de

javascript y arrow functions

Componentes básicos

• Navegación (layout, slot, hooks)
• View -Image-Text-SafeAreaView-TextInput - Pressable - Style

Navegación

Ejemplo Layout-Slot

Metodos

View

Text

Text

Image

Image

TextInput

TextInput

Pressable

Pressable

Button

Button

ImageBackground

ImageBackground

Iconos-IonIcons

Icons - IonIcons

Icons - FontAwesome

Icons - FontAwesome

StyleSheet

StyleSheet

Propiedades mas comunes

Flex y ejercicios

Flex - JustifyContent

• Controla  como  se  distribuyen  los  hijos  a  lo  largo  del  eje  principal

(dirección de flexDirection)

Flex- AlignItems

• Controlan  como  se  alinean  los  hijos  perpendicularmente  al  eje

principal

Proporción de espacios

• Flex N: define que proporción del espacio disponible ocupa cada hijo

Ejemplo

Instrucciones paso a paso

1.

2.

3.

4.

Contenedor principal: Un View con flex:1, fondo oscuro (#0f1117), padding de 24
y alignItems:'center'.

Avatar: Un componente Image circular de 120×120 usando borderRadius:60. Usa esta URL como
fuente: https://i.pravatar.cc/300.

Nombre: Un Text con el nombre "María González" en blanco, fontSize:24, fontWeight:'bold',
centrado y con marginTop:16.

Bio: Un Text con el texto "Desarrolladora Full Stack · React Native" en gris (#94a3b8), fontSize:14,
centrado.

5. Estadísticas: Un View con flexDirection:'row' y justifyContent:'space-around' que contenga 3

bloques:

◦

◦

◦

"128" — Posts

"4.2K" — Seguidores

"312" — Siguiendo

6.

7.

Cada bloque tiene el número grande y la etiqueta pequeña debajo, centrados.

Botón "Seguir": Un Pressable con fondo morado (#6366f1), borderRadius:12, padding vertical 14,
ancho completo (width:'100%') y texto blanco centrado. Al presionar, debe cambiar su opacidad a 0.7
usando la prop style con función: style={({pressed}) => [styles.boton, pressed &&
{opacity:0.7}]}.

8.

Botón "Mensaje": Similar al anterior pero con fondo transparente, borde de 1px morado y texto morado.

Ejercicio

Ejercicio

• Bajo peso: #38bdf8
• Normal: #4ade80
• Sobrepeso: #facc15
• Obesidad: #f87171

