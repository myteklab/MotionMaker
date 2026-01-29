/**
 * export-manager.js
 *
 * Animation Export (GIF/MP4) for MotionMaker
 * Handles exporting animations to video formats
 *
 * Dependencies:
 * - Global variables: animationData, currentProjectId, currentProjectName
 * - Functions: getAnimationEndTime(), getBackgroundColor(), interpolateLayerProperties()
 * - Functions: showToast(), saveState()
 * - External libraries: gif.js, MediaRecorder API
 */

        function showExportModal() {
            if (!currentProjectId) {
                showToast('Save your project first!', 'error');
                return;
            }

            if (animationData.layers.length === 0) {
                showToast('Add some layers first!', 'error');
                return;
            }

            document.getElementById('export-modal').classList.add('active');
            document.getElementById('export-progress').style.display = 'none';
            document.getElementById('export-confirm-btn').disabled = false;
            updateExportOptions(); // Set initial format info
        }

        function closeExportModal() {
            document.getElementById('export-modal').classList.remove('active');
        }

        // Embed Modal Functions
        function showEmbedModal() {
            if (!currentProjectId) {
                showToast('Please save your project first', 'error');
                return;
            }

            // Generate the preview hash
            const previewHash = CryptoJS.SHA256(currentProjectId + 'motionmaker_preview_salt_2025').toString();
            const embedUrl = `https://www.mytekos.com/beta/applications/MotionMaker/preview.php?hash=${previewHash}&embed=1`;

            // Generate initial embed code
            updateEmbedCode();

            document.getElementById('embed-modal').classList.add('active');
        }

        function closeEmbedModal() {
            document.getElementById('embed-modal').classList.remove('active');
        }

        function updateEmbedCode() {
            if (!currentProjectId) return;

            const width = document.getElementById('embed-width').value;
            const height = document.getElementById('embed-height').value;
            const previewHash = CryptoJS.SHA256(currentProjectId + 'motionmaker_preview_salt_2025').toString();
            const embedUrl = `https://www.mytekos.com/beta/applications/MotionMaker/preview.php?hash=${previewHash}&embed=1`;

            const embedCode = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen style="border: none;"></iframe>`;

            document.getElementById('embed-code').value = embedCode;
        }

        function copyEmbedCode() {
            const embedCodeEl = document.getElementById('embed-code');
            embedCodeEl.select();

            navigator.clipboard.writeText(embedCodeEl.value).then(() => {
                const icon = document.getElementById('copy-embed-icon');
                const originalIcon = icon.textContent;
                icon.textContent = '✓';

                setTimeout(() => {
                    icon.textContent = originalIcon;
                }, 2000);

                showToast('Embed code copied to clipboard!', 'success');
            }).catch(() => {
                showToast('Failed to copy embed code', 'error');
            });
        }

        function updateExportOptions() {
            const format = document.getElementById('export-format').value;
            const infoDiv = document.getElementById('format-info');
            const confirmBtn = document.getElementById('export-confirm-btn');

            if (format === 'mp4') {
                infoDiv.innerHTML = '<strong style="color: #6c5ce7;">MP4 Video:</strong> Smooth playback from first frame, smaller file size, better quality. Works in most modern browsers and apps.';
                confirmBtn.innerHTML = '<span>🎬</span> Export MP4';
            } else {
                infoDiv.innerHTML = '<strong style="color: #e74c3c;">Animated GIF:</strong> Universal compatibility but may be choppy on first playback. File size is larger. GIFs are best for short, simple animations.';
                confirmBtn.innerHTML = '<span>🎬</span> Export GIF';
            }
        }

        async function startExport() {
            const format = document.getElementById('export-format').value;

            if (format === 'mp4') {
                await startMp4Export();
            } else {
                await startGifExport();
            }
        }

        async function startGifExport() {
            const fps = parseInt(document.getElementById('export-fps').value);
            const shouldLoop = document.getElementById('export-loop-checkbox').checked;
            const animationEndTime = getAnimationEndTime();
            const frameDuration = 1000 / fps;
            const totalFrames = Math.ceil(animationEndTime / frameDuration);

            console.log('Export settings:', { fps, shouldLoop, animationEndTime, frameDuration, totalFrames });

            // Show progress
            document.getElementById('export-progress').style.display = 'block';
            document.getElementById('export-gif-confirm-btn').disabled = true;
            updateExportProgress(0, 'Rendering frames...');

            try {
                // Create GIF encoder with optimized settings for smooth playback
                const gif = new GIF({
                    workers: 2,
                    quality: 5, // Balance between quality and file size (1-30, lower is better)
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    repeat: shouldLoop ? 0 : -1, // 0 = loop forever, -1 = no loop
                    workerScript: 'assets/libs/gif.js/gif.worker.js',
                    dither: false, // Disable dithering for smoother playback
                    transparent: null // No transparency for better performance
                });

                // Render each frame with consistent timing
                for (let frame = 0; frame < totalFrames; frame++) {
                    const frameTime = frame * frameDuration;

                    // Use consistent frame delay throughout (no first-frame delay)
                    await renderFrameToGif(frameTime, gif, frameDuration);

                    // Update progress
                    const progress = ((frame + 1) / totalFrames) * 50; // 50% for rendering
                    updateExportProgress(progress, `Rendering frame ${frame + 1}/${totalFrames}...`);
                }

                // Encode GIF
                updateExportProgress(50, 'Encoding GIF...');

                gif.on('progress', (p) => {
                    updateExportProgress(50 + (p * 50), 'Encoding GIF...');
                });

                gif.on('finished', async (blob) => {
                    updateExportProgress(100, 'Uploading to your files...');

                    // Upload to MyTekOS
                    await uploadToMyTekOS(blob, 'gif');

                    closeExportModal();
                    showToast('GIF exported to your files! 🎬');
                });

                gif.render();

            } catch (error) {
                console.error('Error exporting GIF:', error);
                showToast('Failed to export GIF', 'error');
                closeExportModal();
            }
        }

        async function startMp4Export() {
            const fps = parseInt(document.getElementById('export-fps').value);
            const shouldLoop = document.getElementById('export-loop-checkbox').checked;
            const animationEndTime = getAnimationEndTime();

            document.getElementById('export-progress').style.display = 'block';
            document.getElementById('export-confirm-btn').disabled = true;
            updateExportProgress(0, 'Loading images...');

            try {
                // Load all layer images as HTML Image objects
                const layerImages = await Promise.all(
                    animationData.layers.map(layer => {
                        return new Promise((resolve) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => resolve({ layer, img });
                            img.onerror = () => resolve({ layer, img: null });
                            img.src = layer.imageUrl;
                        });
                    })
                );

                updateExportProgress(10, 'Preparing video...');

                // Create offscreen canvas for recording
                const recordCanvas = document.createElement('canvas');
                recordCanvas.width = CANVAS_WIDTH;
                recordCanvas.height = CANVAS_HEIGHT;
                const recordCtx = recordCanvas.getContext('2d');

                // Set up MediaRecorder
                const stream = recordCanvas.captureStream(fps);
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 5000000 // 5 Mbps for good quality
                });

                const chunks = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    updateExportProgress(90, 'Finalizing video...');

                    // Create blob from chunks
                    const webmBlob = new Blob(chunks, { type: 'video/webm' });

                    // Upload to MyTekOS
                    updateExportProgress(95, 'Uploading to your files...');
                    await uploadToMyTekOS(webmBlob, 'mp4');

                    closeExportModal();
                    showToast('MP4 exported to your files! 🎬');
                };

                mediaRecorder.onerror = (e) => {
                    console.error('MediaRecorder error:', e);
                    showToast('Failed to record video', 'error');
                    closeExportModal();
                };

                // Start recording
                mediaRecorder.start();

                // Render animation frames
                const frameDuration = 1000 / fps;
                const totalFrames = Math.ceil(animationEndTime / frameDuration);
                let currentFrame = 0;

                const renderFrame = () => {
                    if (currentFrame >= totalFrames) {
                        // Finished rendering all frames
                        if (shouldLoop) {
                            // For looping, render the animation multiple times
                            currentFrame = 0;
                            const loopCount = 3; // Render 3 loops for looping videos
                            let currentLoop = 0;

                            const renderLoop = () => {
                                if (currentLoop >= loopCount) {
                                    mediaRecorder.stop();
                                    return;
                                }

                                if (currentFrame >= totalFrames) {
                                    currentFrame = 0;
                                    currentLoop++;
                                }

                                const frameTime = currentFrame * frameDuration;

                                // Clear canvas
                                recordCtx.fillStyle = animationData.settings.backgroundColor;
                                recordCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                                // Render all layers
                                layerImages.forEach(({ layer, img }) => {
                                    if (!layer.visible || !img) return;
                                    const props = interpolateLayerProperties(layer, frameTime);
                                    if (props) {
                                        recordCtx.save();
                                        recordCtx.translate(props.x, props.y);
                                        recordCtx.rotate(props.rotation * Math.PI / 180);
                                        recordCtx.scale(props.scaleX, props.scaleY);
                                        recordCtx.globalAlpha = (layer.opacity || 255) / 255;
                                        recordCtx.drawImage(img, -img.width / 2, -img.height / 2);
                                        recordCtx.restore();
                                    }
                                });

                                currentFrame++;
                                const totalLoopFrames = totalFrames * loopCount;
                                const progress = ((currentLoop * totalFrames + currentFrame) / totalLoopFrames) * 90;
                                updateExportProgress(progress, `Recording video... ${Math.round(progress)}%`);

                                setTimeout(renderLoop, frameDuration);
                            };

                            renderLoop();
                        } else {
                            // Non-looping video
                            mediaRecorder.stop();
                        }
                        return;
                    }

                    const frameTime = currentFrame * frameDuration;

                    // Clear canvas
                    recordCtx.fillStyle = animationData.settings.backgroundColor;
                    recordCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                    // Render all layers
                    layerImages.forEach(({ layer, img }) => {
                        if (!layer.visible || !img) return;
                        const props = interpolateLayerProperties(layer, frameTime);
                        if (props) {
                            recordCtx.save();
                            recordCtx.translate(props.x, props.y);
                            recordCtx.rotate(props.rotation * Math.PI / 180);
                            recordCtx.scale(props.scaleX, props.scaleY);
                            recordCtx.globalAlpha = (layer.opacity || 255) / 255;
                            recordCtx.drawImage(img, -img.width / 2, -img.height / 2);
                            recordCtx.restore();
                        }
                    });

                    currentFrame++;
                    const progress = (currentFrame / totalFrames) * 90;
                    updateExportProgress(progress, `Recording video... ${Math.round(progress)}%`);

                    setTimeout(renderFrame, frameDuration);
                };

                renderFrame();

            } catch (error) {
                console.error('Error exporting MP4:', error);
                showToast('Failed to export MP4', 'error');
                closeExportModal();
            }
        }

        async function renderFrameToGif(time, gif, frameDuration) {
            return new Promise((resolve) => {
                // Create an offscreen canvas for this frame
                const offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = CANVAS_WIDTH;
                offscreenCanvas.height = CANVAS_HEIGHT;
                const ctx = offscreenCanvas.getContext('2d');

                // Draw background
                ctx.fillStyle = animationData.settings.backgroundColor;
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                // Track images loaded
                let imagesLoaded = 0;
                const totalImages = animationData.layers.filter(l => l.visible).length;

                if (totalImages === 0) {
                    gif.addFrame(offscreenCanvas, {delay: frameDuration});
                    resolve();
                    return;
                }

                // Render all visible layers at this time
                animationData.layers.forEach((layer, index) => {
                    if (!layer.visible) return;

                    const props = interpolateLayerProperties(layer, time);
                    if (!props) {
                        imagesLoaded++;
                        if (imagesLoaded === totalImages) {
                            gif.addFrame(offscreenCanvas, {delay: frameDuration});
                            resolve();
                        }
                        return;
                    }

                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        ctx.save();
                        ctx.translate(props.x, props.y);
                        ctx.rotate(props.rotation * Math.PI / 180);
                        ctx.scale(props.scaleX, props.scaleY);
                        ctx.globalAlpha = (layer.opacity || 255) / 255;
                        ctx.drawImage(img, -img.width / 2, -img.height / 2);
                        ctx.restore();

                        imagesLoaded++;
                        if (imagesLoaded === totalImages) {
                            gif.addFrame(offscreenCanvas, {delay: frameDuration});
                            resolve();
                        }
                    };
                    img.onerror = () => {
                        imagesLoaded++;
                        if (imagesLoaded === totalImages) {
                            gif.addFrame(offscreenCanvas, {delay: frameDuration});
                            resolve();
                        }
                    };
                    img.src = layer.imageUrl;
                });
            });
        }

        async function uploadToMyTekOS(blob, format) {
            // Use current project name with format suffix
            const filename = currentProjectName + '_' + format;
            const extension = format === 'mp4' ? 'mp4' : 'gif';

            const formData = new FormData();
            formData.append('name', filename);
            formData.append('file_upload', true);
            formData.append('upload_ext', extension);
            formData.append('file_data', blob, filename + '.' + extension);

            const response = await fetch('https://www.mytekos.com/beta/api/v1/projects/export', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!data.project_id) {
                throw new Error(data.error || 'Failed to upload GIF');
            }

            return data;
        }

        function updateExportProgress(percent, status) {
            document.getElementById('export-progress-bar').style.width = percent + '%';
            document.getElementById('export-status').textContent = status;
        }
