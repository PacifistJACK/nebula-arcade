import { useState, useEffect } from 'react';

/**
 * Custom hook for touch detection and handling
 */
export const useTouch = () => {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        // Detect if device supports touch
        const checkTouch = () => {
            return 'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                navigator.msMaxTouchPoints > 0;
        };
        setIsTouchDevice(checkTouch());
    }, []);

    /**
     * Handle tap/click events
     */
    const handleTap = (element, callback) => {
        if (!element) return;

        const handler = (e) => {
            e.preventDefault();
            callback(e);
        };

        if (isTouchDevice) {
            element.addEventListener('touchstart', handler);
            return () => element.removeEventListener('touchstart', handler);
        } else {
            element.addEventListener('click', handler);
            return () => element.removeEventListener('click', handler);
        }
    };

    /**
     * Handle swipe gestures
     * @param {number} minDistance - Minimum swipe distance in pixels
     */
    const handleSwipe = (element, callback, minDistance = 50) => {
        if (!element) return;

        let touchStart = null;
        let touchEnd = null;

        const onTouchStart = (e) => {
            touchEnd = null;
            touchStart = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        };

        const onTouchMove = (e) => {
            touchEnd = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        };

        const onTouchEnd = () => {
            if (!touchStart || !touchEnd) return;

            const deltaX = touchEnd.x - touchStart.x;
            const deltaY = touchEnd.y - touchStart.y;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // Determine swipe direction
            if (absX > absY && absX > minDistance) {
                // Horizontal swipe
                callback(deltaX > 0 ? 'right' : 'left');
            } else if (absY > absX && absY > minDistance) {
                // Vertical swipe
                callback(deltaY > 0 ? 'down' : 'up');
            }
        };

        element.addEventListener('touchstart', onTouchStart);
        element.addEventListener('touchmove', onTouchMove);
        element.addEventListener('touchend', onTouchEnd);

        return () => {
            element.removeEventListener('touchstart', onTouchStart);
            element.removeEventListener('touchmove', onTouchMove);
            element.removeEventListener('touchend', onTouchEnd);
        };
    };

    /**
     * Get touch position from event
     */
    const getTouchPosition = (e) => {
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
        return { x: e.clientX, y: e.clientY };
    };

    return {
        isTouchDevice,
        handleTap,
        handleSwipe,
        getTouchPosition
    };
};
