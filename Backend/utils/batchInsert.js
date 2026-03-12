/**
 * Batch Insert Utility
 * Provides efficient bulk insert operations using Sequelize bulkCreate
 * Reduces database round-trips and improves performance by 5-10x
 */

const { sequelize } = require('../config/db');

/**
 * Batch insert records into a table
 * Uses Sequelize bulkCreate for efficient bulk operations
 * 
 * @param {Object} model - Sequelize model to insert into
 * @param {Array} records - Array of record objects to insert
 * @param {Object} options - Options for bulk insert
 *   - batchSize: Number of records per batch (default: 100)
 *   - transaction: Sequelize transaction object (optional)
 *   - ignoreDuplicates: Whether to ignore duplicate key errors (default: false)
 *   - updateOnDuplicate: Array of fields to update on duplicate (default: [])
 * @returns {Promise<Array>} - Array of created records
 */
async function batchInsert(model, records, options = {}) {
  const {
    batchSize = 100,
    transaction = null,
    ignoreDuplicates = false,
    updateOnDuplicate = []
  } = options;

  if (!records || records.length === 0) {
    return [];
  }

  console.log(`📦 Batch inserting ${records.length} records into ${model.name} (batch size: ${batchSize})`);

  const createdRecords = [];
  const startTime = Date.now();

  try {
    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(records.length / batchSize);

      console.log(`  Batch ${batchNumber}/${totalBatches}: Inserting ${batch.length} records...`);

      const bulkCreateOptions = {
        transaction,
        validate: false, // Skip validation for performance
        individualHooks: false, // Skip individual hooks for performance
        returning: true
      };

      // Add duplicate handling if specified
      if (ignoreDuplicates) {
        bulkCreateOptions.ignoreDuplicates = true;
      }

      if (updateOnDuplicate && updateOnDuplicate.length > 0) {
        bulkCreateOptions.updateOnDuplicate = updateOnDuplicate;
      }

      const batchResults = await model.bulkCreate(batch, bulkCreateOptions);
      createdRecords.push(...batchResults);

      console.log(`  ✅ Batch ${batchNumber}/${totalBatches}: ${batchResults.length} records inserted`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Batch insert complete: ${createdRecords.length} records in ${duration}ms`);

    return createdRecords;
  } catch (error) {
    console.error(`❌ Error during batch insert:`, error);
    throw error;
  }
}

/**
 * Batch insert with transaction support
 * Wraps batch insert in a transaction for ACID compliance
 * 
 * @param {Object} model - Sequelize model to insert into
 * @param {Array} records - Array of record objects to insert
 * @param {Object} options - Options for bulk insert (see batchInsert)
 * @returns {Promise<Array>} - Array of created records
 */
async function batchInsertWithTransaction(model, records, options = {}) {
  const transaction = await sequelize.transaction();

  try {
    const createdRecords = await batchInsert(model, records, {
      ...options,
      transaction
    });

    await transaction.commit();
    return createdRecords;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Batch insert multiple models in a single transaction
 * Useful for inserting related records atomically
 * 
 * @param {Array} operations - Array of {model, records, options} objects
 * @returns {Promise<Object>} - Object with results for each model
 */
async function batchInsertMultiple(operations) {
  const transaction = await sequelize.transaction();
  const results = {};

  try {
    for (const { model, records, options = {} } of operations) {
      console.log(`📦 Batch inserting ${records.length} records into ${model.name}...`);
      
      const createdRecords = await batchInsert(model, records, {
        ...options,
        transaction
      });

      results[model.name] = createdRecords;
    }

    await transaction.commit();
    console.log(`✅ All batch inserts completed successfully`);
    return results;
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Error during multi-model batch insert:`, error);
    throw error;
  }
}

module.exports = {
  batchInsert,
  batchInsertWithTransaction,
  batchInsertMultiple
};
