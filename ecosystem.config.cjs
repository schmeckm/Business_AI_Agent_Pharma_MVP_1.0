// ecosystem.config.js  (CommonJS, damit PM2 es laden kann)
module.exports = {
  apps: [
    {
      name: "pharma-planner",
      script: "./src/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",

      // ⚙️ Default Environment (development)
      env: {
        NODE_ENV: "development",
        PORT: 5174,
        MQTT_URL: "mqtt://localhost:1883",
        WORKFLOW_MODE: "bpmn",         // oder "builtin"
        PUBLIC_DIR: "./public",        // wo designer.html usw. liegt
        LOG_LEVEL: "debug"             // für mehr Logs
      },

      // ⚙️ Production Environment (pm2 start ecosystem.config.js --env production)
      env_production: {
        NODE_ENV: "production",
        PORT: 5174,
        MQTT_URL: "mqtt://localhost:1883",
        WORKFLOW_MODE: "bpmn",
        PUBLIC_DIR: "./public",
        LOG_LEVEL: "info"
      }
    }
  ]
};
