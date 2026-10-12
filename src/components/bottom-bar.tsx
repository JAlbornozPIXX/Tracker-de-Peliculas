import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type BottomBarTab = 'home' | 'search' | 'lists' | 'profile';

// Espacio que el contenido con scroll debe dejar libre al final (además del
// inset inferior) para que la barra flotante no tape los últimos elementos.
export const BOTTOM_BAR_SPACE = 112;

const TABS: { key: BottomBarTab; icon: string; label: string }[] = [
  { key: 'home', icon: '⌂', label: 'Inicio' },
  { key: 'search', icon: '⌕', label: 'Descubre' },
  { key: 'lists', icon: '≡', label: 'Listas' },
  { key: 'profile', icon: '●', label: 'Perfil' },
];

export function BottomBar({ active }: { active: BottomBarTab }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Con el teclado abierto la barra quedaría encima de los resultados.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function handlePress(tab: BottomBarTab) {
    if (tab === active) return;
    if (tab === 'home') {
      router.dismissTo('/explore');
    } else if (tab === 'profile') {
      router.push('/profile');
    } else if (active === 'home') {
      router.push(tab === 'search' ? '/search' : '/lists');
    } else {
      // Entre Descubre y Listas se reemplaza la pantalla para que "volver"
      // siempre regrese a Inicio en vez de acumular pantallas.
      router.replace(tab === 'search' ? '/search' : '/lists');
    }
  }

  if (keyboardVisible) return null;

  return (
    <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom + 12, 18) }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            onPress={() => handlePress(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}>
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={isActive ? styles.activeTabText : styles.tabText}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: { position: 'absolute', left: 18, right: 18, bottom: 18, height: 70, borderRadius: 28, backgroundColor: '#29262F', borderWidth: 1, borderColor: '#47414D', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 },
  tab: { alignItems: 'center', justifyContent: 'center', minWidth: 62, gap: 4 },
  activeTab: { backgroundColor: '#403B47', borderRadius: 22, paddingVertical: 8, paddingHorizontal: 13 },
  tabIcon: { color: '#D5D0D8', fontSize: 20, lineHeight: 21 },
  tabText: { color: '#D5D0D8', fontSize: 10, fontWeight: '600' },
  activeTabText: { color: '#B94DFF', fontSize: 10, fontWeight: '800' },
});
