/**
 * project-manager.js
 *
 * Project Save/Load/Share for MotionMaker
 * Handles project CRUD operations with backend
 *
 * Dependencies:
 * - Global variables: APPLICATION_ID, USER_ID, currentProjectId, currentProjectName, animationData
 * - Global variables: selectedLayerIndex, selectedKeyframeIndex
 * - Functions: showToast(), stopAnimation(), renderLayersList(), renderKeyframes(), saveScreenshot()
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
            const projectName = prompt('Enter project name:', 'My Animation');
            if (!projectName) return;

            fetch('https://www.mytekos.com/beta/api/v1/projects/create', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    application_id: APPLICATION_ID.toString(),
                    name: projectName
                }),
            })
            .then(response => response.json())
            .then(responseData => {
                if (responseData.project_id) {
                    currentProjectName = projectName;
                    document.getElementById('project-name').textContent = projectName;
                    window.location.href = 'https://www.mytekos.com/beta/applications/MotionMaker/?id=' + responseData.project_id;
                } else {
                    showToast('Error creating project', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to create project', 'error');
            });
        }

        function updateProjectData(isAutoSave = false) {
            // Preserve current selection state
            const preservedLayerIndex = selectedLayerIndex;
            const preservedKeyframeIndex = selectedKeyframeIndex;

            // Prepare data for saving (remove p5 image objects)
            const loopCheckbox = document.getElementById('loop-checkbox');
            const smoothPlaybackCheckbox = document.getElementById('smooth-playback-checkbox');
            const saveData = {
                ...animationData,
                loopEnabled: loopCheckbox ? loopCheckbox.checked : true, // Save loop preference
                smoothPlayback: smoothPlaybackCheckbox ? smoothPlaybackCheckbox.checked : false, // Save smooth playback preference
                layers: animationData.layers.map(layer => ({
                    id: layer.id,
                    name: layer.name,
                    imageUrl: layer.imageUrl,
                    visible: layer.visible,
                    opacity: layer.opacity,
                    keyframes: layer.keyframes
                }))
            };

            const projectData = JSON.stringify(saveData);

            const data = {
                project_id: currentProjectId,
                content: projectData
            };

            fetch(`https://www.mytekos.com/beta/api/v1/files/${currentProjectId}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })
            .then(response => response.json())
            .then(responseData => {
                if (isAutoSave) {
                    // Show subtle auto-save indicator
                    const statusEl = document.getElementById('auto-save-status');
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    statusEl.textContent = `Auto-saved at ${timeStr}`;
                    statusEl.style.opacity = '1';

                    // Fade out after 3 seconds
                    setTimeout(() => {
                        statusEl.style.opacity = '0';
                    }, 3000);
                } else {
                    showToast('Animation saved!');
                }
                // Enable share, embed, and export buttons after successful save
                document.getElementById('share-btn').disabled = false;
                document.getElementById('embed-btn').disabled = false;
                document.getElementById('export-btn').disabled = false;

                // Automatically save screenshot after successful save
                saveScreenshot();

                // Restore selection state after save completes
                selectedLayerIndex = preservedLayerIndex;
                selectedKeyframeIndex = preservedKeyframeIndex;

                // Re-render layers list to show selection
                if (selectedLayerIndex !== null) {
                    renderLayersList();
                    renderKeyframes();
                }
            })
            .catch(error => {
                console.error('Save error:', error);
                if (!isAutoSave) {
                    showToast('Failed to save', 'error');
                }

                // Restore selection even on error
                selectedLayerIndex = preservedLayerIndex;
                selectedKeyframeIndex = preservedKeyframeIndex;
            });
        }

        function saveScreenshot() {
            if (!currentProjectId) return;

            // Capture the canvas as a data URL
            const canvas = document.querySelector('#p5-canvas canvas');
            if (!canvas) {
                console.error('Canvas not found for screenshot');
                return;
            }

            const imageData = canvas.toDataURL('image/png');

            // Send to server
            fetch('https://www.mytekos.com/beta/applications/MotionMaker/save_screenshot.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: currentProjectId,
                    image: imageData
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Screenshot saved successfully');
                } else {
                    console.error('Screenshot save failed:', data.error);
                }
            })
            .catch(error => {
                console.error('Screenshot save error:', error);
            });
        }

        async function shareProject() {
            if (!currentProjectId) {
                showToast('Save your project first!', 'error');
                return;
            }

            // Generate secure hash for preview URL
            const hash = await generatePreviewHash(currentProjectId);
            const previewUrl = `https://www.mytekos.com/beta/applications/MotionMaker/preview.php?hash=${hash}`;

            // Copy to clipboard
            navigator.clipboard.writeText(previewUrl).then(() => {
                showToast('Preview link copied to clipboard! 🔗');

                // Also open in new tab
                window.open(previewUrl, '_blank');
            }).catch(() => {
                // Fallback if clipboard fails
                showToast('Preview opened in new tab!');
                window.open(previewUrl, '_blank');
            });
        }

        // Generate preview hash (must match preview.php logic)
        async function generatePreviewHash(projectId) {
            const PREVIEW_SALT = 'motionmaker_preview_salt_2025';
            return await sha256(projectId + PREVIEW_SALT);
        }

        // Simple SHA-256 implementation
        async function sha256(message) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

