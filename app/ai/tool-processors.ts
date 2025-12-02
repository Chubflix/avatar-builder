export interface CollectedMetadata {
    jobId?: string;
    [x: string]: unknown;
}
export type ToolParser = { tool: string; callback: (output: any, metadata: CollectedMetadata) => Promise<CollectedMetadata> | CollectedMetadata };

export const processMessage = async (lastMessage: any, toolParsers: ToolParser[], collectedMetaData: CollectedMetadata): Promise<CollectedMetadata> => {
    for (const toolCall of lastMessage.tool_calls || []) {
        for (const toolParser of toolParsers) {
            if (toolCall.name === toolParser.tool) {
                console.log(`Processing tool output for ${toolCall.name}`);
                collectedMetaData = await toolParser.callback(toolCall.output, collectedMetaData);
            }
        }
    }
    return collectedMetaData;
}

export const toolParsers: ToolParser[] = [
    {
        tool: 'generate_avatar',
        callback: async (output, metadata) => {
            const jobId: string = output.content?.jobId;
            if (jobId) {
                return {...metadata, jobId};
            }
            return metadata;
        }
    }
];