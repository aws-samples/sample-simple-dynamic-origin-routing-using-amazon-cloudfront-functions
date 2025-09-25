import { ALBEvent, ALBResult, Context } from 'aws-lambda';

export const handler = async (event: ALBEvent, context: Context): Promise<ALBResult> => {
    // Get origin ID from environment variable
    const originId = process.env.ORIGIN_ID || 'default-origin';

    const headers = {
        'Content-Type': 'application/json',
        'X-Origin-ID': originId,
    };

    // Log the incoming event and context (useful for debugging)
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('Context:', JSON.stringify(context, null, 2));

    // Create the response
    const response: ALBResult = {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Hello from Lambda!',
            'X-Origin-ID': originId,
            timestamp: new Date().toISOString(),
        }),
        isBase64Encoded: false
    };

    console.log('response', response);
    return response;
};
