module.exports = {
    apps: [{
        name: "lxp-api",
        script: "./server.js",
        env: {
            NODE_ENV: "development",
            FRONTEND_URL: "http://localhost:4101",
            STORAGE_BUCKET: "lxp-uploads-development"
        },
        env_test: {
            NODE_ENV: "test",
            FRONTEND_URL: "http://localhost:4101",
            STORAGE_BUCKET: "lxp-uploads-development"
        },
        env_staging: {
            NODE_ENV: "staging",
            FRONTEND_URL: "http://localhost:4101",
            STORAGE_BUCKET: "lxp-uploads-staging"
        },
        env_production: {
            NODE_ENV: "production",
            FRONTEND_URL: "http://eventcode.hr",
            STORAGE_BUCKET: "lxp-uploads-production"
        }
    }]
}
