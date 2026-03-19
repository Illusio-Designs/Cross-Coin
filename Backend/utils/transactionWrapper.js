/**
 * Transaction Wrapper Utility
 * Provides a clean interface for managing database transactions with automatic rollback on failure
 * Handles connection pooling and ensures proper cleanup
 * 
 * **Validates: Requirements 3.3**
 */

const { sequelize } = require('../config/db.js');
const { Transaction } = require('sequelize');

class TransactionWrapper {
  constructor() {
    this.transaction = null;
    this.isActive = false;
  }

  /**
   * Start a new database transaction
   * @param {Object} options - Transaction options
   * @param {string} options.isolationLevel - Isolation level (default: 'READ_COMMITTED')
   * @returns {Promise<Object>} - Transaction object
   */
  async startTransaction(options = {}) {
    try {
      const {
        isolationLevel = 'READ_COMMITTED'
      } = options;

      // Create transaction with specified isolation level
      this.transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS[isolationLevel]
      });

      this.isActive = true;
      console.log('✅ Transaction started successfully');
      return this.transaction;
    } catch (error) {
      console.error('❌ Error starting transaction:', error.message);
      throw new Error(`Failed to start transaction: ${error.message}`);
    }
  }

  /**
   * Commit the current transaction
   * @returns {Promise<void>}
   */
  async commit() {
    if (!this.transaction || !this.isActive) {
      throw new Error('No active transaction to commit');
    }

    try {
      await this.transaction.commit();
      this.isActive = false;
      this.transaction = null;
      console.log('✅ Transaction committed successfully');
    } catch (error) {
      console.error('❌ Error committing transaction:', error.message);
      // Attempt rollback if commit fails
      await this.rollback().catch(rollbackError => {
        console.error('❌ Error rolling back after commit failure:', rollbackError.message);
      });
      throw new Error(`Failed to commit transaction: ${error.message}`);
    }
  }

  /**
   * Rollback the current transaction
   * @returns {Promise<void>}
   */
  async rollback() {
    if (!this.transaction || !this.isActive) {
      console.warn('⚠️ No active transaction to rollback');
      return;
    }

    try {
      await this.transaction.rollback();
      this.isActive = false;
      this.transaction = null;
      console.log('✅ Transaction rolled back successfully');
    } catch (error) {
      console.error('❌ Error rolling back transaction:', error.message);
      this.isActive = false;
      this.transaction = null;
      throw new Error(`Failed to rollback transaction: ${error.message}`);
    }
  }

  /**
   * Get the current transaction object
   * @returns {Object|null} - Transaction object or null if no active transaction
   */
  getTransaction() {
    return this.isActive ? this.transaction : null;
  }

  /**
   * Check if transaction is active
   * @returns {boolean}
   */
  isTransactionActive() {
    return this.isActive;
  }

  /**
   * Execute a function within a transaction with automatic rollback on error
   * @param {Function} fn - Async function to execute within transaction
   * @returns {Promise<any>} - Result of the function
   */
  async executeInTransaction(fn) {
    try {
      await this.startTransaction();
      const result = await fn(this.transaction);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback().catch(rollbackError => {
        console.error('❌ Error rolling back after execution failure:', rollbackError.message);
      });
      throw error;
    }
  }
}

/**
 * Factory function to create a new transaction wrapper
 * @returns {TransactionWrapper}
 */
function createTransactionWrapper() {
  return new TransactionWrapper();
}

/**
 * Execute a function within a transaction with automatic cleanup
 * @param {Function} fn - Async function to execute within transaction
 * @returns {Promise<any>} - Result of the function
 */
async function withTransaction(fn) {
  const wrapper = createTransactionWrapper();
  return wrapper.executeInTransaction(fn);
}

module.exports = {
  TransactionWrapper,
  createTransactionWrapper,
  withTransaction
};
