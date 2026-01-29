/**
 * keyboard-shortcuts.js
 *
 * Global Keyboard Event Handling for MotionMaker
 * Handles all keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Shift+Z, etc.)
 *
 * Dependencies:
 * - Global variables: selectedLayerIndex, selectedKeyframeIndex
 * - Functions: saveProject(), undo(), redo(), togglePlay(), copyKeyframe(), pasteKeyframe()
 * - Functions: deleteKeyframe(), deleteLayer()
 */

        // Keyboard shortcuts - use window with capture phase to catch all events before they can be stopped
        window.addEventListener('keydown', (e) => {
            // Check if user is typing in an input field (but allow shortcuts even then for Ctrl+Z, Ctrl+S, etc.)
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

            if (e.ctrlKey || e.metaKey) {
                // Global shortcuts that work everywhere
                if (e.key === 's') {
                    e.preventDefault();
                    e.stopPropagation();
                    saveProject();
                } else if (e.key === 'z' && !e.shiftKey) {
                    // Ctrl+Z or Cmd+Z = Undo (works everywhere, even in input fields)
                    console.log('Undo triggered, activeElement:', document.activeElement.tagName, document.activeElement.className);
                    e.preventDefault();
                    e.stopPropagation();
                    undo();
                } else if (e.key === 'z' && e.shiftKey) {
                    // Ctrl+Shift+Z or Cmd+Shift+Z = Redo (works everywhere)
                    console.log('Redo triggered (Shift+Z)');
                    e.preventDefault();
                    e.stopPropagation();
                    redo();
                } else if (e.key === 'y') {
                    // Ctrl+Y or Cmd+Y = Redo (alternative, works everywhere)
                    console.log('Redo triggered (Y)');
                    e.preventDefault();
                    e.stopPropagation();
                    redo();
                } else if (e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePlay();
                } else if (e.key === 'c' && !isTyping) {
                    // Ctrl+C or Cmd+C = Copy keyframe (only when not typing)
                    e.preventDefault();
                    e.stopPropagation();
                    copyKeyframe();
                } else if (e.key === 'v' && !isTyping) {
                    // Ctrl+V or Cmd+V = Paste keyframe (only when not typing)
                    e.preventDefault();
                    e.stopPropagation();
                    pasteKeyframe();
                }
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
                // Delete key behavior (only when NOT typing in input fields):
                // - If a background keyframe is selected, delete it
                // - If a layer keyframe is selected, delete the keyframe
                // - If a layer is selected (but no keyframe), delete the layer
                if (selectedBgKeyframeIndex !== null) {
                    e.preventDefault();
                    if (animationData.backgroundKeyframes.length === 1) {
                        showToast('Cannot delete the only background keyframe', 'error');
                    } else {
                        saveState('Delete Background Keyframe');
                        animationData.backgroundKeyframes.splice(selectedBgKeyframeIndex, 1);
                        selectedBgKeyframeIndex = null;
                        renderBackgroundKeyframes();
                        showToast('Background keyframe deleted', 'success');
                    }
                } else if (selectedKeyframeIndex !== null && selectedLayerIndex !== null) {
                    e.preventDefault();
                    deleteKeyframe();
                } else if (selectedLayerIndex !== null) {
                    e.preventDefault();
                    deleteLayer(selectedLayerIndex);
                }
            }
        }, true); // Use capture phase to catch events before they can be stopped by child elements
