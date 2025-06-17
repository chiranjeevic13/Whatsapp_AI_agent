const fs = require('fs').promises;
const path = require('path');

// Store loaded configurations
let industryConfigs = {};
let activeIndustry = 'real_estate'; // Default industry

/**
 * Load all industry configurations
 */
async function loadConfigurations() {
  try {
    const configDir = path.join(__dirname, '../../config/industries');
    const files = await fs.readdir(configDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const industryId = file.replace('.json', '');
        const configData = await fs.readFile(path.join(configDir, file), 'utf8');
        industryConfigs[industryId] = JSON.parse(configData);
        console.log(`Loaded configuration for ${industryId}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error loading configurations:', error);
    throw error;
  }
}

/**
 * Get a specific industry configuration
 */
function getIndustryConfig(industryId = null) {
  if (!industryId) {
    industryId = activeIndustry;
  }
  
  return industryConfigs[industryId] || null;
}

/**
 * Set the active industry
 */
function setActiveIndustry(industryId) {
  if (!industryConfigs[industryId]) {
    throw new Error(`Industry configuration for ${industryId} not found`);
  }
  
  activeIndustry = industryId;
  return true;
}

/**
 * Get all available industry configurations
 */
function getAllIndustries() {
  return Object.keys(industryConfigs).map(id => ({
    id,
    name: industryConfigs[id].name
  }));
}

module.exports = {
  loadConfigurations,
  getIndustryConfig,
  setActiveIndustry,
  getAllIndustries
};