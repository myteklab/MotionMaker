/**
 * core-animation.js
 *
 * Core P5.js Animation Functions for MotionMaker
 * Handles canvas rendering, drawing, and animation loop
 *
 * Dependencies:
 * - P5.js library
 * - Global variables: CANVAS_WIDTH, CANVAS_HEIGHT, animationData, currentTime, selectedLayerIndex
 * - Global variables: isPlaying, isScrubbing, isDragging, isScaling, isRotating, activeHandle
 * - Global variables: isDraggingKeyframe, draggedKeyframeInfo, dragOffsetX, dragOffsetY
 * - Global variables: scaleStart*, rotateStart*, rotateAccumulated*
 * - Functions: getBackgroundColor(), interpolateLayerProperties(), get AnimationEndTime()
 * - Functions: stopAnimation(), updateTimeDisplay(), updatePlayhead(), updateLayerAtCurrentTime()
 * - Functions: updatePropertiesPanel(), saveState(), selectLayer(), drawMotionTrail(), drawOnionSkins()
 */

        function setup() {
            let canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.parent('p5-canvas');
            frameRate(animationData.settings.fps);
            imageMode(CENTER);
            angleMode(DEGREES);

            // Ensure animation settings match canvas
            animationData.settings.width = CANVAS_WIDTH;
            animationData.settings.height = CANVAS_HEIGHT;
        }

        function draw() {
            // Background - use interpolated background color from global background keyframes
            const bgColor = getBackgroundColor(currentTime);
            background(bgColor);

            // Update animation
            if (isPlaying && !isScrubbing) {
                // Apply playback speed multiplier
                const speedControl = document.getElementById('playback-speed');
                const playbackSpeed = speedControl ? parseFloat(speedControl.value) : 1.0;
                currentTime += deltaTime * playbackSpeed;
                const animationEndTime = getAnimationEndTime(); // Calculate end time dynamically
                if (currentTime > animationEndTime) {
                    // Check if loop is enabled
                    const loopCheckbox = document.getElementById('loop-checkbox');
                    if (loopCheckbox && loopCheckbox.checked) {
                        currentTime = 0; // Loop back to start
                    } else {
                        currentTime = animationEndTime; // Stop at end
                        stopAnimation();
                    }
                }
                updateTimeDisplay();
                updatePlayhead();
            }

            // Render all layers
            animationData.layers.forEach((layer, index) => {
                if (!layer.visible) return;

                // Draw motion trail if enabled and this is the selected layer
                const motionTrailEnabled = index === selectedLayerIndex &&
                                          document.getElementById('motion-trail-enabled')?.checked;

                if (motionTrailEnabled && layer.keyframes.length > 1) {
                    drawMotionTrail(layer);
                }

                // Draw onion skins if enabled and this is the selected layer and not playing
                const onionSkinEnabled = !isPlaying && index === selectedLayerIndex &&
                                        document.getElementById('onion-skin-enabled')?.checked;

                if (onionSkinEnabled && layer.keyframes.length > 1) {
                    drawOnionSkins(layer, currentTime);
                }

                // Draw current frame
                const props = interpolateLayerProperties(layer, currentTime);
                // Check both layer visibility AND keyframe visibility
                if (props && layer.image && props.visible !== false) {
                    push();
                    translate(props.x, props.y);
                    rotate(props.rotation);
                    scale(props.scaleX, props.scaleY);
                    tint(255, layer.opacity || 255);
                    image(layer.image, 0, 0);
                    noTint();
                    pop();

                    // Draw selection handles if selected and not playing
                    if (!isPlaying && index === selectedLayerIndex) {
                        drawSelectionHandles(props, layer.image);
                    }
                }

                // If we're dragging a keyframe for this layer, show a yellow ghost preview at the dragged position
                if (isDraggingKeyframe && draggedKeyframeInfo && draggedKeyframeInfo.layerIndex === index) {
                    // Get the props for where the image will be AT the new keyframe time
                    const previewProps = interpolateLayerProperties(layer, draggedKeyframeInfo.newTime);
                    if (previewProps && layer.image) {
                        push();
                        translate(previewProps.x, previewProps.y);
                        rotate(previewProps.rotation);
                        scale(previewProps.scaleX, previewProps.scaleY);
                        // Draw semi-transparent yellow tint to show this is a drag preview
                        tint(255, 193, 7, 120); // Yellow with alpha
                        image(layer.image, 0, 0);

                        // Draw a yellow outline around the preview
                        noTint();
                        stroke(255, 193, 7);
                        strokeWeight(3);
                        noFill();
                        const w = layer.image.width / 2;
                        const h = layer.image.height / 2;
                        rect(-w, -h, w * 2, h * 2);
                        pop();
                    }
                }
            });
        }

        function drawSelectionHandles(props, img) {
            if (!img) return;

            push();
            translate(props.x, props.y);
            rotate(props.rotation);

            const w = img.width * props.scaleX / 2;
            const h = img.height * props.scaleY / 2;

            // Bounding box - thicker for better visibility
            stroke(108, 92, 231);
            strokeWeight(3);
            noFill();
            rect(-w, -h, w * 2, h * 2);

            // Corner handles (for scaling) - larger for easier clicking
            fill(108, 92, 231);
            stroke(255);
            strokeWeight(2);
            const handleSize = 14;
            circle(-w, -h, handleSize); // Top-left
            circle(w, -h, handleSize);  // Top-right
            circle(-w, h, handleSize);  // Bottom-left
            circle(w, h, handleSize);   // Bottom-right

            // Rotation handle
            fill(231, 76, 60);
            stroke(255);
            strokeWeight(2);
            circle(0, -h - 30, handleSize);
            stroke(231, 76, 60);
            strokeWeight(3);
            line(0, -h, 0, -h - 25);

            // Layer name label
            if (selectedLayerIndex !== null) {
                const layer = animationData.layers[selectedLayerIndex];
                push();
                rotate(-props.rotation); // Un-rotate for readable text
                fill(108, 92, 231);
                noStroke();
                textAlign(CENTER, BOTTOM);
                textSize(14);
                textStyle(BOLD);
                text(layer.name, 0, -h - 45);
                pop();
            }

            pop();
        }

        function drawOnionSkins(layer, currentTime) {
            if (!layer || !layer.image || !layer.keyframes || layer.keyframes.length < 2) return;

            const opacitySlider = document.getElementById('onion-skin-opacity');
            const opacityPercent = opacitySlider ? parseInt(opacitySlider.value) : 30;
            const opacity = Math.floor(255 * (opacityPercent / 100));

            // Find the keyframe immediately before and after current time
            let prevKeyframe = null;
            let nextKeyframe = null;

            // Sort keyframes by time to ensure correct order
            const sortedKeyframes = [...layer.keyframes].sort((a, b) => a.time - b.time);

            for (let i = 0; i < sortedKeyframes.length; i++) {
                const kf = sortedKeyframes[i];

                if (kf.time < currentTime) {
                    // This keyframe is before current time - potential previous
                    prevKeyframe = kf;
                } else if (kf.time > currentTime && !nextKeyframe) {
                    // This is the first keyframe after current time
                    nextKeyframe = kf;
                    break; // No need to continue, we found the next one
                }
                // If kf.time === currentTime, we're exactly on a keyframe
                // In this case, prevKeyframe is the one before it, nextKeyframe is the one after
            }

            // Draw previous keyframe (red tint) if it exists
            if (prevKeyframe) {
                push();
                translate(prevKeyframe.x, prevKeyframe.y);
                rotate(prevKeyframe.rotation);
                scale(prevKeyframe.scaleX, prevKeyframe.scaleY);
                tint(255, 150, 150, opacity); // Red tint with transparency
                image(layer.image, 0, 0);
                noTint();
                pop();
            }

            // Draw next keyframe (blue tint) if it exists
            if (nextKeyframe) {
                push();
                translate(nextKeyframe.x, nextKeyframe.y);
                rotate(nextKeyframe.rotation);
                scale(nextKeyframe.scaleX, nextKeyframe.scaleY);
                tint(150, 150, 255, opacity); // Blue tint with transparency
                image(layer.image, 0, 0);
                noTint();
                pop();
            }
        }

        function drawMotionTrail(layer) {
            if (!layer || !layer.keyframes || layer.keyframes.length < 2) return;

            const keyframes = [...layer.keyframes].sort((a, b) => a.time - b.time);

            push();

            // Draw the interpolated path as a smooth curve
            stroke(108, 92, 231, 150); // Purple with transparency
            strokeWeight(2);
            noFill();

            // Sample points along the animation to create a smooth trail
            const samples = 50; // Number of points to sample
            const startTime = keyframes[0].time;
            const endTime = keyframes[keyframes.length - 1].time;
            const duration = endTime - startTime;

            if (duration > 0) {
                beginShape();
                for (let i = 0; i <= samples; i++) {
                    const t = startTime + (i / samples) * duration;
                    const props = interpolateLayerProperties(layer, t);
                    if (props) {
                        vertex(props.x, props.y);
                    }
                }
                endShape();
            }

            // Draw dots at each keyframe position
            noStroke();
            fill(108, 92, 231, 200); // Purple, semi-opaque

            keyframes.forEach((kf, index) => {
                // Draw larger circle for first and last keyframe
                if (index === 0 || index === keyframes.length - 1) {
                    fill(39, 174, 96, 200); // Green for start/end
                    circle(kf.x, kf.y, 10);
                } else {
                    fill(108, 92, 231, 200); // Purple for intermediate
                    circle(kf.x, kf.y, 8);
                }
            });

            // Draw direction arrows along the path
            stroke(108, 92, 231, 100);
            strokeWeight(2);
            fill(108, 92, 231, 100);

            const arrowSamples = 5; // Number of arrows to draw
            for (let i = 1; i <= arrowSamples; i++) {
                const t = startTime + (i / (arrowSamples + 1)) * duration;
                const props = interpolateLayerProperties(layer, t);
                const prevT = t - (duration / samples);
                const prevProps = interpolateLayerProperties(layer, prevT);

                if (props && prevProps) {
                    // Calculate direction
                    const dx = props.x - prevProps.x;
                    const dy = props.y - prevProps.y;
                    const angle = Math.atan2(dy, dx);

                    // Draw small arrow
                    push();
                    translate(props.x, props.y);
                    rotate(angle);

                    // Arrow head
                    const arrowSize = 8;
                    beginShape();
                    vertex(0, 0);
                    vertex(-arrowSize, -arrowSize / 2);
                    vertex(-arrowSize, arrowSize / 2);
                    endShape(CLOSE);

                    pop();
                }
            }

            pop();
        }

        function mousePressed() {
            if (isPlaying) return;

            // Ignore mouse events if they originated from UI controls (sliders, checkboxes, etc.)
            // This prevents deselecting layers when interacting with the toolbar
            const target = window.event?.target;
            if (target && (target.type === 'range' || target.type === 'checkbox' ||
                          target.closest('.timeline-controls') || target.closest('.toolbar'))) {
                return;
            }

            // Only handle mouse clicks that are on the canvas
            // mouseX/mouseY can be negative or outside canvas when clicking UI elements
            if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
                console.log('Click outside canvas, ignoring. mouseX:', mouseX, 'mouseY:', mouseY);
                return;
            }

            const mx = mouseX;
            const my = mouseY;

            // Check if clicking on a handle first (priority over dragging)
            if (selectedLayerIndex !== null) {
                const layer = animationData.layers[selectedLayerIndex];
                const props = interpolateLayerProperties(layer, currentTime);

                if (props && layer.image) {
                    const handle = getHandleAtPosition(mx, my, props, layer.image);
                    if (handle) {
                        // Save state before starting transformation
                        if (handle === 'rotate') {
                            saveState('Rotate Layer');
                            isRotating = true;
                            // Store initial rotation state
                            const dx = mx - props.x;
                            const dy = my - props.y;
                            rotateStartAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                            rotatePreviousAngle = rotateStartAngle;
                            rotateStartRotation = props.rotation;
                            rotateAccumulatedDelta = 0;
                        } else {
                            saveState('Scale Layer');
                            // Store initial scaling state
                            isScaling = true;
                            scaleStartMouseX = mx;
                            scaleStartMouseY = my;
                            scaleStartX = props.x;
                            scaleStartY = props.y;
                            scaleStartScaleX = props.scaleX;
                            scaleStartScaleY = props.scaleY;
                            scaleStartRotation = props.rotation;
                        }
                        activeHandle = handle;
                        return;
                    }
                }
            }

            // Check if clicking on a layer (for dragging)
            for (let i = animationData.layers.length - 1; i >= 0; i--) {
                const layer = animationData.layers[i];
                if (!layer.visible) continue;

                const props = interpolateLayerProperties(layer, currentTime);
                if (props && layer.image && isPointInImage(mx, my, props, layer.image)) {
                    // Save state before starting to drag
                    saveState('Move Layer');

                    // Preserve keyframe selection if we're clicking the same layer
                    selectLayer(i, i === selectedLayerIndex);
                    isDragging = true;
                    dragOffsetX = mx - props.x;
                    dragOffsetY = my - props.y;
                    return;
                }
            }

            // Clicked on empty space
            selectLayer(null);
        }

        function mouseDragged() {
            if (isPlaying || selectedLayerIndex === null) return;

            const layer = animationData.layers[selectedLayerIndex];
            const props = interpolateLayerProperties(layer, currentTime);

            if (isDragging && props) {
                // Create a clean copy to avoid mutating the interpolated object
                const newProps = {
                    x: mouseX - dragOffsetX,
                    y: mouseY - dragOffsetY,
                    scaleX: props.scaleX,
                    scaleY: props.scaleY,
                    rotation: props.rotation
                };
                updateLayerAtCurrentTime(layer, newProps);
                updatePropertiesPanel();
            } else if (isScaling && activeHandle && props && layer.image) {
                // Better scaling logic based on handle position
                // Transform mouse positions to local space (accounting for rotation)
                const angle = -scaleStartRotation * (Math.PI / 180);

                // Start position in local space
                const startDx = scaleStartMouseX - scaleStartX;
                const startDy = scaleStartMouseY - scaleStartY;
                const startLocalX = startDx * Math.cos(angle) - startDy * Math.sin(angle);
                const startLocalY = startDx * Math.sin(angle) + startDy * Math.cos(angle);

                // Current position in local space
                const currDx = mouseX - scaleStartX;
                const currDy = mouseY - scaleStartY;
                const currLocalX = currDx * Math.cos(angle) - currDy * Math.sin(angle);
                const currLocalY = currDx * Math.sin(angle) + currDy * Math.cos(angle);

                // Calculate scale change based on which corner
                const imgW = layer.image.width / 2;
                const imgH = layer.image.height / 2;

                // Determine which corner based on initial local position
                const isLeft = startLocalX < 0;
                const isTop = startLocalY < 0;

                // Calculate scale factors
                let scaleFactorX = 1;
                let scaleFactorY = 1;

                if (isLeft) {
                    scaleFactorX = (startLocalX - currLocalX) / imgW / scaleStartScaleX + 1;
                } else {
                    scaleFactorX = (currLocalX - startLocalX) / imgW / scaleStartScaleX + 1;
                }

                if (isTop) {
                    scaleFactorY = (startLocalY - currLocalY) / imgH / scaleStartScaleY + 1;
                } else {
                    scaleFactorY = (currLocalY - startLocalY) / imgH / scaleStartScaleY + 1;
                }

                // Apply scale - shift key controls proportional scaling
                let newScaleX, newScaleY;
                if (keyIsDown(SHIFT)) {
                    // Shift pressed: maintain aspect ratio (proportional scaling)
                    const avgScale = (scaleFactorX + scaleFactorY) / 2;
                    newScaleX = Math.max(0.1, Math.min(5, scaleStartScaleX * avgScale));
                    newScaleY = Math.max(0.1, Math.min(5, scaleStartScaleY * avgScale));
                } else {
                    // No shift: free scaling (independent X and Y)
                    newScaleX = Math.max(0.1, Math.min(5, scaleStartScaleX * scaleFactorX));
                    newScaleY = Math.max(0.1, Math.min(5, scaleStartScaleY * scaleFactorY));
                }

                // Create a clean copy to avoid mutating the interpolated object
                const newProps = {
                    x: scaleStartX,
                    y: scaleStartY,
                    scaleX: newScaleX,
                    scaleY: newScaleY,
                    rotation: scaleStartRotation
                };

                updateLayerAtCurrentTime(layer, newProps);
                updatePropertiesPanel();
            } else if (isRotating && props) {
                // Calculate rotation based on continuous mouse angle delta
                const dx = mouseX - props.x;
                const dy = mouseY - props.y;
                let currentAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

                // Calculate delta from previous frame
                let frameDelta = currentAngle - rotatePreviousAngle;

                // Normalize frame delta to shortest rotation (-180 to 180)
                if (frameDelta > 180) {
                    frameDelta -= 360;
                } else if (frameDelta < -180) {
                    frameDelta += 360;
                }

                // Accumulate the delta
                rotateAccumulatedDelta += frameDelta;

                // Update previous angle for next frame
                rotatePreviousAngle = currentAngle;

                // Apply accumulated delta to starting rotation
                let newRotation = rotateStartRotation + rotateAccumulatedDelta;

                // Create a clean copy to avoid mutating the interpolated object
                const newProps = {
                    x: props.x,
                    y: props.y,
                    scaleX: props.scaleX,
                    scaleY: props.scaleY,
                    rotation: newRotation
                };
                updateLayerAtCurrentTime(layer, newProps);
                updatePropertiesPanel();
            }
        }

        function mouseReleased() {
            // Just reset the interaction flags
            // State was already saved when interaction started (mousePressed)
            isDragging = false;
            isScaling = false;
            isRotating = false;
            activeHandle = null;
        }

        function getHandleAtPosition(x, y, props, img) {
            if (!img) return null;

            const handleSize = 16; // Larger hit area for easier clicking
            const w = img.width * props.scaleX / 2;
            const h = img.height * props.scaleY / 2;

            // Transform mouse position to object's local space
            const dx = x - props.x;
            const dy = y - props.y;

            // Rotate point to match object's rotation
            const angle = -props.rotation * (Math.PI / 180);
            const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
            const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

            // Helper function for distance check
            function distSq(x1, y1, x2, y2) {
                const dx = x2 - x1;
                const dy = y2 - y1;
                return dx * dx + dy * dy;
            }

            const handleSizeSq = handleSize * handleSize;

            // Check rotation handle (above the image)
            if (distSq(localX, localY, 0, -h - 30) < handleSizeSq) {
                return 'rotate';
            }

            // Check corner handles
            if (distSq(localX, localY, -w, -h) < handleSizeSq) {
                return 'tl';
            }
            if (distSq(localX, localY, w, -h) < handleSizeSq) {
                return 'tr';
            }
            if (distSq(localX, localY, -w, h) < handleSizeSq) {
                return 'bl';
            }
            if (distSq(localX, localY, w, h) < handleSizeSq) {
                return 'br';
            }

            return null;
        }

        function isPointInImage(x, y, props, img) {
            if (!img) return false;

            // Transform point to local space
            const dx = x - props.x;
            const dy = y - props.y;

            // Rotate point to match object's rotation
            const angle = -props.rotation * (Math.PI / 180);
            const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
            const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

            // Check if inside bounds (with a bit of padding for easier clicking)
            const w = img.width * props.scaleX / 2;
            const h = img.height * props.scaleY / 2;

            return Math.abs(rotatedX) <= w && Math.abs(rotatedY) <= h;
        }

        // Canvas size is fixed at 800x600 for consistency between editor and preview
        function windowResized() {
            // Keep canvas at fixed size
            resizeCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        }

