module.exports = {
    apps: [{
        name: "lxp-api",
        script: "./server.js",
        env: {
            NODE_ENV: "development",
            FRONTEND_URL: "http://localhost:4101",
            STORAGE_BUCKET: "lxp-uploads-development",
            UPLOADS_URL : "https://static.dev.lxpia.com"
        },
        env_test: {
            NODE_ENV: "test",
            FRONTEND_URL: "http://localhost:4101",
            STORAGE_BUCKET: "lxp-uploads-development",
            UPLOADS_URL : "https://static.dev.lxpia.com"
        },
        env_staging: {
            NODE_ENV: "staging",
            FRONTEND_URL: "https://staging.lxpia.com/lxp",
            STORAGE_BUCKET: "lxp-uploads-staging"
        },
        env_production: {
            NODE_ENV: "production",
            FRONTEND_URL: "https://lxpia.com/lxp",
            STORAGE_BUCKET: "lxp-uploads-production"
        }
    }]
}
