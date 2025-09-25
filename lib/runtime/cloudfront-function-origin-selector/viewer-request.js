import cf from 'cloudfront';

const HEADER_KEY = 'x-origin-id' // Cloudfront Function get headers lowercased
const DEFAULT = '__default__';
const kvsHandle = cf.kvs();


const getFallbackDomain = async () => {
    try {
        return await kvsHandle.get(DEFAULT, { format: "string" });
    } catch (e) { }
    return null;
}

const getDomain = async (request) => {
    const originOverrideId = request.headers && request.headers[HEADER_KEY] && request.headers[HEADER_KEY].value;

    try {
        return originOverrideId
            ? await kvsHandle.get(originOverrideId, { format: "string" })
            : await getFallbackDomain();
    } catch (e) {
        return await getFallbackDomain();
    }
}

async function handler(event) {
    const request = event.request;
    const domain = await getDomain(request);
    if (domain) {
        cf.updateRequestOrigin({ "domainName": domain });
    }
    return request;
}