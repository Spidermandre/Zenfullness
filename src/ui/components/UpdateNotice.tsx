import { shouldOfferUpdate } from '../../pwa/activity';
import { applyPendingUpdate, usePracticing, useUpdateState } from '../../pwa/update';
import { t } from '../strings.it';

/** Discreet offer to reload into a new version. Never shown during a practice. */
export function UpdateNotice() {
  const { needRefresh } = useUpdateState();
  const practicing = usePracticing();
  if (!shouldOfferUpdate(needRefresh, practicing)) return null;
  return (
    <div className="update-notice glass" role="status">
      <span>{t.update.available}</span>
      <button type="button" className="btn glass glass--primary" onClick={applyPendingUpdate}>
        {t.update.apply}
      </button>
    </div>
  );
}
