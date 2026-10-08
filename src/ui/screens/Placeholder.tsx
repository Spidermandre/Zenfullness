import { ScreenTitle } from '../components/ScreenTitle';
import { t } from '../strings.it';

/** Temporary screen for sections delivered in later stages. */
export function Placeholder({ title }: { title: string }) {
  return (
    <main className="screen">
      <ScreenTitle>{title}</ScreenTitle>
      <p className="muted screen-lead">{t.placeholder.comingSoon}</p>
    </main>
  );
}
