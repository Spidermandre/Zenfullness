import { Blobs } from './components/Blobs';
import { TabBar } from './components/TabBar';
import { UpdateNotice } from './components/UpdateNotice';
import { usePractice } from './practice';
import { useRoute, type Route } from './router';
import { Placeholder } from './screens/Placeholder';
import { Zazen } from './screens/Zazen';
import { Settings } from './screens/Settings';
import { Sitting } from './screens/Sitting';
import { Today } from './screens/Today';
import { t } from './strings.it';

function Screen({ route }: { route: Route }) {
  switch (route) {
    case 'today':
      return <Today />;
    case 'zazen':
      return <Zazen />;
    case 'breath':
      return <Placeholder title={t.tabs.breath} />;
    case 'guided':
      return <Placeholder title={t.tabs.guided} />;
    case 'history':
      return <Placeholder title={t.tabs.history} />;
    case 'settings':
      return <Settings />;
  }
}

export function App() {
  const route = useRoute();
  const practice = usePractice();
  if (practice) {
    return (
      <div className="app night">
        <Sitting config={practice.config} sitting={practice.sitting} />
      </div>
    );
  }
  return (
    <div className="app">
      <Blobs />
      <UpdateNotice />
      <Screen key={route} route={route} />
      {route !== 'settings' && <TabBar current={route} />}
    </div>
  );
}
