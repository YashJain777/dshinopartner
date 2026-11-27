/**
 * Alert Manager Service
 * Centralized global event bus for triggering ultra-modern in-app alerts and dialogs.
 * Drop-in upgrade for React Native's default Alert.alert.
 */

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertButtonConfig {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertConfig {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButtonConfig[];
  cancelable?: boolean;
}

type AlertListener = (config: CustomAlertConfig | null) => void;

let listeners: AlertListener[] = [];

/**
 * Automatically determine the alert variant from title or message keywords
 */
export const detectAlertType = (title = '', message = ''): AlertType => {
  const combined = `${title} ${message}`.toLowerCase();

  if (
    combined.includes('success') ||
    combined.includes('completed') ||
    combined.includes('verified') ||
    combined.includes('approved') ||
    combined.includes('sent successfully')
  ) {
    return 'success';
  }

  if (
    combined.includes('error') ||
    combined.includes('failed') ||
    combined.includes('invalid') ||
    combined.includes('denied') ||
    combined.includes('unable') ||
    combined.includes('rejected') ||
    combined.includes('wrong')
  ) {
    return 'error';
  }

  if (
    combined.includes('warning') ||
    combined.includes('notice') ||
    combined.includes('caution') ||
    combined.includes('required') ||
    combined.includes('attention') ||
    combined.includes('too far') ||
    combined.includes('violation')
  ) {
    return 'warning';
  }

  return 'info';
};

/**
 * Trigger modern custom alert dialog
 */
export const showAppAlert = (
  titleOrConfig: string | CustomAlertConfig,
  message?: string,
  buttons?: AlertButtonConfig[],
  options?: { cancelable?: boolean; type?: AlertType },
) => {
  let config: CustomAlertConfig;

  if (typeof titleOrConfig === 'object') {
    config = {
      type: titleOrConfig.type || detectAlertType(titleOrConfig.title, titleOrConfig.message),
      cancelable: titleOrConfig.cancelable ?? true,
      buttons: titleOrConfig.buttons?.length
        ? titleOrConfig.buttons
        : [{ text: 'OK', style: 'default' }],
      ...titleOrConfig,
    };
  } else {
    config = {
      title: titleOrConfig,
      message,
      type: options?.type || detectAlertType(titleOrConfig, message),
      buttons: buttons?.length ? buttons : [{ text: 'OK', style: 'default' }],
      cancelable: options?.cancelable ?? true,
    };
  }

  listeners.forEach(listener => listener(config));
};

/**
 * Dismiss the currently active alert
 */
export const hideAppAlert = () => {
  listeners.forEach(listener => listener(null));
};

/**
 * Subscribe to alert events (used by AppAlertModal root component)
 */
export const subscribeAppAlert = (listener: AlertListener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};
