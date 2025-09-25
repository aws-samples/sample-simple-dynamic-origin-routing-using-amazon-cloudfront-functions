import path = require("path")

export const DNS = {
    zoneName: "",
    hostedZoneId: "",
    recordName: ""
}

export const ORIGIN = {
    COUNT: 3,
    LAMBDA_CODE_PATH: path.join(__dirname, "./runtime/origin-lambda/")
}

export const CDN = {
    VIEWER_REQUEST_CODE: 'lib/runtime/cloudfront-function-origin-selector/viewer-request.js'
}

export const DEMO_CLIENT = {
    PATH: path.join(__dirname, '../demo-client')
}