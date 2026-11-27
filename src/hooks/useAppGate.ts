/**
 * App Gate Hook
 *
 * Checks the startup config before the app is usable. Must ship in the first
 * release — a build without this gate can never be forced to upgrade or be
 * put into maintenance mode once it is on a partner's phone.
 */

import {useState, useEffect, useCallback} from 'react';
import {getAppConfig, AppConfig} from '../services/api/appConfig.api';
import {logger} from '../utils/logger';

export type AppGateStatus = 'CHECKING' | 'OK' | 'UPDATE_REQUIRED' | 'MAINTENANCE';

export interface UseAppGateReturn {
  status: AppGateStatus;
  config: AppConfig | null;
  recheck: () => Promise<void>;
}

export const useAppGate = (): UseAppGateReturn => {
  const [status, setStatus] = useState<AppGateStatus>('CHECKING');
  const [config, setConfig] = useState<AppConfig | null>(null);

  const check = useCallback(async () => {
    setStatus('CHECKING');
    try {
      const result = await getAppConfig();
      setConfig(result);

      if (result.maintenanceMode) {
        setStatus('MAINTENANCE');
      } else if (result.updateRequired) {
        // Gated on updateRequired, not forceUpdate: the backend ORs the admin
        // switch into forceUpdate, so gating on that would lock out partners
        // already running the newest build.
        setStatus('UPDATE_REQUIRED');
      } else {
        setStatus('OK');
      }
    } catch (err) {
      // Fail open. A config endpoint that is down must not stop partners from
      // working — they would have no way past this screen.
      logger.warn('[AppGate] Config check failed, continuing', err);
      setStatus('OK');
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return {status, config, recheck: check};
};
