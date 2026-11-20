import { Link, Tabs } from 'expo-router';

// Event tabs: Gallery, Challenges, Event info.
export default function EventTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerLeft: () => (
          <Link href="/" style={{ marginLeft: 16, fontSize: 16, color: '#0a58ca' }}>
            Home
          </Link>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Gallery', tabBarLabel: 'Gallery' }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges', tabBarLabel: 'Challenges' }} />
      <Tabs.Screen name="info" options={{ title: 'Event info', tabBarLabel: 'Event info' }} />
    </Tabs>
  );
}
