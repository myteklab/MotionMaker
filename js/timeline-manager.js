/**
 * timeline-manager.js
 *
 * Timeline Rendering & Interaction for MotionMaker
 * Handles timeline display, grid, ruler, keyframes, and scroll synchronization
 *
 * Dependencies:
 * - Global variables: animationData, currentTime, selectedLayerIndex, selectedKeyframeIndex
 * - Global variables: selectedBgKeyframeIndex, isUpdatingInputs, keyframeDragStartX, draggedKeyframeInfo
 * - Functions: selectLayer(), interpolateLayerProperties(), getBackgroundColor()
 * - Functions: updatePlayhead(), updateTimeDisplay(), showToast(), saveState()
 */

// Auto-calculate duration based on furthest keyframe
function calculateDuration() {
    let maxTime = 0;

    animationData.layers.forEach(layer => {
        layer.keyframes.forEach(kf => {
            if (kf.time > maxTime) {
                maxTime = kf.time;
            }
        });
    });

    // Animation ends at the furthest keyframe
    const animationEnd = maxTime;

    // Timeline workspace: Keep current workspace stable, only expand when absolutely needed
    // This prevents the visual position of the playhead from jumping around
    const currentWorkspace = animationData.settings.duration || 5000;

    // Only expand if the furthest keyframe is getting close to the end (within 1 second)
    let timelineMax = currentWorkspace;
    if (animationEnd > currentWorkspace - 1000) {
        // Round up to nearest 5-second interval for stable, predictable timeline scaling
        // This prevents keyframes from appearing to shift/squish when timeline expands
        const interval = 5000; // 5 second intervals
        timelineMax = Math.ceil((animationEnd + 1000) / interval) * interval;
        timelineMax = Math.min(Math.max(timelineMax, 5000), 60000);
    }

    // Always update duration display (show actual animation end)
    const durationSeconds = (animationEnd / 1000).toFixed(1);
    document.getElementById('duration-display').textContent = durationSeconds + 's';

    if (timelineMax !== animationData.settings.duration) {
        animationData.settings.duration = timelineMax; // Timeline workspace size
        updateTimelineRuler();
        updateTimelineGrid();
        updatePlayhead(); // Update visual position based on new timeline scale

        console.log('Timeline updated. Workspace:', (timelineMax/1000).toFixed(1), 's, Animation ends at:', durationSeconds, 's');
    }
}

// Get the animation end time (furthest keyframe)
function getAnimationEndTime() {
    let maxTime = 0;
    animationData.layers.forEach(layer => {
        layer.keyframes.forEach(kf => {
            if (kf.time > maxTime) {
                maxTime = kf.time;
            }
        });
    });
    return maxTime;
}

// Timeline functions
function updateTimeDisplay() {
    const current = (currentTime / 1000).toFixed(2);
    const total = (animationData.settings.duration / 1000).toFixed(2);
    document.getElementById('time-display').textContent = `${current}s / ${total}s`;
}

function updatePlayhead() {
    const progress = currentTime / animationData.settings.duration;
    const track = document.getElementById('timeline-track');
    const playhead = document.getElementById('playhead');
    // Account for left padding (120px) in timeline track
    const paddingLeft = 120;
    const paddingRight = 10;
    const availableWidth = track.clientWidth - paddingLeft - paddingRight;
    playhead.style.left = (paddingLeft + (progress * availableWidth)) + 'px';
}

function updateTimelineRuler() {
    const ruler = document.getElementById('timeline-ruler');
    const duration = animationData.settings.duration / 1000;
    const intervals = 20; // Even more granular for precise time placement

    ruler.innerHTML = '';
    for (let i = 0; i <= intervals; i++) {
        const span = document.createElement('span');
        span.textContent = ((duration / intervals) * i).toFixed(1) + 's';
        ruler.appendChild(span);
    }
}

function updateTimelineGrid() {
    const grid = document.getElementById('timeline-grid');
    const majorIntervals = 20; // Match the ruler labels
    const minorIntervals = 40; // Add extra minor lines between labels

    grid.innerHTML = '';

    // Add minor grid lines (every 2.5% for 40 total)
    for (let i = 0; i <= minorIntervals; i++) {
        const line = document.createElement('div');
        line.className = 'timeline-grid-line';
        line.style.left = ((i / minorIntervals) * 100) + '%';
        grid.appendChild(line);
    }

    // Add major grid lines on top (every 5% for 20 total)
    for (let i = 0; i <= majorIntervals; i++) {
        const line = document.createElement('div');
        line.className = 'timeline-grid-line major';
        line.style.left = ((i / majorIntervals) * 100) + '%';
        grid.appendChild(line);
    }
}

function renderTimelineLabels() {
    const labelsContainer = document.getElementById('timeline-labels');
    labelsContainer.innerHTML = '';

    // Create a wrapper to establish scroll height
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.minHeight = (animationData.layers.length * 24) + 'px'; // Ensure container is tall enough to scroll

    // Render a label for each layer
    animationData.layers.forEach((layer, layerIndex) => {
        const label = document.createElement('div');
        label.className = 'timeline-label';
        if (layerIndex === selectedLayerIndex) {
            label.classList.add('selected');
        }
        label.textContent = layer.name;
        label.title = 'Click to select layer';

        // Position based on layer index (each layer row is 24px: 20px height + 4px margin)
        label.style.top = (layerIndex * 24) + 'px';

        // Make clickable to select layer
        label.style.cursor = 'pointer';
        label.addEventListener('click', function() {
            selectLayer(layerIndex);
        });

        wrapper.appendChild(label);
    });

    labelsContainer.appendChild(wrapper);
}

function renderKeyframes() {
    const container = document.getElementById('timeline-keyframes');
    const showAll = document.getElementById('show-all-keyframes').checked;

    container.innerHTML = '';

    if (showAll) {
        // Render timeline labels only when showing all keyframes
        renderTimelineLabels();
        // Show all layers' keyframes in separate rows
        container.classList.remove('single-layer');

        animationData.layers.forEach((layer, layerIndex) => {
            const row = document.createElement('div');
            row.className = 'keyframe-row';

            // Highlight the row if this layer is selected
            if (layerIndex === selectedLayerIndex) {
                row.classList.add('selected');
            }

            // Add layer name label
            const label = document.createElement('div');
            label.className = 'keyframe-row-label';
            label.textContent = layer.name;
            row.appendChild(label);

            // Add keyframes for this layer
            layer.keyframes.forEach((kf, kfIndex) => {
                const progress = kf.time / animationData.settings.duration;
                const div = document.createElement('div');
                div.className = 'keyframe';

                // Highlight if this layer is selected and this is the selected keyframe
                if (layerIndex === selectedLayerIndex && kfIndex === selectedKeyframeIndex) {
                    div.classList.add('selected');
                }

                div.style.left = (progress * 100) + '%';
                div.style.cursor = 'grab';

                // Mousedown - prepare for potential drag
                div.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                    e.preventDefault();

                    keyframeDragStartX = e.clientX;
                    draggedKeyframeInfo = {
                        layerIndex: layerIndex,
                        keyframeIndex: kfIndex,
                        keyframeObject: kf, // Store reference to actual keyframe
                        originalTime: kf.time,
                        element: div
                    };

                    // Select the layer and keyframe immediately
                    selectLayer(layerIndex);
                    setTimeout(() => selectKeyframe(kfIndex), 0);
                });

                row.appendChild(div);
            });

            container.appendChild(row);
        });

        // Set up scroll synchronization after rendering all rows
        setupTimelineScrollSync();
    } else {
        // Show only selected layer's keyframes (original behavior)
        container.classList.add('single-layer');

        // Clear timeline labels when showing single layer
        const labelsContainer = document.getElementById('timeline-labels');
        if (labelsContainer) labelsContainer.innerHTML = '';

        // Remove scroll sync when not showing all keyframes
        setupTimelineScrollSync();

        if (selectedLayerIndex === null) return;

        const layer = animationData.layers[selectedLayerIndex];
        layer.keyframes.forEach((kf, kfIndex) => {
            const progress = kf.time / animationData.settings.duration;
            const div = document.createElement('div');
            div.className = 'keyframe' + (kfIndex === selectedKeyframeIndex ? ' selected' : '');
            div.style.left = (progress * 100) + '%';
            div.dataset.keyframeIndex = kfIndex;

            div.style.cursor = 'grab';

            div.addEventListener('mousedown', function(e) {
                e.stopPropagation();
                e.preventDefault();

                keyframeDragStartX = e.clientX;
                draggedKeyframeInfo = {
                    layerIndex: selectedLayerIndex,
                    keyframeIndex: kfIndex,
                    keyframeObject: kf, // Store reference to actual keyframe
                    originalTime: kf.time,
                    element: div
                };

                // Select the keyframe immediately
                setTimeout(() => selectKeyframe(kfIndex), 0);
            });

            container.appendChild(div);
        });
    }
}

function toggleShowAllKeyframes() {
    renderKeyframes();
    renderBackgroundKeyframes();
    setupTimelineScrollSync(); // Set up scroll synchronization
}

// Synchronize scroll between timeline labels and keyframes
function setupTimelineScrollSync() {
    const labelsContainer = document.getElementById('timeline-labels');
    const keyframesContainer = document.getElementById('timeline-keyframes');
    const showAll = document.getElementById('show-all-keyframes').checked;

    if (!labelsContainer || !keyframesContainer) return;

    // Remove any existing listeners to avoid duplicates
    keyframesContainer.removeEventListener('scroll', syncLabelsScroll);

    if (showAll) {
        // Add scroll listener to sync labels with keyframes
        keyframesContainer.addEventListener('scroll', syncLabelsScroll);
    }
}

// Scroll handler function (defined separately to allow removal)
function syncLabelsScroll() {
    const labelsContainer = document.getElementById('timeline-labels');
    const keyframesContainer = document.getElementById('timeline-keyframes');
    if (labelsContainer && keyframesContainer) {
        labelsContainer.scrollTop = keyframesContainer.scrollTop;
    }
}

// Helper function to render both layer and background keyframes
function renderAllKeyframes() {
    renderKeyframes();
    renderBackgroundKeyframes();
}

// Render background color keyframes in timeline
function renderBackgroundKeyframes() {
    const container = document.getElementById('background-keyframes-track');
    if (!container) return;

    // Clear existing keyframes (but keep the label)
    const existingKeyframes = container.querySelectorAll('.bg-keyframe');
    existingKeyframes.forEach(kf => kf.remove());

    if (!animationData.backgroundKeyframes || animationData.backgroundKeyframes.length === 0) return;

    const duration = animationData.settings.duration;

    animationData.backgroundKeyframes.forEach((bgKf, index) => {
        const progress = bgKf.time / duration;
        const div = document.createElement('div');
        div.className = 'bg-keyframe';
        div.style.left = (progress * 100) + '%';
        div.style.backgroundColor = bgKf.color;
        div.title = `BG Color at ${(bgKf.time / 1000).toFixed(2)}s: ${bgKf.color}\nRight-click to delete`;
        div.dataset.bgKeyframeIndex = index; // Store index for deletion

        // Click to select and jump to time
        div.addEventListener('click', (e) => {
            e.stopPropagation();

            // Blur any focused input to allow keyboard shortcuts
            if (document.activeElement && document.activeElement.blur) {
                document.activeElement.blur();
            }

            selectedBgKeyframeIndex = index; // Select this background keyframe
            currentTime = bgKf.time;
            updateTimeDisplay();
            updatePlayhead();
            renderBackgroundKeyframes(); // Re-render to show selection

            // Update background color picker
            document.getElementById('prop-bg-color').value = bgKf.color;
        });

        // Right-click to delete
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (animationData.backgroundKeyframes.length === 1) {
                showToast('Cannot delete the only background keyframe', 'error');
                return;
            }

            // Use the stored index to delete
            const indexToDelete = parseInt(div.dataset.bgKeyframeIndex);
            saveState('Delete Background Keyframe');
            animationData.backgroundKeyframes.splice(indexToDelete, 1);

            // Clear selection if we deleted the selected one
            if (selectedBgKeyframeIndex === indexToDelete) {
                selectedBgKeyframeIndex = null;
            } else if (selectedBgKeyframeIndex > indexToDelete) {
                // Adjust index if we deleted one before the selected one
                selectedBgKeyframeIndex--;
            }

            renderBackgroundKeyframes();
            showToast('Background keyframe deleted', 'success');
        });

        // Check if this keyframe is actually selected
        if (selectedBgKeyframeIndex === index) {
            div.classList.add('selected');
        }

        container.appendChild(div);
    });
}

function selectKeyframe(index) {
    console.log('selectKeyframe called with index:', index);
    selectedKeyframeIndex = index;
    selectedBgKeyframeIndex = null; // Deselect background keyframe when selecting a layer keyframe
    const layer = animationData.layers[selectedLayerIndex];
    const kf = layer.keyframes[index];
    currentTime = kf.time;
    renderBackgroundKeyframes(); // Update background keyframe selection state

    console.log('Selected keyframe:', index, 'at time:', kf.time, 'selectedKeyframeIndex is now:', selectedKeyframeIndex);

    isUpdatingInputs = true; // Prevent oninput handlers
    document.getElementById('prop-x').value = Math.round(kf.x);
    document.getElementById('prop-y').value = Math.round(kf.y);
    document.getElementById('prop-scale-x').value = kf.scaleX.toFixed(2);
    document.getElementById('prop-scale-y').value = kf.scaleY.toFixed(2);
    document.getElementById('prop-rotation').value = Math.round(kf.rotation);
    document.getElementById('prop-visible').checked = kf.visible !== false;
    document.getElementById('prop-bg-color').value = getBackgroundColor(kf.time);
    document.getElementById('easing-function').value = kf.easing || 'linear';
    isUpdatingInputs = false;

    document.getElementById('delete-keyframe-btn').disabled = false;

    updatePlayhead();
    updateTimeDisplay();
    renderKeyframes();
    console.log('After renderKeyframes, selectedKeyframeIndex is:', selectedKeyframeIndex);
}
