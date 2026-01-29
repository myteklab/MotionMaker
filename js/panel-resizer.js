/**
 * panel-resizer.js
 *
 * Panel Resize Functionality for MotionMaker
 * Handles properties panel and timeline resizing with localStorage persistence
 *
 * Dependencies:
 * - Global variables: isResizingPanel, isResizingTimeline
 * - DOM elements: #properties-panel, #timeline, .panel-resize-handle, .timeline-resize-handle
 */

        // Panel Resizing Functionality
        let isResizingPanel = false;
        let isResizingTimeline = false;

        // Properties Panel Resize (horizontal)
        const panelResizeHandle = document.getElementById('panel-resize-handle');
        const propertiesPanel = document.getElementById('properties-panel');

        panelResizeHandle.addEventListener('mousedown', (e) => {
            isResizingPanel = true;
            panelResizeHandle.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        // Timeline Resize (vertical)
        const timelineResizeHandle = document.getElementById('timeline-resize-handle');
        const timelineContainer = document.getElementById('timeline-container');

        timelineResizeHandle.addEventListener('mousedown', (e) => {
            isResizingTimeline = true;
            timelineResizeHandle.classList.add('resizing');
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        // Global mousemove handler for both resizers
        document.addEventListener('mousemove', (e) => {
            if (isResizingPanel) {
                const containerWidth = document.querySelector('.content').offsetWidth;
                const newWidth = containerWidth - e.clientX + document.querySelector('.content').getBoundingClientRect().left;

                // Constrain between min and max
                const constrainedWidth = Math.max(250, Math.min(600, newWidth));
                propertiesPanel.style.width = constrainedWidth + 'px';

                // Save to localStorage
                localStorage.setItem('motionmaker_panel_width', constrainedWidth);
            }

            if (isResizingTimeline) {
                const appContainer = document.querySelector('.app-container');
                const appRect = appContainer.getBoundingClientRect();
                const newHeight = appRect.bottom - e.clientY;

                // Constrain between min and max
                const constrainedHeight = Math.max(150, Math.min(500, newHeight));
                timelineContainer.style.height = constrainedHeight + 'px';

                // Save to localStorage
                localStorage.setItem('motionmaker_timeline_height', constrainedHeight);
            }
        });

        // Global mouseup handler
        document.addEventListener('mouseup', () => {
            if (isResizingPanel) {
                isResizingPanel = false;
                panelResizeHandle.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }

            if (isResizingTimeline) {
                isResizingTimeline = false;
                timelineResizeHandle.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });

        // Load saved panel sizes from localStorage
        function loadPanelSizes() {
            const savedPanelWidth = localStorage.getItem('motionmaker_panel_width');
            const savedTimelineHeight = localStorage.getItem('motionmaker_timeline_height');

            if (savedPanelWidth) {
                propertiesPanel.style.width = savedPanelWidth + 'px';
            }

            if (savedTimelineHeight) {
                timelineContainer.style.height = savedTimelineHeight + 'px';
            }
        }
