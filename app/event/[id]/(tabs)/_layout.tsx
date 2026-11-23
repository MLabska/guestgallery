import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';

import { colors } from '../../../../src/theme';

// Event tabs: Gallery, Challenges, Event info.
export default function EventTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerLeft: () => (
          <Link
            href="/"
            style={{ marginLeft: 16, fontSize: 17, color: colors.accent, fontWeight: '600' }}
          >
            Home
          </Link>
        ),
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gallery',
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarLabel: 'Challenges',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: 'Event info',
          tabBarLabel: 'Event info',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" size={size} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
