/**
 * playback-controls.js
 *
 * Playback & Playhead Dragging for MotionMaker
 * Handles play/pause, scrubbing, playhead interaction, and keyframe dragging
 *
 * Dependencies:
 * - Global variables: isDraggingPlayhead, isScrubbing, isDraggingKeyframe, draggedKeyframeInfo
 * - Global variables: keyframeDragStartX, currentTime, animationData, selectedKeyframeIndex
 * - Global variables: selectedLayerIndex, dragThreshold
 * - Functions: updateTimeDisplay(), updatePlayhead(), updatePropertiesPanel(), saveState()
 * - Functions: selectLayer(), selectKeyframe(), renderKeyframes()
 */

// Scrubbing - Playhead dragging
let isDraggingPlayhead = false;

function startPlayheadDrag(event) {
    event.stopPropagation();
    event.preventDefault(); // Prevent text selection
    isDraggingPlayhead = true;
    isScrubbing = true;

    // Add class to body to prevent text selection globally
    document.body.classList.add('dragging-playhead');

    // Add global event listeners for smooth dragging
    document.addEventListener('mousemove', dragPlayhead);
    document.addEventListener('mouseup', endPlayheadDrag);

    dragPlayhead(event);
}

function dragPlayhead(event) {
    if (!isDraggingPlayhead) return;
    event.preventDefault(); // Prevent text selection during drag

    const track = document.getElementById('timeline-track');
    const rect = track.getBoundingClientRect();
    const paddingLeft = 120;
    const paddingRight = 10;
    const availableWidth = rect.width - paddingLeft - paddingRight;
    const x = Math.max(0, Math.min(event.clientX - rect.left - paddingLeft, availableWidth));
    const progress = x / availableWidth;

    currentTime = progress * animationData.settings.duration;
    updateTimeDisplay();
    updatePlayhead();
    updatePropertiesPanel();
}

function endPlayheadDrag() {
    isDraggingPlayhead = false;
    isScrubbing = false;

    // Remove class from body to re-enable text selection
    document.body.classList.remove('dragging-playhead');

    document.removeEventListener('mousemove', dragPlayhead);
    document.removeEventListener('mouseup', endPlayheadDrag);
}

// Keyframe dragging handlers
document.addEventListener('mousemove', function(e) {
    if (!draggedKeyframeInfo) return;

    const deltaX = e.clientX - keyframeDragStartX;

    // Check if we've moved enough to start dragging
    if (!isDraggingKeyframe && Math.abs(deltaX) > dragThreshold) {
        isDraggingKeyframe = true;
        saveState('Drag keyframe'); // Save state before drag
        draggedKeyframeInfo.element.style.cursor = 'grabbing';
        draggedKeyframeInfo.element.classList.add('dragging');

        // Create ghost keyframe at original position
        const ghost = document.createElement('div');
        ghost.className = 'keyframe-ghost';
        ghost.id = 'dragging-ghost';
        const originalProgress = draggedKeyframeInfo.originalTime / animationData.settings.duration;
        ghost.style.left = (originalProgress * 100) + '%';
        ghost.style.top = draggedKeyframeInfo.element.style.top;

        // Append to timeline-keyframes container instead of element parent (which might be null)
        const container = document.getElementById('timeline-keyframes');
        if (container) {
            container.appendChild(ghost);
        }

        // Create time label that follows the dragging keyframe
        const label = document.createElement('div');
        label.className = 'keyframe-drag-label';
        label.id = 'dragging-label';
        document.body.appendChild(label);
    }

    if (isDraggingKeyframe) {
        // Calculate new time based on mouse position
        const track = document.getElementById('timeline-track');
        const rect = track.getBoundingClientRect();
        const paddingLeft = 120;
        const paddingRight = 10;
        const availableWidth = rect.width - paddingLeft - paddingRight;
        const x = Math.max(0, Math.min(e.clientX - rect.left - paddingLeft, availableWidth));
        const progress = x / availableWidth;
        const newTime = progress * animationData.settings.duration;

        // Update keyframe position visually
        draggedKeyframeInfo.element.style.left = (progress * 100) + '%';

        // Store the new time temporarily (we'll commit on mouseup)
        draggedKeyframeInfo.newTime = Math.max(0, Math.min(newTime, animationData.settings.duration));

        // Temporarily update the actual keyframe time in the animation data
        // This allows the canvas to show a live preview of what the animation looks like
        const layer = animationData.layers[draggedKeyframeInfo.layerIndex];
        const keyframe = draggedKeyframeInfo.keyframeObject; // Use the object reference
        keyframe.time = draggedKeyframeInfo.newTime;

        // Re-sort keyframes temporarily for accurate interpolation preview
        layer.keyframes.sort((a, b) => a.time - b.time);

        // Find the new index after sorting (selection might have shifted)
        const newIndex = layer.keyframes.indexOf(keyframe);
        selectedKeyframeIndex = newIndex;

        // DON'T move the playhead - it should stay at the current time
        // Instead, the draw() loop will show a yellow ghost preview at the dragged keyframe's new time
        // This gives clear visual feedback without confusing the user about what they're dragging

        // Update drag label position and text
        const label = document.getElementById('dragging-label');
        if (label) {
            label.textContent = `${(newTime / 1000).toFixed(2)}s`;
            label.style.left = e.clientX + 'px';
            label.style.top = (e.clientY - 30) + 'px';
        }
    }
});

document.addEventListener('mouseup', function(e) {
    if (!draggedKeyframeInfo) return;

    if (isDraggingKeyframe) {
        // The keyframe time was already updated during mousemove
        // Just need to finalize the UI
        const layer = animationData.layers[draggedKeyframeInfo.layerIndex];
        const keyframe = draggedKeyframeInfo.keyframeObject; // Use the object reference

        // Keyframes were already sorted during mousemove, so just find the new index
        const newIndex = layer.keyframes.indexOf(keyframe);
        selectedKeyframeIndex = newIndex;

        // Update UI to show final position
        currentTime = keyframe.time;
        updateTimeDisplay();
        updatePlayhead();
        renderKeyframes();
        updatePropertiesPanel();

        draggedKeyframeInfo.element.classList.remove('dragging');

        // Remove ghost and label
        const ghost = document.getElementById('dragging-ghost');
        const label = document.getElementById('dragging-label');
        if (ghost) ghost.remove();
        if (label) label.remove();
    }

    // Reset drag state
    isDraggingKeyframe = false;
    draggedKeyframeInfo = null;
    keyframeDragStartX = 0;

    // Ensure keyboard shortcuts work after drag by removing focus from timeline elements
    if (document.activeElement && document.activeElement.closest('#timeline-keyframes')) {
        document.activeElement.blur();
    }
});

// Click on timeline track to jump
document.addEventListener('DOMContentLoaded', function() {
    console.log('MotionMaker v2025-10-26 loaded - Layer duplication and rename features enabled');
    const track = document.getElementById('timeline-track');
    if (track) {
        track.addEventListener('mousedown', function(event) {
            // Don't handle clicks on playhead or keyframes
            if (event.target.closest('.playhead')) return;
            if (event.target.closest('.keyframe')) return;
            if (event.target.closest('.bg-keyframe')) return; // Don't handle background keyframe clicks
            // Don't handle if we're starting a keyframe drag
            if (draggedKeyframeInfo) return;

            const rect = track.getBoundingClientRect();
            const paddingLeft = 120;
            const paddingRight = 10;
            const availableWidth = rect.width - paddingLeft - paddingRight;
            const x = Math.max(0, Math.min(event.clientX - rect.left - paddingLeft, availableWidth));
            const progress = x / availableWidth;

            currentTime = progress * animationData.settings.duration;
            updateTimeDisplay();
            updatePlayhead();
            updatePropertiesPanel();
        });
    }
});
