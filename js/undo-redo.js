/**
 * undo-redo.js
 *
 * History Management System for MotionMaker
 * Handles undo/redo functionality with deep cloning of animation state
 *
 * Dependencies:
 * - Global variables: undoStack, redoStack, MAX_HISTORY, isUndoRedoAction
 * - Global variables: animationData, selectedLayerIndex, selectedKeyframeIndex, selectedBgKeyframeIndex, currentTime
 * - Functions: showToast(), calculateDuration(), updateTimelineRuler(), updateTimelineGrid()
 * - Functions: updateTimeDisplay(), updatePlayhead(), renderLayersList(), renderKeyframes()
 * - Functions: renderBackgroundKeyframes(), interpolateLayerProperties(), selectLayer()
 * - Functions: getBackgroundColor()
 */

// ========== UNDO/REDO SYSTEM ==========

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) {
        undoBtn.disabled = undoStack.length === 0;
    }

    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
    }
}

function deepCloneAnimationData(data) {
    // Deep clone animation data while preserving image references
    return {
        version: data.version,
        settings: { ...data.settings },
        loopEnabled: data.loopEnabled,
        smoothPlayback: data.smoothPlayback,
        backgroundKeyframes: data.backgroundKeyframes ? data.backgroundKeyframes.map(kf => ({ ...kf })) : [],
        layers: data.layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            imageUrl: layer.imageUrl,
            image: layer.image, // Keep image reference, don't clone
            visible: layer.visible,
            opacity: layer.opacity,
            keyframes: layer.keyframes.map(kf => ({ ...kf }))
        }))
    };
}

function saveState(actionDescription) {
    // Don't save state during undo/redo operations
    if (isUndoRedoAction) return;

    // Clone current state
    const snapshot = {
        data: deepCloneAnimationData(animationData),
        selectedLayerIndex: selectedLayerIndex,
        selectedKeyframeIndex: selectedKeyframeIndex,
        selectedBgKeyframeIndex: selectedBgKeyframeIndex,
        currentTime: currentTime,
        description: actionDescription || 'Action'
    };

    undoStack.push(snapshot);

    // Limit history size
    if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
    }

    // Clear redo stack when new action is performed
    redoStack.length = 0;

    // Update button states
    updateUndoRedoButtons();

    console.log('State saved:', actionDescription, 'Undo stack size:', undoStack.length);
}

function undo() {
    if (undoStack.length === 0) {
        showToast('Nothing to undo', 'info');
        return;
    }

    isUndoRedoAction = true;

    // Save current state to redo stack
    const currentSnapshot = {
        data: deepCloneAnimationData(animationData),
        selectedLayerIndex: selectedLayerIndex,
        selectedKeyframeIndex: selectedKeyframeIndex,
        selectedBgKeyframeIndex: selectedBgKeyframeIndex,
        currentTime: currentTime,
        description: 'Current state'
    };
    redoStack.push(currentSnapshot);

    // Restore previous state
    const snapshot = undoStack.pop();
    const previousLayerIndex = selectedLayerIndex;

    animationData = snapshot.data;
    selectedLayerIndex = snapshot.selectedLayerIndex;
    selectedKeyframeIndex = snapshot.selectedKeyframeIndex;
    selectedBgKeyframeIndex = snapshot.selectedBgKeyframeIndex !== undefined ? snapshot.selectedBgKeyframeIndex : null;
    currentTime = snapshot.currentTime;

    // Refresh UI
    refreshAfterUndoRedo();

    // Only call selectLayer if the selection actually changed
    // This prevents unnecessary DOM rebuilding and focus loss
    if (selectedLayerIndex !== previousLayerIndex) {
        if (selectedLayerIndex !== null && selectedLayerIndex !== undefined && animationData.layers[selectedLayerIndex]) {
            selectLayer(selectedLayerIndex, true);
        }
    } else {
        // Selection didn't change, just update the layers list to show correct highlighting
        renderLayersList();
    }

    // Update button states
    updateUndoRedoButtons();

    showToast('Undo: ' + snapshot.description, 'info');

    isUndoRedoAction = false;
}

function redo() {
    if (redoStack.length === 0) {
        showToast('Nothing to redo', 'info');
        return;
    }

    isUndoRedoAction = true;

    // Save current state to undo stack
    const currentSnapshot = {
        data: deepCloneAnimationData(animationData),
        selectedLayerIndex: selectedLayerIndex,
        selectedKeyframeIndex: selectedKeyframeIndex,
        selectedBgKeyframeIndex: selectedBgKeyframeIndex,
        currentTime: currentTime,
        description: 'Previous state'
    };
    undoStack.push(currentSnapshot);

    // Restore redo state
    const snapshot = redoStack.pop();
    const previousLayerIndex = selectedLayerIndex;

    animationData = snapshot.data;
    selectedLayerIndex = snapshot.selectedLayerIndex;
    selectedKeyframeIndex = snapshot.selectedKeyframeIndex;
    selectedBgKeyframeIndex = snapshot.selectedBgKeyframeIndex !== undefined ? snapshot.selectedBgKeyframeIndex : null;
    currentTime = snapshot.currentTime;

    // Refresh UI
    refreshAfterUndoRedo();

    // Only call selectLayer if the selection actually changed
    // This prevents unnecessary DOM rebuilding and focus loss
    if (selectedLayerIndex !== previousLayerIndex) {
        if (selectedLayerIndex !== null && selectedLayerIndex !== undefined && animationData.layers[selectedLayerIndex]) {
            selectLayer(selectedLayerIndex, true);
        }
    } else {
        // Selection didn't change, just update the layers list to show correct highlighting
        renderLayersList();
    }

    // Update button states
    updateUndoRedoButtons();

    showToast('Redo: ' + snapshot.description, 'info');
    console.log('Redo:', snapshot.description);

    isUndoRedoAction = false;
}

function refreshAfterUndoRedo() {
    // Recalculate duration
    calculateDuration();

    // Update timeline
    updateTimelineRuler();
    updateTimelineGrid();
    updateTimeDisplay();
    updatePlayhead();

    // Update layers list
    renderLayersList();

    // Update keyframes display
    renderKeyframes();
    renderBackgroundKeyframes();

    // Update properties panel if layer is selected
    if (selectedLayerIndex !== null && animationData.layers[selectedLayerIndex]) {
        const layer = animationData.layers[selectedLayerIndex];
        const props = interpolateLayerProperties(layer, currentTime);

        if (props) {
            isUpdatingInputs = true;
            document.getElementById('prop-x').value = Math.round(props.x);
            document.getElementById('prop-y').value = Math.round(props.y);
            document.getElementById('prop-scale-x').value = props.scaleX.toFixed(2);
            document.getElementById('prop-scale-y').value = props.scaleY.toFixed(2);
            document.getElementById('prop-rotation').value = Math.round(props.rotation);
            document.getElementById('prop-visible').checked = props.visible !== false;
            document.getElementById('prop-bg-color').value = getBackgroundColor(currentTime);

            // Update easing if keyframe is selected
            if (selectedKeyframeIndex !== null && layer.keyframes[selectedKeyframeIndex]) {
                document.getElementById('easing-function').value = layer.keyframes[selectedKeyframeIndex].easing || 'linear';
            }

            isUpdatingInputs = false;
        }

        // Update delete button state
        document.getElementById('delete-keyframe-btn').disabled = selectedKeyframeIndex === null;
    } else {
        // No layer selected, clear inputs
        selectedLayerIndex = null;
        selectedKeyframeIndex = null;
        document.getElementById('delete-keyframe-btn').disabled = true;
    }

    // Update background color
    document.getElementById('bg-color').value = animationData.settings.backgroundColor;
}

// ========== END UNDO/REDO SYSTEM ==========
