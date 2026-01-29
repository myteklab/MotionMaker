/**
 * keyframe-manager.js
 *
 * Keyframe CRUD Operations for MotionMaker
 * Handles adding, deleting, copying, and pasting keyframes
 *
 * Dependencies:
 * - Global variables: selectedLayerIndex, selectedKeyframeIndex, currentTime, isUpdatingInputs
 * - Global variables: copiedKeyframe, copiedFromLayerIndex, animationData
 * - Functions: saveState(), showToast(), renderKeyframes(), calculateDuration()
 * - Functions: updatePlayhead(), updateTimeDisplay(), updatePropertiesPanel()
 */

function updateKeyframeEasing() {
    if (selectedLayerIndex === null || selectedKeyframeIndex === null) return;

    // Save state before changing easing
    saveState('Change Easing');

    const layer = animationData.layers[selectedLayerIndex];
    const kf = layer.keyframes[selectedKeyframeIndex];

    // Update the easing function for the selected keyframe
    kf.easing = document.getElementById('easing-function').value;

    console.log('Updated keyframe easing to:', kf.easing);
}

function addKeyframe() {
    if (selectedLayerIndex === null || selectedLayerIndex === undefined) {
        showToast('Select a layer first!', 'error');
        return;
    }

    // Save state before adding keyframe
    saveState('Add Keyframe');

    const layer = animationData.layers[selectedLayerIndex];

    // Store the current playhead position to restore it after adding keyframe
    const savedTime = currentTime;

    // Background color is now handled separately in global backgroundKeyframes
    const newKeyframe = {
        time: savedTime,
        x: parseFloat(document.getElementById('prop-x').value),
        y: parseFloat(document.getElementById('prop-y').value),
        scaleX: parseFloat(document.getElementById('prop-scale-x').value),
        scaleY: parseFloat(document.getElementById('prop-scale-y').value),
        rotation: parseFloat(document.getElementById('prop-rotation').value),
        visible: document.getElementById('prop-visible').checked,
        easing: document.getElementById('easing-function').value || 'linear'
    };

    const existingIndex = layer.keyframes.findIndex(kf => Math.abs(kf.time - savedTime) < 100);
    if (existingIndex !== -1) {
        layer.keyframes[existingIndex] = newKeyframe;
        selectedKeyframeIndex = existingIndex;
        showToast('Keyframe updated!');
    } else {
        layer.keyframes.push(newKeyframe);
        layer.keyframes.sort((a, b) => a.time - b.time);
        selectedKeyframeIndex = layer.keyframes.findIndex(kf => kf.time === savedTime);
        showToast('Keyframe added!');
    }

    document.getElementById('delete-keyframe-btn').disabled = false;
    renderKeyframes();
    calculateDuration();

    // Ensure playhead stays exactly where it was
    currentTime = savedTime;
    updatePlayhead();
    updateTimeDisplay();
}

function deleteKeyframe() {
    if (selectedKeyframeIndex === null || selectedLayerIndex === null) return;

    // Save state before deleting keyframe
    saveState('Delete Keyframe');

    const layer = animationData.layers[selectedLayerIndex];
    layer.keyframes.splice(selectedKeyframeIndex, 1);
    selectedKeyframeIndex = null;
    document.getElementById('delete-keyframe-btn').disabled = true;
    renderKeyframes();
    calculateDuration(); // Auto-update duration when keyframes change
    showToast('Keyframe deleted');
}

function copyKeyframe() {
    if (selectedKeyframeIndex === null || selectedLayerIndex === null) {
        showToast('No keyframe selected to copy', 'error');
        return;
    }

    const layer = animationData.layers[selectedLayerIndex];
    const keyframe = layer.keyframes[selectedKeyframeIndex];

    // Deep clone the keyframe properties (exclude time - will be set on paste)
    copiedKeyframe = {
        x: keyframe.x,
        y: keyframe.y,
        scaleX: keyframe.scaleX,
        scaleY: keyframe.scaleY,
        rotation: keyframe.rotation,
        visible: keyframe.visible !== undefined ? keyframe.visible : true,
        easing: keyframe.easing || 'linear'
    };
    copiedFromLayerIndex = selectedLayerIndex;

    console.log('Keyframe copied:', copiedKeyframe, 'from layer:', selectedLayerIndex);
    showToast('Keyframe copied! (Ctrl+V to paste on another layer)', 'success');
}

function pasteKeyframe() {
    if (copiedKeyframe === null) {
        showToast('No keyframe copied yet (use Ctrl+C on a keyframe)', 'error');
        return;
    }

    if (selectedLayerIndex === null) {
        showToast('Select a layer to paste the keyframe', 'error');
        return;
    }

    // Prevent pasting on the same layer
    if (selectedLayerIndex === copiedFromLayerIndex) {
        showToast('Cannot paste on the same layer - select a different layer', 'error');
        return;
    }

    const layer = animationData.layers[selectedLayerIndex];

    // Check if keyframe already exists at current time
    const threshold = 100; // 100ms threshold
    const existingKeyframe = layer.keyframes.find(kf => Math.abs(kf.time - currentTime) < threshold);

    // Save state before pasting
    saveState('Paste Keyframe');

    if (existingKeyframe) {
        // Update existing keyframe with copied properties
        existingKeyframe.x = copiedKeyframe.x;
        existingKeyframe.y = copiedKeyframe.y;
        existingKeyframe.scaleX = copiedKeyframe.scaleX;
        existingKeyframe.scaleY = copiedKeyframe.scaleY;
        existingKeyframe.rotation = copiedKeyframe.rotation;
        existingKeyframe.visible = copiedKeyframe.visible;
        existingKeyframe.easing = copiedKeyframe.easing;
        console.log('Updated existing keyframe at time:', currentTime, 'with copied properties');
        showToast('Keyframe updated with copied properties', 'success');
    } else {
        // Create new keyframe with copied properties at current time
        const newKeyframe = {
            time: currentTime,
            x: copiedKeyframe.x,
            y: copiedKeyframe.y,
            scaleX: copiedKeyframe.scaleX,
            scaleY: copiedKeyframe.scaleY,
            rotation: copiedKeyframe.rotation,
            visible: copiedKeyframe.visible,
            easing: copiedKeyframe.easing
        };

        layer.keyframes.push(newKeyframe);
        layer.keyframes.sort((a, b) => a.time - b.time); // Keep keyframes sorted by time

        // Select the newly pasted keyframe
        selectedKeyframeIndex = layer.keyframes.indexOf(newKeyframe);

        console.log('Created new keyframe at time:', currentTime, 'with copied properties');
        showToast('Keyframe pasted at ' + (currentTime / 1000).toFixed(2) + 's', 'success');
    }

    // Update UI
    renderKeyframes();
    calculateDuration();
    updatePropertiesPanel();
}
