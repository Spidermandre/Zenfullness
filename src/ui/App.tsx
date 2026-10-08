import { Blobs } from './components/Blobs';
import { TabBar } from './components/TabBar';
import { UpdateNotice } from './components/UpdateNotice';
import { usePractice } from './practice';
import { useRoute, type Route } from './router';
import { Breath } from './screens/Breath';
import { Placeholder } from './screens/Placeholder';
import { Settings } from './screens/Settings';
import { Sitting } from './screens/Sitting';
import { Soundscape } from './screens/Soundscape';
import { Today } from './screens/Today';
import { Zazen } from './screens/Zazen';
import { t } from './strings.it';

function Screen({ route }: { route: Route }) {
  switch (route) {
    case 'today':
      return <Today />;
    case 'zazen':
      return <Zazen />;
    case 'breath':
      return <Breath practice={undefined} />;
    case 'guided':
      return <Placeholder title={t.tabs.guided} />;
    case 'history':
      return <Placeholder title={t.tabs.history} />;
    case 'settings':
      return <Settings />;
    case 'soundscape':
      return <Soundscape />;
  }
}

export function App() {
  const route = useRoute();
  const practice = usePractice();

  if (practice?.kind === 'sitting') {
    return (
      <div className="app night">
        <Sitting config={practice.config} sitting={practice.sitting} />
      </div>
    );
  }

  if (practice?.kind === 'breath') {
    return (
      <div className="app night breath">
        <Breath key="breath" practice={practice} />
      </div>
    );
  }

  const night = route === 'breath' || route === 'soundscape';
  const tabs = route !== 'settings' && route !== 'soundscape';
  return (
    <div className={night ? 'app night breath' : 'app'}>
      {!night && <Blobs />}
      <UpdateNotice />
      <Screen key={route} route={route} />
      {tabs && <TabBar current={route} night={night} />}
    </div>
  );
}
