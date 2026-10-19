// expo-env.d.ts lo genera Expo y está en .gitignore; esta referencia versionada
// asegura que `tsc` en un clon limpio conozca los tipos globales de Expo
// (*.module.css, imports de efecto secundario de *.css, etc.).
/// <reference types="expo/types" />
