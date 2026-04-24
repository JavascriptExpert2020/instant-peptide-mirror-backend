const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'configs', 'configs.json');

const interpolateEnv = (value) => {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] || '');
  }

  if (Array.isArray(value)) {
    return value.map(interpolateEnv);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, interpolateEnv(nestedValue)])
    );
  }

  return value;
};

const loadConfig = () => {
  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return interpolateEnv(rawConfig);
};

module.exports = loadConfig;
