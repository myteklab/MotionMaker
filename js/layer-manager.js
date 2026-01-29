/**
 * layer-manager.js
 *
 * Layer Management System for MotionMaker
 * Handles layer operations (CRUD, visibility, drag & drop, renaming, duplication)
 *
 * Dependencies:
 * - Global variables: animationData, selectedLayerIndex, selectedKeyframeIndex, selectedBgKeyframeIndex
 * - Global variables: currentTime, isUpdatingInputs, CANVAS_WIDTH, CANVAS_HEIGHT
 * - Functions: saveState(), showToast(), renderKeyframes(), renderBackgroundKeyframes()
 * - Functions: updatePropertiesPanel(), interpolateLayerProperties(), getBackgroundColor()
 * - Functions: updateTimeDisplay(), updatePlayhead(), calculateDuration()
 * - P5.js: loadImage()
 */

// Layer drag and drop state
let draggedLayerIndex = null;

function addLayer(imageUrl, imageName) {
    console.log('Attempting to load image:', imageUrl);

    loadImage(imageUrl, (img) => {
        console.log('Image loaded successfully:', imageUrl, 'Size:', img.width, 'x', img.height);

        const newLayer = {
            id: 'layer_' + Date.now(),
            name: imageName || 'Layer ' + (animationData.layers.length + 1),
            imageUrl: imageUrl,
            image: img,
            visible: true,
            opacity: 255,
            keyframes: [
                {
                    time: 0, // Always start at time 0
                    x: CANVAS_WIDTH / 2,
                    y: CANVAS_HEIGHT / 2,
                    scaleX: 1,
                    scaleY: 1,
                    rotation: 0,
                    visible: true,
                    easing: 'linear'
                }
            ]
        };

        // Save state before adding layer
        saveState('Add Layer');

        animationData.layers.push(newLayer);
        const newLayerIndex = animationData.layers.length - 1;

        // Select the new layer and its first keyframe
        selectedLayerIndex = newLayerIndex;
        selectedKeyframeIndex = 0;

        // Reset time to 0 so we can see the new layer
        currentTime = 0;
        updateTimeDisplay();
        updatePlayhead();

        // Update UI
        renderLayersList();
        renderKeyframes();
        updatePropertiesPanel();

        // Enable delete keyframe button since we have a keyframe selected
        document.getElementById('delete-keyframe-btn').disabled = false;

        console.log('Layer added and selected:', newLayer.name);
        showToast('Layer added! Drag to position or add keyframes.', 'success');
    }, (err) => {
        console.error('Failed to load image:', imageUrl, err);
        showToast('Failed to load image: ' + imageUrl, 'error');
    });
}

function selectLayer(index, preserveKeyframe = false) {
    console.log('selectLayer called with index:', index, 'preserveKeyframe:', preserveKeyframe);

    const previousLayerIndex = selectedLayerIndex;
    selectedLayerIndex = index;
    selectedBgKeyframeIndex = null; // Deselect background keyframe when selecting a layer
    renderLayersList();
    renderBackgroundKeyframes(); // Update background keyframe selection state

    if (index !== null && index !== undefined) {
        const layer = animationData.layers[index];

        if (!layer) {
            console.error('Layer at index', index, 'not found! Total layers:', animationData.layers.length);
            selectedLayerIndex = null;
            return;
        }

        // Only auto-select first keyframe if:
        // 1. We're switching to a different layer, OR
        // 2. preserveKeyframe is false (default behavior for fresh selections)
        // 3. There are keyframes available
        if (!preserveKeyframe && previousLayerIndex !== index && layer.keyframes && layer.keyframes.length > 0) {
            selectedKeyframeIndex = 0;
            currentTime = layer.keyframes[0].time;
            updateTimeDisplay();
            updatePlayhead();
            document.getElementById('delete-keyframe-btn').disabled = false;
        } else if (layer.keyframes && layer.keyframes.length > 0) {
            // Keep current keyframe selection, just validate it exists
            if (selectedKeyframeIndex !== null && selectedKeyframeIndex >= layer.keyframes.length) {
                selectedKeyframeIndex = 0;
                currentTime = layer.keyframes[0].time;
                updateTimeDisplay();
                updatePlayhead();
            }
            document.getElementById('delete-keyframe-btn').disabled = selectedKeyframeIndex === null;
        } else {
            selectedKeyframeIndex = null;
            document.getElementById('delete-keyframe-btn').disabled = true;
        }

        const props = interpolateLayerProperties(layer, currentTime);
        if (props && !isNaN(props.x) && !isNaN(props.y)) {
            isUpdatingInputs = true; // Prevent oninput handlers
            document.getElementById('prop-x').value = Math.round(props.x);
            document.getElementById('prop-y').value = Math.round(props.y);
            document.getElementById('prop-scale-x').value = props.scaleX.toFixed(2);
            document.getElementById('prop-scale-y').value = props.scaleY.toFixed(2);
            document.getElementById('prop-rotation').value = Math.round(props.rotation);
            document.getElementById('prop-visible').checked = props.visible !== false;
            document.getElementById('prop-bg-color').value = getBackgroundColor(currentTime);
            isUpdatingInputs = false;
        } else {
            console.warn('Invalid props from interpolation:', props);
        }

        console.log('Layer selected:', layer.name, 'Index:', index, 'Keyframes:', layer.keyframes.length, 'selectedKeyframeIndex:', selectedKeyframeIndex);
    } else {
        selectedKeyframeIndex = null;
        document.getElementById('delete-keyframe-btn').disabled = true;
        console.log('No layer selected (index was null/undefined)');
    }

    renderKeyframes();
}

function deleteLayer(index) {
    if (confirm('Delete this layer?')) {
        console.log('Deleting layer:', index, animationData.layers[index].name);

        // Save state before deleting layer
        saveState('Delete Layer');

        // Remove the layer
        animationData.layers.splice(index, 1);

        // Update selection
        if (selectedLayerIndex === index) {
            // Deleted the selected layer
            selectedLayerIndex = null;
            selectedKeyframeIndex = null;
            document.getElementById('delete-keyframe-btn').disabled = true;
        } else if (selectedLayerIndex > index) {
            // Adjust selection index if needed
            selectedLayerIndex--;
        }

        // Update UI
        renderLayersList();
        renderKeyframes();
        calculateDuration(); // Auto-update duration when layers are deleted
        showToast('Layer deleted');

        console.log('Remaining layers:', animationData.layers.length);
    }
}

function duplicateLayer(index) {
    const sourceLayer = animationData.layers[index];
    if (!sourceLayer) {
        console.error('Cannot duplicate layer - layer not found at index:', index);
        return;
    }

    console.log('Duplicating layer:', sourceLayer.name);

    // Save state before duplicating
    saveState('Duplicate Layer');

    // Deep clone the layer
    const duplicatedLayer = {
        id: 'layer_' + Date.now(), // New unique ID
        name: sourceLayer.name + ' (Copy)',
        imageUrl: sourceLayer.imageUrl,
        image: sourceLayer.image, // Reuse the loaded image
        visible: true, // Make duplicate visible by default
        opacity: sourceLayer.opacity,
        keyframes: [] // Deep clone keyframes below
    };

    // Deep clone all keyframes
    sourceLayer.keyframes.forEach(kf => {
        duplicatedLayer.keyframes.push({
            time: kf.time,
            x: kf.x,
            y: kf.y,
            scaleX: kf.scaleX,
            scaleY: kf.scaleY,
            rotation: kf.rotation,
            visible: kf.visible !== undefined ? kf.visible : true,
            easing: kf.easing || 'linear'
        });
    });

    // Insert duplicated layer right after the source layer
    animationData.layers.splice(index + 1, 0, duplicatedLayer);

    // Select the duplicated layer
    selectedLayerIndex = index + 1;
    selectedKeyframeIndex = 0; // Select first keyframe

    // Jump to first keyframe of duplicated layer
    if (duplicatedLayer.keyframes.length > 0) {
        currentTime = duplicatedLayer.keyframes[0].time;
        updateTimeDisplay();
        updatePlayhead();
    }

    // Update UI
    renderLayersList();
    renderKeyframes();
    calculateDuration(); // Recalculate duration in case new keyframes extend timeline
    updatePropertiesPanel();

    showToast('Layer duplicated! All ' + duplicatedLayer.keyframes.length + ' keyframes copied.', 'success');
    console.log('Layer duplicated:', duplicatedLayer.name, 'with', duplicatedLayer.keyframes.length, 'keyframes');
}

function renameLayer(index, newName) {
    if (!animationData.layers[index]) {
        console.error('Cannot rename layer - layer not found at index:', index);
        return;
    }

    // Trim and validate name
    newName = newName.trim();
    if (!newName || newName.length === 0) {
        console.warn('Layer name cannot be empty');
        showToast('Layer name cannot be empty', 'error');
        return false;
    }

    if (newName.length > 50) {
        console.warn('Layer name too long');
        showToast('Layer name too long (max 50 characters)', 'error');
        return false;
    }

    const oldName = animationData.layers[index].name;
    if (oldName === newName) {
        console.log('Layer name unchanged');
        return false;
    }

    // Save state before renaming
    saveState('Rename Layer');

    animationData.layers[index].name = newName;
    console.log('Layer renamed from "' + oldName + '" to "' + newName + '"');
    showToast('Layer renamed to "' + newName + '"', 'success');

    // Update UI
    renderLayersList();
    return true;
}

function toggleLayerVisibility(index) {
    animationData.layers[index].visible = !animationData.layers[index].visible;
    renderLayersList();
}

function renderLayersList() {
    const list = document.getElementById('layers-list');

    if (animationData.layers.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #666; padding: 20px; font-size: 12px;">No layers yet.<br>Click "Add Image" to start!</div>';
        return;
    }

    list.innerHTML = '';
    animationData.layers.forEach((layer, layerIndex) => {
        const div = document.createElement('div');
        div.className = 'layer-item' + (layerIndex === selectedLayerIndex ? ' selected' : '');
        div.dataset.layerIndex = layerIndex;
        div.draggable = true; // Make the layer draggable

        // Drag and drop event listeners
        div.addEventListener('dragstart', function(e) {
            draggedLayerIndex = layerIndex;
            div.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', div.innerHTML);
        });

        div.addEventListener('dragend', function(e) {
            div.classList.remove('dragging');
            // Remove all drag-over classes
            document.querySelectorAll('.layer-item').forEach(item => {
                item.classList.remove('drag-over');
            });
        });

        div.addEventListener('dragover', function(e) {
            if (e.preventDefault) {
                e.preventDefault(); // Allows us to drop
            }
            e.dataTransfer.dropEffect = 'move';

            // Add visual indicator
            div.classList.add('drag-over');
            return false;
        });

        div.addEventListener('dragleave', function(e) {
            div.classList.remove('drag-over');
        });

        div.addEventListener('drop', function(e) {
            if (e.stopPropagation) {
                e.stopPropagation(); // Stops some browsers from redirecting
            }

            div.classList.remove('drag-over');

            if (draggedLayerIndex !== null && draggedLayerIndex !== layerIndex) {
                // Reorder the layers array
                const draggedLayer = animationData.layers[draggedLayerIndex];
                animationData.layers.splice(draggedLayerIndex, 1);
                animationData.layers.splice(layerIndex, 0, draggedLayer);

                // Update selected layer index if needed
                if (selectedLayerIndex === draggedLayerIndex) {
                    selectedLayerIndex = layerIndex;
                } else if (draggedLayerIndex < selectedLayerIndex && layerIndex >= selectedLayerIndex) {
                    selectedLayerIndex--;
                } else if (draggedLayerIndex > selectedLayerIndex && layerIndex <= selectedLayerIndex) {
                    selectedLayerIndex++;
                }

                // Re-render the layers list and keyframes
                renderLayersList();
                renderKeyframes();

                console.log('Layer reordered:', draggedLayer.name, 'moved to position', layerIndex);
            }

            draggedLayerIndex = null;
            return false;
        });

        // Create visibility toggle
        const visibilitySpan = document.createElement('span');
        visibilitySpan.className = 'layer-visibility';
        visibilitySpan.textContent = layer.visible ? '👁️' : '🚫';
        visibilitySpan.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('Visibility clicked for layer:', layerIndex);
            toggleLayerVisibility(layerIndex);
        });

        // Create layer name container (with name and rename button)
        const nameContainer = document.createElement('div');
        nameContainer.className = 'layer-name-container';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'layer-name';
        nameSpan.textContent = layer.name;
        nameSpan.title = 'Click pencil to rename';
        nameSpan.dataset.layerIndex = layerIndex;

        // Rename button (pencil icon)
        const renameBtn = document.createElement('button');
        renameBtn.className = 'layer-rename-btn';
        renameBtn.textContent = '✏️';
        renameBtn.title = 'Rename layer';
        renameBtn.type = 'button';
        renameBtn.dataset.layerIndex = layerIndex;

        // Function to start rename (used by both button and double-click)
        const startRename = (idx) => {
            const currentName = animationData.layers[idx].name;
            console.log('Rename started for layer:', idx, currentName);

            // Create inline input
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.className = 'layer-name-input';
            input.maxLength = 50;

            // Replace the entire name container with input
            nameContainer.replaceWith(input);
            input.focus();
            input.select();

            // Handle rename on blur or Enter key
            const finishRename = () => {
                const newName = input.value;
                const success = renameLayer(idx, newName);
                // renderLayersList() is called by renameLayer, which recreates the UI
            };

            input.addEventListener('blur', finishRename);
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur(); // Trigger blur event to finish rename
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    // Cancel rename - just re-render
                    renderLayersList();
                }
            });
        };

        // Click rename button to rename
        renameBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const idx = parseInt(this.dataset.layerIndex);
            startRename(idx);
            return false;
        });

        // Double-click name to rename (keep this for power users)
        nameSpan.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const idx = parseInt(this.dataset.layerIndex);
            startRename(idx);
            return false;
        });

        // Assemble name container
        nameContainer.appendChild(nameSpan);
        nameContainer.appendChild(renameBtn);

        // Create action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'layer-actions';

        // Duplicate button
        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'btn small';
        duplicateBtn.textContent = '📋';
        duplicateBtn.title = 'Duplicate layer';
        duplicateBtn.type = 'button';
        duplicateBtn.dataset.duplicateIndex = layerIndex;
        duplicateBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const idx = parseInt(this.dataset.duplicateIndex);
            console.log('Duplicate button clicked! Index from dataset:', idx, 'Layer:', animationData.layers[idx].name);
            duplicateLayer(idx);
            return false;
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn danger small';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Delete layer';
        deleteBtn.type = 'button';
        deleteBtn.dataset.deleteIndex = layerIndex;
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const idx = parseInt(this.dataset.deleteIndex);
            console.log('Delete button clicked! Index from dataset:', idx, 'Layer:', animationData.layers[idx].name);
            deleteLayer(idx);
            return false;
        });

        actionsDiv.appendChild(duplicateBtn);
        actionsDiv.appendChild(deleteBtn);

        // Assemble the layer item
        div.appendChild(visibilitySpan);
        div.appendChild(nameContainer);
        div.appendChild(actionsDiv);

        // Click on layer to select it
        div.addEventListener('click', function(e) {
            // Don't select if clicking on action buttons, rename button, or input field
            // But DO allow selection when clicking the layer name text itself
            if (e.target.closest('.layer-actions') ||
                e.target.classList.contains('layer-rename-btn') ||
                e.target.classList.contains('layer-name-input') ||
                e.target.classList.contains('layer-visibility')) {
                console.log('Clicked on button/input/visibility, not selecting layer');
                return;
            }
            console.log('Selecting layer:', layerIndex, layer.name);
            selectLayer(layerIndex);
        });

        list.appendChild(div);
    });
}
