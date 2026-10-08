import { hrefFor, type Route } from '../router';
import { t } from '../strings.it';

const TABS = [
  { route: 'today', label: t.tabs.today },
  { route: 'zazen', label: t.tabs.zazen },
  { route: 'breath', label: t.tabs.breath },
  { route: 'guided', label: t.tabs.guided },
  { route: 'history', label: t.tabs.history },
] as const satisfies readonly { route: Route; label: string }[];

export function TabBar({ current, night = false }: { current: Route; night?: boolean }) {
  return (
    <nav className={night ? 'tabbar tabbar--night' : 'tabbar'} aria-label={t.tabs.label}>
      <ul>
        {TABS.map((tab) => (
          <li key={tab.route}>
            <a href={hrefFor(tab.route)} aria-current={tab.route === current ? 'page' : undefined}>
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
