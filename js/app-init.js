/**
 * app-init.js
 *
 * Application Initialization for MotionMaker
 * Initializes app on page load and handles project data loading
 *
 * Dependencies:
 * - Global variables: animationData, projectData (from PHP), currentProjectId, currentProjectName
 * - Functions: loadPanelSizes(), calculateDuration(), updateTimelineRuler(), updateTimelineGrid()
 * - Functions: updateUndoRedoButtons(), startAutoSave(), renderLayersList(), renderKeyframes()
 * - P5.js: loadImage()
 */

        // Initialize
        window.addEventListener('load', () => {
            // Load saved panel sizes
            loadPanelSizes();

            // Load loop preference if it was saved
            const loopCheckbox = document.getElementById('loop-checkbox');
            if (loopCheckbox && animationData.loopEnabled !== undefined) {
                loopCheckbox.checked = animationData.loopEnabled;
                console.log('Loaded loop preference:', animationData.loopEnabled);
            }

            // Load smooth playback preference if it was saved
            const smoothPlaybackCheckbox = document.getElementById('smooth-playback-checkbox');
            if (smoothPlaybackCheckbox && animationData.smoothPlayback !== undefined) {
                smoothPlaybackCheckbox.checked = animationData.smoothPlayback;
                console.log('Loaded smooth playback preference:', animationData.smoothPlayback);
            }

            // Set up onion skin opacity display update function
            window.updateOpacityDisplay = function() {
                const opacitySlider = document.getElementById('onion-skin-opacity');
                const opacityValue = document.getElementById('onion-opacity-value');
                if (opacitySlider && opacityValue) {
                    opacityValue.textContent = opacitySlider.value + '%';
                }
            };

            // Calculate duration based on keyframes (must be done before updating timeline)
            calculateDuration();

            updateTimelineRuler();
            updateTimelineGrid();
            updateTimeDisplay();
            updatePlayhead();
            renderLayersList(); // Always render the layers list (shows "no layers" if empty)
            renderBackgroundKeyframes(); // Render background keyframes in timeline

            // Initialize undo/redo button states
            updateUndoRedoButtons();

            // Start auto-save timer
            startAutoSave();

            // Enable share, embed, and export buttons if project exists
            if (currentProjectId) {
                document.getElementById('share-btn').disabled = false;
                document.getElementById('embed-btn').disabled = false;
                document.getElementById('export-btn').disabled = false;
            }

            // Load existing project data if available
            if (currentProjectId && animationData.layers.length > 0) {
                console.log('Loading project with', animationData.layers.length, 'layers');

                // Load all layer images
                let loadedCount = 0;
                animationData.layers.forEach((layer, index) => {
                    console.log('Loading layer:', layer.name, 'Keyframes:', layer.keyframes);

                    loadImage(layer.imageUrl, (img) => {
                        layer.image = img;
                        loadedCount++;

                        // Select first layer after all images are loaded
                        if (loadedCount === animationData.layers.length) {
                            selectLayer(0);
                            console.log('All images loaded, selected layer 0');
                        }
                    }, () => {
                        console.error('Failed to load image:', layer.imageUrl);
                        loadedCount++;
                    });
                });

                // Update UI
                document.getElementById('bg-color').value = animationData.settings.backgroundColor;
                showToast('Animation loaded!');
            }
        });
