'use strict';

const { logger } = require('../config/logging.js');

/**
 * Simple circuit breaker.
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)
 *
 * Usage:
 *   const fshipBreaker = new CircuitBreaker('FShip', { threshold: 3, timeout: 30000 });
 *   const result = await fshipBreaker.call(() => fshipService.createOrder(data));
 */
class CircuitBreaker {
  constructor(name, { threshold = 3, timeout = 30000, resetTimeout = 60000 } = {}) {
    this.name = name;
    this.threshold = threshold;   // failures before opening
    this.timeout = timeout;       // ms to wait before retry in OPEN state
    this.resetTimeout = resetTimeout; // ms before resetting failure count in CLOSED
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info(`[CircuitBreaker:${this.name}] HALF_OPEN — testing recovery`);
      } else {
        throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN — service unavailable`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    if (this.state === 'HALF_OPEN') {
      logger.info(`[CircuitBreaker:${this.name}] CLOSED — service recovered`);
    }
    this.failures = 0;
    this.state = 'CLOSED';
  }

  _onFailure(err) {
    this.failures++;
    this.lastFailure = Date.now();
    logger.warn(`[CircuitBreaker:${this.name}] failure ${this.failures}/${this.threshold}: ${err.message}`);
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      logger.error(`[CircuitBreaker:${this.name}] OPEN — too many failures`);
    }
  }

  get status() { return { name: this.name, state: this.state, failures: this.failures }; }
}

// Singleton breakers for external services
const breakers = {
  fship:    new CircuitBreaker('FShip',    { threshold: 3, timeout: 60000 }),
  razorpay: new CircuitBreaker('Razorpay', { threshold: 3, timeout: 30000 }),
  whatsapp: new CircuitBreaker('WhatsApp', { threshold: 5, timeout: 60000 }),
};

module.exports = { CircuitBreaker, breakers };
