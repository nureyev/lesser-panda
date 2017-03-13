import System from 'engine/system';
import { removeItems } from 'engine/utils/array';

/**
 * @class TimerData
 */
class TimerData {
  /**
   * @property {number} elapsed   Time elapsed since start.
   * @readonly
   */
  get elapsed() { return this.duration - this._count; }

  /**
   * @property {number} left  Time left till the end.
   * @readonly
   */
  get left() { return this._count; }

  /**
   * TimerData constructor should not be used directly, use the static methods instead:
   *
   * @constructor
   * @param {number} [ms] Time
   */
  constructor(ms) {
    /**
     * @type {number}
     * @private
     */
    this._count = 0;

    /**
     * Duration of this timer.
     * @type {number}
     * @default 0
     */
    this.duration = 0;

    /**
     * Whether this timer should repeat.
     * @type {boolean}
     * @default false
     */
    this.repeat = false;

    /**
     * Whether this timer is already removed.
     * @type {boolean}
     * @protected
     * @default false
     */
    this.removed = false;

    /**
     * Callback
     * @type {function}
     * @private
     */
    this.callback = null;
    /**
     * Callback context
     * @type {object}
     * @private
     */
    this.callbackCtx = null;

    this.set(ms);
  }

  /**
   * Set duration for timer.
   * @method set
   * @memberof TimerData#
   * @param {number} ms Time to set to
   * @return {TimerData} Self for chaining
   */
  set(ms) {
    if (Number.isFinite(ms)) {
      this.duration = ms;
    }
    else {
      this.duration = 0;
    }
    return this.reset();
  }

  /**
   * Reset timer to current duration.
   * @method reset
   * @memberof TimerData#
   * @return {TimerData} Self for chaining
   */
  reset() {
    this.removed = false;
    this._count = this.duration;
    return this;
  }

  /**
   * Pause timer.
   * @method pause
   * @memberof TimerData#
   * @return {TimerData} Self for chaining
   */
  pause() {
    this.paused = true;
    return this;
  }

  /**
   * Resume paused timer.
   * @method resume
   * @memberof TimerData#
   * @return {TimerData} Self for chaining
   */
  resume() {
    this.paused = false;
    return this;
  }

  /**
   * Update method that is called by timer system.
   * @method update
   * @memberof TimerData#
   * @protected
   * @param  {number} delta Delta time
   */
  update(delta) {
    if (this.removed || this.paused) {return;}

    this._count -= delta;
    if (this._count < 0) {
      this._count = 0;

      if (typeof this.callback === 'function') {
        this.callback.call(this.callbackCtx);
      }

      if (this.repeat && !this.removed) {
        this.reset();
      }
      else {
        this.removed = true;
      }
    }
  }
}

/**
 * TimerData instance pool
 * @type {array<TimerData>}
 * @private
 */
const pool = [];
/**
 * TimerData factory
 * @private
 * @param  {Number} ms  Time in millisecond
 * @return {TimerData}      TimerData instance
 */
function createTimer(ms) {
  let t = pool.pop();
  if (!t) {
    t = new TimerData(ms);
  }
  else {
    t.set(ms);
  }
  return t;
}
/**
 * Recycle a timer instance for later reuse
 * @private
 * @param  {TimerData} timer TimerData instance
 */
function recycleTimer(timer) {
  pool.push(timer);
}

/**
 * TimerData system.
 */
export default class Timer extends System {
  /**
   * @constructor
   */
  constructor() {
    super();

    this.name = 'TimerData';

    this.delta = 0;
    this.now = 0;
    this.timers = {
      '0': [],
    };
    this.activeTags = ['0'];
    this.deactiveTags = [];
  }

  /**
   * Update
   * @memberof Timer#
   * @param {Number} delta Delta time in millisecond
   */
  update(delta) {
    this.delta = delta;

    this.now += delta;

    let i, key, timers;
    for (key in this.timers) {
      if (this.activeTags.indexOf(key) < 0) {continue;}

      timers = this.timers[key];
      for (i = 0; i < timers.length; i++) {
        if (!timers[i].removed) {
          timers[i].update(delta);
        }
        if (timers[i].removed) {
          recycleTimer(timers[i]);
          removeItems(timers, i--, 1);
        }
      }
    }
  }

  /**
   * Create an one-shoot timer.
   * @memberof Timer#
   * @method later
   * @param {number}    wait      Time in milliseconds
   * @param {function}  callback  Callback function to run, when timer ends
   * @param {object}    context   Context of the callback to be invoked
   * @param {string}    [tag]     Tag of this timer, default is '0'
   * @return {TimerData} TimerData instance
   */
  later(wait, callback, context, tag = '0') {
    let timer = createTimer(wait);

    timer.repeat = false;
    timer.callback = callback;
    timer.callbackCtx = context;

    if (!this.timers[tag]) {
      // Create a new timer list
      this.timers[tag] = [];

      // Active new tag by default
      this.activeTags.push(tag);
    }

    if (this.timers[tag].indexOf(timer) < 0) {
      this.timers[tag].push(timer);
    }

    return timer;
  }
  /**
   * Create an one-shoot timer while the time is in seconds instead.
   * @memberof Timer#
   * @method laterSec
   * @param {number}    wait      Time in seconds
   * @param {function}  callback  Callback function to run, when timer ends
   * @param {object}    context   Context of the callback to be invoked
   * @param {string}    [tag]     Tag of this timer, default is '0'
   * @return {TimerData} TimerData instance
   */
  laterSec(wait, callback, context, tag = '0') {
    return this.later(Math.floor(wait * 1000), callback, context, tag);
  }

  /**
   * Create a repeat timer.
   * @memberof Timer#
   * @method interval
   * @param {number}    interval  Time in milliseconds
   * @param {function}  callback  Callback function to run, when timer ends
   * @param {object}    context   Context of the callback to be invoked
   * @param {string}    [tag]     Tag of this timer, default is '0'
   * @return {TimerData} TimerData instance
   */
  interval(interval, callback, context, tag = '0') {
    let timer = createTimer(interval);

    timer.repeat = true;
    timer.callback = callback;
    timer.callbackCtx = context;

    if (!this.timers[tag]) {
      // Create a new timer list
      this.timers[tag] = [];

      // Active new tag by default
      this.activeTags.push(tag);
    }

    if (this.timers[tag].indexOf(timer) < 0) {
      this.timers[tag].push(timer);
    }

    return timer;
  }
  /**
   * Create a repeat timer while the time is in seconds instead.
   * @memberof Timer#
   * @method intervalSec
   * @param {number}    interval  Time in seconds
   * @param {function}  callback  Callback function to run, when timer ends
   * @param {object}    context   Context of the callback to be invoked
   * @param {string}    [tag]     Tag of this timer, default is '0'
   * @return {TimerData} TimerData instance
   */
  intervalSec(interval, callback, context, tag = '0') {
    return this.interval(Math.floor(interval * 1000), callback, context, tag);
  }

  /**
   * Remove a timer.
   * @memberof Timer#
   * @method remove
   * @param {TimerData} timer TimerData to remove
   */
  remove(timer) {
    if (timer) {timer.removed = true;}
  }

  /**
   * Pause timers with a specific tag.
   * @memberof Timer#
   * @method pauseTimersTagged
   * @param  {string} tag Tag of timers to resume
   * @return {Timer} Self for chaining
   */
  pauseTimersTagged(tag) {
    if (this.timers[tag]) {
      removeItems(this.activeTags, this.activeTags.indexOf(tag), 1);
      this.deactiveTags.push(tag);
    }

    return this;
  }

  /**
   * Resume timers with a specific tag.
   * @memberof Timer#
   * @method resumeTimersTagged
   * @param  {string} tag Tag of timers to resume
   * @return {Timer} Self for chaining
   */
  resumeTimersTagged(tag) {
    if (this.timers[tag]) {
      removeItems(this.deactiveTags, this.deactiveTags.indexOf(tag), 1);
      this.activeTags.push(tag);
    }

    return this;
  }
}
