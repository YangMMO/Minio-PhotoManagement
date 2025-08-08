const Minio = require('minio');
const fs = require('fs');
const path = require('path');

// const configPath = path.join(__dirname, 'config.json');

const { app } = require('electron').remote || require('@electron/remote');
const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (!config.accessKey || !config.secretKey) {
    return null;
  }
  return config;
}

function createMinioClient() {
  const config = loadConfig();
  if (!config) return null;

  return new Minio.Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey
  });
}

module.exports = { createMinioClient, loadConfig };
