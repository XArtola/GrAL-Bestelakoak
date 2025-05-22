// Self-executing function with error handling
(function() {
    try {
        console.log("Script starting...");
        
        // Get ALL scrollable elements
        function getAllScrollableElements() {
            console.log("Searching for scrollable elements...");
            
            // Get all elements
            const allElements = document.querySelectorAll('*');
            const scrollableElements = [];
            
            // Check each element for scroll properties
            for (let el of allElements) {
                // Check if element has scrollHeight > clientHeight (meaning it can scroll)
                if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
                    scrollableElements.push({
                        type: "content",
                        element: el,
                        scrollHeight: el.scrollHeight,
                        clientHeight: el.clientHeight
                    });
                    console.log("Found scrollable element:", el);
                }
            }
            
            // Sort by most scrollable (scrollHeight - clientHeight)
            scrollableElements.sort((a, b) => {
                return (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight);
            });
            
            console.log(`Found ${scrollableElements.length} scrollable elements`);
            return scrollableElements.length > 0 ? scrollableElements[0] : null;
        }

        // Get the target element to scroll - now with fallback to getAllScrollableElements
        function getTargetElement() {
            try {
                // Try the scrollbar elements first
                let verticalScrollbar = document.querySelector(".scrollbar.vertical");
                let verticalSlider = verticalScrollbar ? verticalScrollbar.querySelector(".slider") : null;
                
                if (verticalScrollbar && verticalSlider) {
                    console.log("Found vertical scrollbar element!");
                    return {
                        type: "scrollbar",
                        element: verticalScrollbar,
                        slider: verticalSlider
                    };
                }
                
                // Try the original selector
                let contentElement = document.querySelector("#workbench\\.parts\\.sidebar > div.content");
                
                if (contentElement) {
                    console.log("Found content element with original selector");
                    return {
                        type: "content",
                        element: contentElement
                    };
                }
                
                // Try alternative selectors
                console.log("Primary selectors failed, trying alternatives...");
                const possibleSelectors = [
                    ".sidebar .content", 
                    "#workbench\\.parts\\.sidebar",
                    "#sidebar",
                    ".sidebar",
                    "[role='presentation'][class*='scrollbar vertical']",
                    ".invisible.scrollbar.vertical"
                ];
                
                for (let selector of possibleSelectors) {
                    let element = document.querySelector(selector);
                    if (element) {
                        console.log(`Found element with selector: ${selector}`);
                        return {
                            type: "content",
                            element: element
                        };
                    }
                }
                
                // Fallback: find any scrollable element
                console.log("No specific element found. Trying to find ANY scrollable element...");
                return getAllScrollableElements();
            } catch (error) {
                console.error("Error in getTargetElement:", error);
                return null;
            }
        }

        // Function to perform the scroll with better error handling
        function performScroll(target, direction, amount) {
            try {
                if (!target) {
                    console.error("Cannot scroll: No target provided");
                    return false;
                }
                
                if (target.type === "scrollbar") {
                    // For scrollbar elements, we move the slider directly
                    let slider = target.slider;
                    let transform = slider.style.transform;
                    let currentY = 0;
                    
                    // Extract the current Y position from transform
                    if (transform) {
                        let match = transform.match(/translate3d\(\s*\d+px\s*,\s*([0-9.e+]+)px/i);
                        if (match && match[1]) {
                            currentY = parseFloat(match[1]);
                        }
                    }
                    
                    // Adjust the position
                    if (direction === 'down') {
                        currentY += amount;
                    } else {
                        currentY -= amount;
                    }
                    
                    // Make sure it doesn't go negative
                    currentY = Math.max(0, currentY);
                    
                    // Apply the new transform
                    slider.style.transform = `translate3d(0px, ${currentY}px, 0px)`;
                    currentPosition = currentY;
                    
                    return true;
                } else if (target.type === "content") {
                    // For content elements, adjust scrollTop directly
                    if (direction === 'down') {
                        target.element.scrollTop += amount;
                    } else {
                        target.element.scrollTop -= amount;
                    }
                    currentPosition = target.element.scrollTop;
                    console.log(`Scrolled ${direction} by ${amount}px. New position: ${currentPosition}`);
                    return true;
                }
                
                return false;
            } catch (error) {
                console.error("Error in performScroll:", error);
                return false;
            }
        }
        
        // Variables for auto-scrolling
        let autoScrollInterval = null;
        let scrollSpeed = 5; // Higher starting speed to see effects more clearly
        let scrollDirection = 'down';
        let currentPosition = 0;
        
        // Start auto scrolling with improved error handling
        function startAutoScroll(direction = 'down', speed = 5) {
            try {
                // Clear any existing interval
                stopAutoScroll();
                
                scrollDirection = direction;
                scrollSpeed = speed;
                
                const target = getTargetElement();
                
                if (!target) {
                    console.error("❌ Cannot start scrolling - no target element found");
                    return;
                }
                
                console.log(`✅ Starting auto-scroll: direction=${direction}, speed=${speed}, target type=${target.type}`);
                console.log("Target element:", target.element);
                
                // Simple immediate scroll test to confirm functionality
                console.log("Performing test scroll...");
                performScroll(target, direction, speed);
                
                // Ensure we're tracking our interval properly
                autoScrollInterval = setInterval(() => {
                    const success = performScroll(target, scrollDirection, scrollSpeed);
                    if (!success) {
                        console.error("Failed to scroll, stopping interval");
                        stopAutoScroll();
                    }
                }, 50); // Slightly slower interval for more reliable execution
                
                // Add the notification without visual indicator
                console.log("✅ AUTO-SCROLL ACTIVE");
                
                return true;
            } catch (error) {
                console.error("Error in startAutoScroll:", error);
                return false;
            }
        }

        // Stop auto scrolling
        function stopAutoScroll() {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
                removeVisualIndicator();
            }
        }

        // Add visual indicator
        function addVisualIndicator() {
            removeVisualIndicator(); // Remove any existing indicator
            
            const indicator = document.createElement('div');
            indicator.id = 'scroll-indicator';
            indicator.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(0,255,0,0.5);padding:5px;z-index:9999;font-family:Arial;';
            indicator.textContent = `Scrolling ${scrollDirection} at speed ${scrollSpeed}`;
            document.body.appendChild(indicator);
        }

        // Remove visual indicator
        function removeVisualIndicator() {
            const indicator = document.getElementById('scroll-indicator');
            if (indicator) {
                indicator.remove();
            }
        }

        // Reverse scroll direction
        function reverseDirection() {
            scrollDirection = scrollDirection === 'down' ? 'up' : 'down';
            updateVisualIndicator();
            return scrollDirection;
        }

        // Update visual indicator
        function updateVisualIndicator() {
            const indicator = document.getElementById('scroll-indicator');
            if (indicator) {
                indicator.textContent = `Scrolling ${scrollDirection} at speed ${scrollSpeed}`;
            }
        }
        
        // Start scrolling immediately
        console.log('Auto-scroll starting...');
        startAutoScroll(scrollDirection, scrollSpeed);
        
        // Make controls available globally for manual adjustments if needed
        window.sidebarScroller = {
            increaseSpeed: () => { 
                scrollSpeed += 1; 
                console.log(`Speed increased to: ${scrollSpeed}`);
                updateVisualIndicator(); 
            },
            decreaseSpeed: () => { 
                if (scrollSpeed > 1) scrollSpeed -= 1; 
                console.log(`Speed decreased to: ${scrollSpeed}`);
                updateVisualIndicator();
            },
            stop: () => { 
                stopAutoScroll(); 
                console.log('Scrolling stopped');
            },
            restart: () => {
                startAutoScroll(scrollDirection, scrollSpeed);
                console.log('Scrolling restarted');
            },
            reverse: () => {
                let newDirection = reverseDirection();
                console.log(`Direction reversed to: ${newDirection}`);
                stopAutoScroll();
                startAutoScroll(newDirection, scrollSpeed);
            },
            debug: () => {
                const target = getTargetElement();
                console.log('Target:', target);
                console.log('Current position:', currentPosition);
                console.log('Speed:', scrollSpeed);
                console.log('Direction:', scrollDirection);
                console.log('Interval active:', autoScrollInterval !== null);
                console.log('All scrollable elements:', getAllScrollableElements());
                return target;
            }
        };
        
        console.log("Script initialization complete. Use sidebarScroller.debug() to troubleshoot.");
    } catch (e) {
        console.error("FATAL ERROR in scrolling script:", e);
    }
})();
