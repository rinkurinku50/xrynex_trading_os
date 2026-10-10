export const ECONOMIC_NEWS_ALERT_SETTINGS_KEY = 'economic-news-alert-settings';

export const DEFAULT_ECONOMIC_NEWS_ALERT_SETTINGS = {
  enabled: true,
  soundEnabled: true,
  autoDismissSeconds: 10,
  preReleaseAutoDismissSeconds: 30,
  soundSeconds: 7,
  volume: 70,
};

const autoDismissOptions = [5, 10, 15, 20, 30];
const soundDurationOptions = [5, 7, 10];

export function normalizeEconomicNewsAlertSettings(value) {
  const settings = value && typeof value === 'object' ? value : {};
  const autoDismissValue = settings.autoDismissSeconds;
  const preReleaseAutoDismissValue = settings.preReleaseAutoDismissSeconds;
  const autoDismissSeconds = Number(autoDismissValue);
  const preReleaseAutoDismissSeconds = Number(preReleaseAutoDismissValue);
  const soundSeconds = Number(settings.soundSeconds);
  const volume = Number(settings.volume);

  return {
    enabled: settings.enabled !== false,
    soundEnabled: settings.soundEnabled !== false,
    autoDismissSeconds: autoDismissValue === null || autoDismissValue === 'off'
      ? null
      : autoDismissOptions.includes(autoDismissSeconds) ? autoDismissSeconds : 10,
    preReleaseAutoDismissSeconds: preReleaseAutoDismissValue === null || preReleaseAutoDismissValue === 'off'
      ? null
      : autoDismissOptions.includes(preReleaseAutoDismissSeconds) ? preReleaseAutoDismissSeconds : 30,
    soundSeconds: soundDurationOptions.includes(soundSeconds) ? soundSeconds : 7,
    volume: Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) : 70,
  };
}