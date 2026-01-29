/**
 * animation-controls.js
 *
 * Play/Stop Functions for MotionMaker
 * Controls animation playback state
 *
 * Dependencies:
 * - Global variables: isPlaying, currentTime
 * - Functions: getAnimationEndTime(), updateTimeDisplay(), updatePlayhead()
 */

// Playback controls
function togglePlay() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('play-btn');
    const icon = document.getElementById('play-icon');

    if (isPlaying) {
        btn.textContent = '';
        btn.innerHTML = '<span id="play-icon">⏸️</span> Pause';
        const animationEndTime = getAnimationEndTime();
        if (currentTime >= animationEndTime) {
            currentTime = 0;
        }
    } else {
        btn.textContent = '';
        btn.innerHTML = '<span id="play-icon">▶️</span> Play';
    }
}

function stopAnimation() {
    isPlaying = false;
    currentTime = 0;
    const btn = document.getElementById('play-btn');
    btn.textContent = '';
    btn.innerHTML = '<span id="play-icon">▶️</span> Play';
    updateTimeDisplay();
    updatePlayhead();
}
