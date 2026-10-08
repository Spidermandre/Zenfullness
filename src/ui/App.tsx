import { Blobs } from './components/Blobs';
import { TabBar } from './components/TabBar';
import { UpdateNotice } from './components/UpdateNotice';
import { usePractice } from './practice';
import { useRoute, type Route } from './router';
import { Breath } from './screens/Breath';
import { Guided } from './screens/Guided';
import { GuidedPlayer } from './screens/GuidedPlayer';
import { History } from './screens/History';
import { Settings } from './screens/Settings';
import { Sitting } from './screens/Sitting';
import { Soundscape } from './screens/Soundscape';
import { Today } from './screens/Today';
import { Zazen } from './screens/Zazen';

function Screen({ route }: { route: Route }) {
  switch (route) {
    case 'today':
      return <Today />;
    case 'zazen':
      return <Zazen />;
    case 'breath':
      return <Breath practice={undefined} />;
    case 'guided':
      return <Guided />;
    case 'history':
      return <History />;
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
        <Sitting
          config={practice.config}
          sitting={practice.sitting}
          startedAt={practice.startedAt}
        />
      </div>
    );
  }

  if (practice?.kind === 'guided') {
    return (
      <div className="app night">
        <GuidedPlayer
          guided={practice.guided}
          voice={practice.voice}
          ambient={practice.ambient}
          startedAt={practice.startedAt}
        />
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
