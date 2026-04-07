const PLUGIN_ID = 'screen-graphics';

const ACTIONS = {
  QUEUE_EFFECT: `${PLUGIN_ID}.action.queue_effect`,
  QUEUE_EFFECT_DELAYED: `${PLUGIN_ID}.action.queue_effect_delayed`,
  STOP_CURRENT: `${PLUGIN_ID}.action.stop_current`,
  STOP_ALL: `${PLUGIN_ID}.action.stop_all`,
  CLEAR_QUEUE: `${PLUGIN_ID}.action.clear_queue`,
};

const DATA = {
  EFFECT_NAME: `${PLUGIN_ID}.data.effect_name`,
  DELAYED_EFFECT_NAME: `${PLUGIN_ID}.data.delayed_effect_name`,
  TARGET_DISPLAY: `${PLUGIN_ID}.data.target_display`,
  DELAYED_TARGET_DISPLAY: `${PLUGIN_ID}.data.delayed_target_display`,
  DELAY_SECONDS: `${PLUGIN_ID}.data.delay_seconds`,
};

const STATES = {
  CURRENT_EFFECT: `${PLUGIN_ID}.state.current_effect`,
  QUEUE_LENGTH: `${PLUGIN_ID}.state.queue_length`,
  STATUS: `${PLUGIN_ID}.state.status`,
  DISPLAY_COUNT: `${PLUGIN_ID}.state.display_count`,
};

const IPC = {
  PLAY_EFFECT: 'PLAY_EFFECT',
  STOP_EFFECT: 'STOP_EFFECT',
  STOP_ALL: 'STOP_ALL',
  SHOW_OVERLAY: 'SHOW_OVERLAY',
  HIDE_OVERLAY: 'HIDE_OVERLAY',
  EFFECT_STARTED: 'EFFECT_STARTED',
  EFFECT_FINISHED: 'EFFECT_FINISHED',
  EFFECT_ERROR: 'EFFECT_ERROR',
  READY: 'READY',
  GET_DISPLAYS: 'GET_DISPLAYS',
  DISPLAYS_LIST: 'DISPLAYS_LIST',
  CAPTURE_SCREENSHOT: 'CAPTURE_SCREENSHOT',
  SCREENSHOT_CAPTURED: 'SCREENSHOT_CAPTURED',
};

module.exports = { PLUGIN_ID, ACTIONS, DATA, STATES, IPC };
