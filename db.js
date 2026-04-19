// db.js
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    /**
     * Writes data to a JSON file.
     * @param {string} fileName - e.g., 'transactions.json'
     * @param {object} data - The object or array to store
     */
    async write(fileName, data) {
        try {
            const filePath = path.join(process.cwd(), fileName);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`DB Write Error (${fileName}):`, error);
            throw error;
        }
    },

    /**
     * Reads data from a JSON file.
     * @param {string} fileName - e.g., 'transactions.json'
     * @returns {object|null} - Returns parsed data or null if file doesn't exist
     */
    async read(fileName) {
        try {
            const filePath = path.join(process.cwd(), fileName);
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            // If file doesn't exist, return null instead of crashing
            if (error.code === 'ENOENT') return null;
            console.error(`DB Read Error (${fileName}):`, error);
            throw error;
        }
    }
};