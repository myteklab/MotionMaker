/**
 * properties-panel.js
 *
 * Properties Panel Management for MotionMaker
 * Updates and syncs properties panel with selected layer
 *
 * Dependencies:
 * - Global variables: animationData, currentTime, selectedLayerIndex, selectedKeyframeIndex, isUpdatingInputs
 * - Functions: interpolateLayerProperties(), showToast(), renderKeyframes(), calculateDuration()
 * - Functions: updateBackgroundKeyframe(), getBackgroundColor()
 */

function updateLayerAtCurrentTime(layer, props) {
    // Find or create keyframe at current time
    const threshold = 100; // 100ms threshold
    let keyframe = layer.keyframes.find(kf => Math.abs(kf.time - currentTime) < threshold);

    if (keyframe) {
        // Update existing keyframe
        Object.assign(keyframe, { time: currentTime, ...props });
    } else {
        // Create new keyframe - show notification to user
        layer.keyframes.push({ time: currentTime, ...props });
        layer.keyframes.sort((a, b) => a.time - b.time);

        // Update selectedKeyframeIndex to point to the newly created keyframe
        selectedKeyframeIndex = layer.keyframes.findIndex(kf => Math.abs(kf.time - currentTime) < threshold);
        document.getElementById('delete-keyframe-btn').disabled = false;

        // Show brief notification that a keyframe was auto-created
        showToast('Keyframe auto-created!', 'info');
    }

    renderKeyframes();
    calculateDuration(); // Auto-update duration when keyframes change
}

function updateSelectedLayer() {
    // Don't update if we're programmatically setting values
    if (isUpdatingInputs || selectedLayerIndex === null) return;

    const layer = animationData.layers[selectedLayerIndex];

    // Get current interpolated values as fallback to prevent (0,0) bugs
    const currentProps = interpolateLayerProperties(layer, currentTime);
    if (!currentProps) {
        console.warn('Cannot update layer - no keyframes exist');
        return;
    }

    // Parse input values, falling back to current interpolated values (NOT 0!)
    const xVal = parseFloat(document.getElementById('prop-x').value);
    const yVal = parseFloat(document.getElementById('prop-y').value);
    const scaleXVal = parseFloat(document.getElementById('prop-scale-x').value);
    const scaleYVal = parseFloat(document.getElementById('prop-scale-y').value);
    const rotationVal = parseFloat(document.getElementById('prop-rotation').value);
    const visibleVal = document.getElementById('prop-visible').checked;

    const props = {
        x: !isNaN(xVal) ? xVal : currentProps.x,
        y: !isNaN(yVal) ? yVal : currentProps.y,
        scaleX: !isNaN(scaleXVal) ? scaleXVal : currentProps.scaleX,
        scaleY: !isNaN(scaleYVal) ? scaleYVal : currentProps.scaleY,
        rotation: !isNaN(rotationVal) ? rotationVal : currentProps.rotation,
        visible: visibleVal
    };

    // Final validation - ensure no NaN values
    if (isNaN(props.x) || isNaN(props.y) || isNaN(props.scaleX) || isNaN(props.scaleY) || isNaN(props.rotation)) {
        console.warn('Invalid property values after validation, skipping update');
        return;
    }

    updateLayerAtCurrentTime(layer, props);
}

function updateBackgroundColorKeyframe() {
    // Don't update if we're programmatically setting values
    if (isUpdatingInputs) return;

    const bgColorVal = document.getElementById('prop-bg-color').value;

    console.log('updateBackgroundColorKeyframe called:', { currentTime, color: bgColorVal, bgKeyframesCount: animationData.backgroundKeyframes.length });

    // Update global background color keyframe (works independently of layer selection)
    updateBackgroundKeyframe(currentTime, bgColorVal);

    console.log('After update, bgKeyframes:', animationData.backgroundKeyframes);
}

function updatePropertiesPanel() {
    if (selectedLayerIndex === null) return;

    const layer = animationData.layers[selectedLayerIndex];
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
    }
}
