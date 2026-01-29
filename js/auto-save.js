/**
 * auto-save.js
 *
 * Auto-Save Functionality for MotionMaker
 * Handles periodic project saving
 *
 * Dependencies:
 * - Global variables: currentProjectId, autoSaveInterval
 * - Functions: updateProjectData()
 */

        // Auto-save functionality
        let autoSaveInterval = null;

        function startAutoSave() {
            // Auto-save every 15 seconds
            autoSaveInterval = setInterval(() => {
                if (currentProjectId && animationData.layers.length > 0) {
                    console.log('Auto-saving project...');
                    updateProjectData(true); // Pass true to indicate auto-save
                }
            }, 15000); // 15 seconds
        }
