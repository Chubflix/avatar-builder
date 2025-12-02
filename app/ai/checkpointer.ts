
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

let checkpointerInstance: PostgresSaver | null = null;

export async function getCheckpointer(): Promise<PostgresSaver> {
    console.log('Initializing PostgreSQL checkpointer...');
    if (checkpointerInstance) {
        return checkpointerInstance;
    }

    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        throw new Error('POSTGRES_URL environment variable is not set');
    }

    checkpointerInstance = PostgresSaver.fromConnString(connectionString, {

    });
    await checkpointerInstance.setup();

    console.log('✓ PostgreSQL checkpointer initialized');
    return checkpointerInstance!;
}

/**
 * Cleanup checkpointer connection (mostly a no-op).
 * Vercel serverless automatically handles connection pooling and shutdown.
 */
export async function closeCheckpointer(): Promise<void> {
    checkpointerInstance = null;
}