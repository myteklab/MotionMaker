/**
 * project-manager.js
 *
 * Project Save/Load/Share for MotionMaker (standalone)
 * Handles project state, save to file download, load from file upload.
 * When running on a platform, the platform adapter overrides these functions.
 *
 * Dependencies:
 * - Global variables: currentProjectId, currentProjectName, animationData
 * - Global variables: selectedLayerIndex, selectedKeyframeIndex
 * - Functions: showToast(), stopAnimation(), renderLayersList(), renderKeyframes()
 */

        function newProject() {
            if (confirm('Start a new project? Any unsaved changes will be lost.')) {
                currentProjectId = null;
                currentProjectName = 'Untitled';
                animationData.layers = [];
                selectedLayerIndex = null;
                currentTime = 0;
                selectedKeyframeIndex = null;

                document.getElementById('project-name').textContent = 'Untitled';
                document.getElementById('delete-keyframe-btn').disabled = true;

                stopAnimation();
                renderLayersList();
                renderKeyframes();
                showToast('New project created');
            }
        }

        function saveProject() {
            if (!currentProjectId) {
                createNewProject();
            } else {
                updateProjectData();
            }
        }

        function createNewProject() {
            var projectName = prompt('Enter project name:', 'My Animation');
            if (!projectName) return;

            currentProjectId = 'local-' + Date.now();
            currentProjectName = projectName;
            document.getElementById('project-name').textContent = projectName;

            updateProjectData();
        }

        function updateProjectData(isAutoSave) {
            // Preserve current selection state
            var preservedLayerIndex = selectedLayerIndex;
            var preservedKeyframeIndex = selectedKeyframeIndex;

            // Prepare data for saving (remove p5 image objects)
            var loopCheckbox = document.getElementById('loop-checkbox');
            var smoothPlaybackCheckbox = document.getElementById('smooth-playback-checkbox');
            var saveData = {
                ...animationData,
                loopEnabled: loopCheckbox ? loopCheckbox.checked : true,
                smoothPlayback: smoothPlaybackCheckbox ? smoothPlaybackCheckbox.checked : false,
                layers: animationData.layers.map(function (layer) {
                    return {
                        id: layer.id,
                        name: layer.name,
                        imageUrl: layer.imageUrl,
                        visible: layer.visible,
                        opacity: layer.opacity,
                        keyframes: layer.keyframes
                    };
                })
            };

            // Download as JSON file
            var json = JSON.stringify(saveData, null, 2);
            var blob = new Blob([json], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = (currentProjectName || 'animation') + '.json';

            if (!isAutoSave) {
                a.click();
                showToast('Animation saved!');
            }

            URL.revokeObjectURL(url);

            // Enable share, embed, and export buttons after save
            var shareBtn = document.getElementById('share-btn');
            var embedBtn = document.getElementById('embed-btn');
            var exportBtn = document.getElementById('export-btn');
            if (shareBtn) shareBtn.disabled = false;
            if (embedBtn) embedBtn.disabled = false;
            if (exportBtn) exportBtn.disabled = false;

            // Restore selection state
            selectedLayerIndex = preservedLayerIndex;
            selectedKeyframeIndex = preservedKeyframeIndex;

            if (selectedLayerIndex !== null) {
                renderLayersList();
                renderKeyframes();
            }
        }

        function saveScreenshot() {
            // No-op in standalone mode. Platform adapter overrides this.
        }

        function shareProject() {
            showToast('Sharing is available when running on the platform.', 'info');
        }
