export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  keepPopupOpen: true,
  tasksEnabled: true,
  routinesEnabled: true,
  tone: 'chime',
  volume: 55,
  popupSeconds: 8,
};

export const reminderSettingsKey = (userId) => `xrynex-reminder-settings:${userId}`;
export const reminderSettingsUpdatedEvent = (userId) => `xrynex-reminder-settings-updated:${userId}`;
export const reminderTestSoundEvent = (userId) => `xrynex-reminder-test-sound:${userId}`;
export const reminderTestNotificationEvent = (userId) => `xrynex-reminder-test-notification:${userId}`;
