import { ActiveProfileProvider } from './app/ActiveProfileContext';
import { AppShell } from './app/AppShell';

export function App() {
  return (
    <ActiveProfileProvider>
      <AppShell />
    </ActiveProfileProvider>
  );
}
