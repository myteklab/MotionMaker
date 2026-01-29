/**
 * Interpolation Module
 * Handles property interpolation between keyframes and easing functions
 * Dependencies: None (self-contained)
 */

// Interpolate properties for a specific layer at a given time
function interpolateLayerProperties(layer, time) {
    if (!layer || layer.keyframes.length === 0) return null;

    if (layer.keyframes.length === 1) {
        return { ...layer.keyframes[0] };
    }

    // Check if smooth playback is enabled - if so, skip exact keyframe matching for ultra-smooth animation
    const smoothPlaybackCheckbox = document.getElementById('smooth-playback-checkbox');
    const smoothPlaybackEnabled = smoothPlaybackCheckbox ? smoothPlaybackCheckbox.checked : (animationData.smoothPlayback || false);

    if (!smoothPlaybackEnabled) {
        // First check if we're exactly ON a keyframe (within 100ms threshold)
        // This provides precise control but may cause slight slowdowns at keyframes
        const threshold = 100;
        const exactKeyframe = layer.keyframes.find(kf => Math.abs(kf.time - time) < threshold);
        if (exactKeyframe) {
            // Return the exact keyframe's properties (including its visibility state)
            return { ...exactKeyframe };
        }
    }

    let prevKeyframe = layer.keyframes[0];
    let nextKeyframe = layer.keyframes[layer.keyframes.length - 1];

    for (let i = 0; i < layer.keyframes.length - 1; i++) {
        if (layer.keyframes[i].time <= time && layer.keyframes[i + 1].time >= time) {
            prevKeyframe = layer.keyframes[i];
            nextKeyframe = layer.keyframes[i + 1];
            break;
        }
    }

    if (time < prevKeyframe.time) return { ...prevKeyframe };
    if (time > nextKeyframe.time) return { ...nextKeyframe };

    // Calculate linear progress between keyframes
    const progress = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);

    // Apply easing function from the previous keyframe (easing TO next keyframe)
    const easingType = prevKeyframe.easing || 'linear';
    const easedProgress = applyEasing(progress, easingType);

    return {
        x: lerp(prevKeyframe.x, nextKeyframe.x, easedProgress),
        y: lerp(prevKeyframe.y, nextKeyframe.y, easedProgress),
        scaleX: lerp(prevKeyframe.scaleX, nextKeyframe.scaleX, easedProgress),
        scaleY: lerp(prevKeyframe.scaleY, nextKeyframe.scaleY, easedProgress),
        rotation: lerp(prevKeyframe.rotation, nextKeyframe.rotation, easedProgress),
        // Use prevKeyframe's visible state during transition (boolean, not interpolated)
        visible: prevKeyframe.visible !== false // Default to true if not set
    };
}

// Linear interpolation helper
function lerp(start, end, progress) {
    return start + (end - start) * progress;
}

// Update or create global background keyframe at current time
function updateBackgroundKeyframe(time, color) {
    const threshold = 100; // 100ms threshold
    let bgKeyframe = animationData.backgroundKeyframes.find(kf => Math.abs(kf.time - time) < threshold);

    if (bgKeyframe) {
        // Update existing keyframe
        console.log('Updating existing background keyframe at', bgKeyframe.time, 'to color', color);
        saveState('Update Background Keyframe');
        bgKeyframe.color = color;
        bgKeyframe.time = time;
    } else {
        // Create new keyframe
        console.log('Creating new background keyframe at', time, 'with color', color);
        saveState('Create Background Keyframe');
        animationData.backgroundKeyframes.push({ time: time, color: color });
        animationData.backgroundKeyframes.sort((a, b) => a.time - b.time);
    }

    // Update visual timeline
    renderBackgroundKeyframes();
}

// Get interpolated background color from global background keyframes
function getBackgroundColor(time) {
    if (!animationData.backgroundKeyframes || animationData.backgroundKeyframes.length === 0) {
        return animationData.settings.backgroundColor || '#2c3e50';
    }

    if (animationData.backgroundKeyframes.length === 1) {
        return animationData.backgroundKeyframes[0].color;
    }

    // Find surrounding keyframes
    let prevKf = animationData.backgroundKeyframes[0];
    let nextKf = animationData.backgroundKeyframes[animationData.backgroundKeyframes.length - 1];

    for (let i = 0; i < animationData.backgroundKeyframes.length - 1; i++) {
        if (animationData.backgroundKeyframes[i].time <= time && animationData.backgroundKeyframes[i + 1].time >= time) {
            prevKf = animationData.backgroundKeyframes[i];
            nextKf = animationData.backgroundKeyframes[i + 1];
            break;
        }
    }

    if (time < prevKf.time) return prevKf.color;
    if (time > nextKf.time) return nextKf.color;

    // Interpolate between colors
    const progress = (time - prevKf.time) / (nextKf.time - prevKf.time);
    return interpolateColor(prevKf.color, nextKf.color, progress);
}

// Interpolate between two hex colors (custom function to avoid conflict with p5.lerpColor)
function interpolateColor(color1, color2, progress) {
    // Convert hex to RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 44, g: 62, b: 80 }; // Default to #2c3e50
    };

    // Convert RGB to hex
    const rgbToHex = (r, g, b) => {
        return "#" + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join('');
    };

    const c1 = hexToRgb(color1 || '#2c3e50');
    const c2 = hexToRgb(color2 || '#2c3e50');

    const r = lerp(c1.r, c2.r, progress);
    const g = lerp(c1.g, c2.g, progress);
    const b = lerp(c1.b, c2.b, progress);

    return rgbToHex(r, g, b);
}

// Easing functions - convert linear progress (0-1) to eased progress (0-1)
const easingFunctions = {
    linear: t => t,

    // Quadratic
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    // Cubic
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    // Quartic
    easeInQuart: t => t * t * t * t,
    easeOutQuart: t => 1 - (--t) * t * t * t,
    easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

    // Back (overshoots then settles)
    easeInBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    },
    easeOutBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOutBack: t => {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },

    // Elastic (spring-like effect)
    easeInElastic: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
    easeOutElastic: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    easeInOutElastic: t => {
        const c5 = (2 * Math.PI) / 4.5;
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    },

    // Bounce
    easeOutBounce: t => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
};

// Apply easing function to linear progress
function applyEasing(progress, easingType) {
    const easingFunc = easingFunctions[easingType] || easingFunctions.linear;
    return easingFunc(progress);
}
