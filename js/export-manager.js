/**
 * export-manager.js
 *
 * Animation Export (GIF/MP4) for MotionMaker (standalone)
 * Handles exporting animations to video formats via local download.
 * When running on a platform, the platform adapter can override uploadExport().
 *
 * Dependencies:
 * - Global variables: animationData, currentProjectId, currentProjectName
 * - Functions: getAnimationEndTime(), getBackgroundColor(), interpolateLayerProperties()
 * - Functions: showToast(), saveState()
 * - External libraries: gif.js, MediaRecorder API
 */

        function showExportModal() {
            if (animationData.layers.length === 0) {
                showToast('Add some layers first!', 'error');
                return;
            }

            document.getElementById('export-modal').classList.add('active');
            document.getElementById('export-progress').style.display = 'none';
            document.getElementById('export-confirm-btn').disabled = false;
            updateExportOptions();
        }

        function closeExportModal() {
            document.getElementById('export-modal').classList.remove('active');
        }

        // Embed Modal Functions
        function showEmbedModal() {
            showToast('Embed codes are available when running on the platform.', 'info');
        }

        function closeEmbedModal() {
            var modal = document.getElementById('embed-modal');
            if (modal) modal.classList.remove('active');
        }

        function updateEmbedCode() {
            // No-op in standalone mode.
        }

        function copyEmbedCode() {
            var embedCodeEl = document.getElementById('embed-code');
            if (!embedCodeEl) return;
            embedCodeEl.select();

            navigator.clipboard.writeText(embedCodeEl.value).then(function () {
                var icon = document.getElementById('copy-embed-icon');
                var originalIcon = icon.textContent;
                icon.textContent = '\u2713';

                setTimeout(function () {
                    icon.textContent = originalIcon;
                }, 2000);

                showToast('Embed code copied to clipboard!', 'success');
            }).catch(function () {
                showToast('Failed to copy embed code', 'error');
            });
        }

        function updateExportOptions() {
            var format = document.getElementById('export-format').value;
            var infoDiv = document.getElementById('format-info');
            var confirmBtn = document.getElementById('export-confirm-btn');

            if (format === 'mp4') {
                infoDiv.innerHTML = '<strong style="color: #6c5ce7;">MP4 Video:</strong> Smooth playback from first frame, smaller file size, better quality. Works in most modern browsers and apps.';
                confirmBtn.innerHTML = '<span>🎬</span> Export MP4';
            } else {
                infoDiv.innerHTML = '<strong style="color: #e74c3c;">Animated GIF:</strong> Universal compatibility but may be choppy on first playback. File size is larger. GIFs are best for short, simple animations.';
                confirmBtn.innerHTML = '<span>🎬</span> Export GIF';
            }
        }

        async function startExport() {
            var format = document.getElementById('export-format').value;

            if (format === 'mp4') {
                await startMp4Export();
            } else {
                await startGifExport();
            }
        }

        async function startGifExport() {
            var fps = parseInt(document.getElementById('export-fps').value);
            var shouldLoop = document.getElementById('export-loop-checkbox').checked;
            var animationEndTime = getAnimationEndTime();
            var frameDuration = 1000 / fps;
            var totalFrames = Math.ceil(animationEndTime / frameDuration);

            console.log('Export settings:', { fps, shouldLoop, animationEndTime, frameDuration, totalFrames });

            // Show progress
            document.getElementById('export-progress').style.display = 'block';
            document.getElementById('export-gif-confirm-btn').disabled = true;
            updateExportProgress(0, 'Rendering frames...');

            try {
                // Create GIF encoder with optimized settings for smooth playback
                var gif = new GIF({
                    workers: 2,
                    quality: 5,
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    repeat: shouldLoop ? 0 : -1,
                    workerScript: 'libs/gif.js/gif.worker.js',
                    dither: false,
                    transparent: null
                });

                // Render each frame with consistent timing
                for (var frame = 0; frame < totalFrames; frame++) {
                    var frameTime = frame * frameDuration;
                    await renderFrameToGif(frameTime, gif, frameDuration);

                    var progress = ((frame + 1) / totalFrames) * 50;
                    updateExportProgress(progress, 'Rendering frame ' + (frame + 1) + '/' + totalFrames + '...');
                }

                // Encode GIF
                updateExportProgress(50, 'Encoding GIF...');

                gif.on('progress', function (p) {
                    updateExportProgress(50 + (p * 50), 'Encoding GIF...');
                });

                gif.on('finished', function (blob) {
                    updateExportProgress(100, 'Done!');
                    downloadExport(blob, 'gif');
                    closeExportModal();
                    showToast('GIF exported! 🎬');
                });

                gif.render();

            } catch (error) {
                console.error('Error exporting GIF:', error);
                showToast('Failed to export GIF', 'error');
                closeExportModal();
            }
        }

        async function startMp4Export() {
            var fps = parseInt(document.getElementById('export-fps').value);
            var shouldLoop = document.getElementById('export-loop-checkbox').checked;
            var animationEndTime = getAnimationEndTime();

            document.getElementById('export-progress').style.display = 'block';
            document.getElementById('export-confirm-btn').disabled = true;
            updateExportProgress(0, 'Loading images...');

            try {
                // Load all layer images as HTML Image objects
                var layerImages = await Promise.all(
                    animationData.layers.map(function (layer) {
                        return new Promise(function (resolve) {
                            var img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = function () { resolve({ layer: layer, img: img }); };
                            img.onerror = function () { resolve({ layer: layer, img: null }); };
                            img.src = layer.imageUrl;
                        });
                    })
                );

                updateExportProgress(10, 'Preparing video...');

                // Create offscreen canvas for recording
                var recordCanvas = document.createElement('canvas');
                recordCanvas.width = CANVAS_WIDTH;
                recordCanvas.height = CANVAS_HEIGHT;
                var recordCtx = recordCanvas.getContext('2d');

                // Set up MediaRecorder
                var stream = recordCanvas.captureStream(fps);
                var mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 5000000
                });

                var chunks = [];
                mediaRecorder.ondataavailable = function (e) {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = function () {
                    updateExportProgress(100, 'Done!');
                    var webmBlob = new Blob(chunks, { type: 'video/webm' });
                    downloadExport(webmBlob, 'mp4');
                    closeExportModal();
                    showToast('MP4 exported! 🎬');
                };

                mediaRecorder.onerror = function (e) {
                    console.error('MediaRecorder error:', e);
                    showToast('Failed to record video', 'error');
                    closeExportModal();
                };

                // Start recording
                mediaRecorder.start();

                // Render animation frames
                var frameDuration = 1000 / fps;
                var totalFrames = Math.ceil(animationEndTime / frameDuration);
                var currentFrame = 0;

                var renderFrame = function () {
                    if (currentFrame >= totalFrames) {
                        if (shouldLoop) {
                            currentFrame = 0;
                            var loopCount = 3;
                            var currentLoop = 0;

                            var renderLoop = function () {
                                if (currentLoop >= loopCount) {
                                    mediaRecorder.stop();
                                    return;
                                }

                                if (currentFrame >= totalFrames) {
                                    currentFrame = 0;
                                    currentLoop++;
                                }

                                var frameTime = currentFrame * frameDuration;

                                recordCtx.fillStyle = animationData.settings.backgroundColor;
                                recordCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                                layerImages.forEach(function (item) {
                                    if (!item.layer.visible || !item.img) return;
                                    var props = interpolateLayerProperties(item.layer, frameTime);
                                    if (props) {
                                        recordCtx.save();
                                        recordCtx.translate(props.x, props.y);
                                        recordCtx.rotate(props.rotation * Math.PI / 180);
                                        recordCtx.scale(props.scaleX, props.scaleY);
                                        recordCtx.globalAlpha = (item.layer.opacity || 255) / 255;
                                        recordCtx.drawImage(item.img, -item.img.width / 2, -item.img.height / 2);
                                        recordCtx.restore();
                                    }
                                });

                                currentFrame++;
                                var totalLoopFrames = totalFrames * loopCount;
                                var progress = ((currentLoop * totalFrames + currentFrame) / totalLoopFrames) * 90;
                                updateExportProgress(progress, 'Recording video... ' + Math.round(progress) + '%');

                                setTimeout(renderLoop, frameDuration);
                            };

                            renderLoop();
                        } else {
                            mediaRecorder.stop();
                        }
                        return;
                    }

                    var frameTime = currentFrame * frameDuration;

                    recordCtx.fillStyle = animationData.settings.backgroundColor;
                    recordCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                    layerImages.forEach(function (item) {
                        if (!item.layer.visible || !item.img) return;
                        var props = interpolateLayerProperties(item.layer, frameTime);
                        if (props) {
                            recordCtx.save();
                            recordCtx.translate(props.x, props.y);
                            recordCtx.rotate(props.rotation * Math.PI / 180);
                            recordCtx.scale(props.scaleX, props.scaleY);
                            recordCtx.globalAlpha = (item.layer.opacity || 255) / 255;
                            recordCtx.drawImage(item.img, -item.img.width / 2, -item.img.height / 2);
                            recordCtx.restore();
                        }
                    });

                    currentFrame++;
                    var progress = (currentFrame / totalFrames) * 90;
                    updateExportProgress(progress, 'Recording video... ' + Math.round(progress) + '%');

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
            return new Promise(function (resolve) {
                var offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = CANVAS_WIDTH;
                offscreenCanvas.height = CANVAS_HEIGHT;
                var ctx = offscreenCanvas.getContext('2d');

                ctx.fillStyle = animationData.settings.backgroundColor;
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                var imagesLoaded = 0;
                var totalImages = animationData.layers.filter(function (l) { return l.visible; }).length;

                if (totalImages === 0) {
                    gif.addFrame(offscreenCanvas, { delay: frameDuration });
                    resolve();
                    return;
                }

                animationData.layers.forEach(function (layer) {
                    if (!layer.visible) return;

                    var props = interpolateLayerProperties(layer, time);
                    if (!props) {
                        imagesLoaded++;
                        if (imagesLoaded === totalImages) {
                            gif.addFrame(offscreenCanvas, { delay: frameDuration });
                            resolve();
                        }
                        return;
                    }

                    var img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = function () {
                        ctx.save();
                        ctx.translate(props.x, props.y);
                        ctx.rotate(props.rotation * Math.PI / 180);
                        ctx.scale(props.scaleX, props.scaleY);
                        ctx.globalAlpha = (layer.opacity || 255) / 255;
                        ctx.drawImage(img, -img.width / 2, -img.height / 2);
                        ctx.restore();

                        imagesLoaded++;
                        if (imagesLoaded === totalImages) {
                            gif.addFrame(offscreenCanvas, { delay: frameDuration });
                            resolve();
                        }
                    };
                    img.onerror = function () {
                        imagesLoaded++;
                        if (imagesLoaded === totalImages) {
                            gif.addFrame(offscreenCanvas, { delay: frameDuration });
                            resolve();
                        }
                    };
                    img.src = layer.imageUrl;
                });
            });
        }

        /**
         * Download an exported blob as a file.
         * Platform adapter can override this to upload instead.
         */
        function downloadExport(blob, format) {
            var extension = format === 'mp4' ? 'webm' : 'gif';
            var filename = (currentProjectName || 'animation') + '.' + extension;
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        function updateExportProgress(percent, status) {
            document.getElementById('export-progress-bar').style.width = percent + '%';
            document.getElementById('export-status').textContent = status;
        }
