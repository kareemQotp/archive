import { eventBus, EVENTS } from './events.js';
import { utils } from './config.js';

// Transaction States
const TRANSACTION_STATE = {
    PENDING: 'pending',
    EXECUTING: 'executing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    ROLLING_BACK: 'rolling-back',
    ROLLED_BACK: 'rolled-back'
};

/**
 * Represents a single operation in a transaction
 */
class Operation {
    constructor(execute, rollback) {
        this.execute = execute;
        this.rollback = rollback;
        this.state = TRANSACTION_STATE.PENDING;
        this.error = null;
        this.result = null;
    }
}

/**
 * Transaction Manager for handling complex operations
 */
export class TransactionManager {
    constructor() {
        this.operations = [];
        this.state = TRANSACTION_STATE.PENDING;
        this.currentIndex = -1;
        this.transactionId = utils.generateId();
    }

    /**
     * Add an operation to the transaction
     * @param {Function} execute - Execute function
     * @param {Function} rollback - Rollback function
     */
    addOperation(execute, rollback) {
        this.operations.push(new Operation(execute, rollback));
    }

    /**
     * Execute all operations in the transaction
     */
    async execute() {
        if (this.state !== TRANSACTION_STATE.PENDING) {
            throw new Error('Transaction already executed');
        }

        this.state = TRANSACTION_STATE.EXECUTING;
        eventBus.publish(EVENTS.TRANSACTION_STARTED, {
            id: this.transactionId,
            operationCount: this.operations.length
        });

        try {
            // Execute each operation
            for (let i = 0; i < this.operations.length; i++) {
                this.currentIndex = i;
                const operation = this.operations[i];
                
                try {
                    operation.result = await operation.execute();
                    operation.state = TRANSACTION_STATE.COMPLETED;
                    
                    eventBus.publish(EVENTS.OPERATION_COMPLETED, {
                        transactionId: this.transactionId,
                        operationIndex: i,
                        result: operation.result
                    });
                } catch (error) {
                    operation.state = TRANSACTION_STATE.FAILED;
                    operation.error = error;
                    
                    eventBus.publish(EVENTS.OPERATION_FAILED, {
                        transactionId: this.transactionId,
                        operationIndex: i,
                        error
                    });
                    
                    // Roll back all completed operations
                    await this.rollback();
                    throw error;
                }
            }

            this.state = TRANSACTION_STATE.COMPLETED;
            eventBus.publish(EVENTS.TRANSACTION_COMPLETED, {
                id: this.transactionId,
                results: this.operations.map(op => op.result)
            });
            
            return this.operations.map(op => op.result);
        } catch (error) {
            this.state = TRANSACTION_STATE.FAILED;
            eventBus.publish(EVENTS.TRANSACTION_FAILED, {
                id: this.transactionId,
                error
            });
            throw error;
        }
    }

    /**
     * Roll back completed operations
     */
    async rollback() {
        if (this.state === TRANSACTION_STATE.ROLLING_BACK) {
            throw new Error('Transaction already rolling back');
        }

        this.state = TRANSACTION_STATE.ROLLING_BACK;
        eventBus.publish(EVENTS.TRANSACTION_ROLLING_BACK, {
            id: this.transactionId,
            currentIndex: this.currentIndex
        });

        try {
            // Roll back operations in reverse order
            for (let i = this.currentIndex; i >= 0; i--) {
                const operation = this.operations[i];
                if (operation.state === TRANSACTION_STATE.COMPLETED) {
                    try {
                        await operation.rollback(operation.result);
                        operation.state = TRANSACTION_STATE.ROLLED_BACK;
                        
                        eventBus.publish(EVENTS.OPERATION_ROLLED_BACK, {
                            transactionId: this.transactionId,
                            operationIndex: i
                        });
                    } catch (error) {
                        console.error('Rollback failed for operation:', i, error);
                        // Continue rolling back other operations
                    }
                }
            }

            this.state = TRANSACTION_STATE.ROLLED_BACK;
            eventBus.publish(EVENTS.TRANSACTION_ROLLED_BACK, {
                id: this.transactionId
            });
        } catch (error) {
            console.error('Transaction rollback failed:', error);
            throw error;
        }
    }
}

/**
 * Create a new transaction with the given operations
 * @param {Array<Object>} operations - Array of operations
 * @returns {Promise} Transaction result
 */
export async function createTransaction(operations) {
    const transaction = new TransactionManager();
    
    operations.forEach(({ execute, rollback }) => {
        transaction.addOperation(execute, rollback);
    });
    
    return transaction.execute();
}

// Example usage:
/*
const result = await createTransaction([
    {
        execute: async () => {
            // Upload document
            const response = await api.post('/api/documents', formData);
            return response.data;
        },
        rollback: async (document) => {
            // Delete uploaded document
            if (document?.id) {
                await api.delete(`/api/documents/${document.id}`);
            }
        }
    },
    {
        execute: async () => {
            // Update permissions
            const response = await api.post('/api/documents/1/permissions', permissions);
            return response.data;
        },
        rollback: async (permissions) => {
            // Remove added permissions
            if (permissions) {
                await api.delete('/api/documents/1/permissions');
            }
        }
    }
]);
*/
