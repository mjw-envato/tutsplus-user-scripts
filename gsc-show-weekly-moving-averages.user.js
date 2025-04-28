// ==UserScript==
// @name         GSC Show Moving Average Button
// @namespace    https://envato.com/
// @version      1.0
// @description  Adds a button ('SHOW AVG') to Google Search Console performance graphs to toggle a 7-day moving average overlay (visual smoothing only).
// @author       Gemini & MJW
// @match        https://search.google.com/search-console/performance/search-analytics*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// @updateURL    https://mjw-envato.github.io/tutsplus-user-scripts/gsc-show-weekly-moving-averages.user.js
// @downloadURL  https://mjw-envato.github.io/tutsplus-user-scripts/gsc-show-weekly-moving-averages.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const movingAverageWindow = 7;
    const newPathStrokeWidth = '2'; // Stroke width for the MA lines
    const originalPathOpacity = '0.3'; // Opacity for the faded original daily lines
    const seriesIds = ['Clicks', 'Impressions', 'CTR', 'Position']; // Series to process
    const customButtonId = 'gsc-ma-toggle-button'; // Unique ID for the button
    const customButtonIcon = ''; // Material Symbols ligature for 'timeline' icon
    const customButtonText = 'SHOW AVG';
    const injectionDelay = 1000; // Delay in ms before trying to inject the button (adjust if needed)

    // --- 1. Define the Moving Average Application Function ---
    function applyMovingAverageOverlay() {
        console.log(`[GSC MA Script] Running Moving Average Application...`);
        console.log(`[GSC MA Script] Applying ${movingAverageWindow}-day moving average overlay to series: ${seriesIds.join(', ')}...`);
        console.warn("[GSC MA Script] --- IMPORTANT ---");
        console.warn("[GSC MA Script] This script applies VISUAL SMOOTHING to the SVG path coordinates.");
        console.warn("[GSC MA Script] The resulting lines DO NOT represent statistically correct moving averages (especially for CTR/Position), which require raw data (Clicks/Impressions).");
        console.warn("[GSC MA Script] ---");

        // Helper Function to parse SVG 'd' attribute
        function parsePathData(d) {
             if (!d) return [];
             const points = [];
             const regex = /[ML]\s*([\d.-]+)\s*,\s*([\d.-]+)/g;
             let match;
             while ((match = regex.exec(d)) !== null) {
                 points.push([parseFloat(match[1]), parseFloat(match[2])]);
             }
             return points;
        }

        // Process each defined series ID
        seriesIds.forEach(seriesId => {
             console.log(`[GSC MA Script] Processing series: "${seriesId}"`);
             const pathSelector = `g[series-id="${seriesId}"] path.RWgCYc-bdKbFb`; // This class might change in future GSC updates!
             const originalPathElement = document.querySelector(pathSelector);

             const overlayId = `moving-average-overlay-${seriesId}`; // ID for the overlay path
             const parentGElement = document.querySelector(`g[series-id="${seriesId}"]`); // Get parent G element directly

             // Clean up old overlay first, regardless of whether original path exists now
             if(parentGElement){
                  const oldOverlay = parentGElement.querySelector(`#${overlayId}`);
                  if (oldOverlay) {
                       oldOverlay.remove();
                       // console.log(`[GSC MA Script] Removed previous overlay for "${seriesId}".`); // Can be verbose
                  }
             } else {
                  // If parent G doesn't even exist, skip
                  // console.log(`[GSC MA Script] Parent G element not found for "${seriesId}". Skipping.`); // Can be verbose
                  return;
             }

             // If original path doesn't exist now (series deselected), we're done for this series
             if (!originalPathElement) {
                 console.log(`[GSC MA Script] Original path not found for "${seriesId}" (likely deselected). Overlay removed if present.`);
                 // If original path exists but is hidden, reset its opacity
                 const hiddenPath = parentGElement.querySelector(`path.RWgCYc-bdKbFb`);
                 if (hiddenPath) hiddenPath.style.opacity = ''; // Reset opacity if user toggles series off/on
                 return;
             }

             // --- Process existing path ---
             let originalColor = 'grey';
             try { originalColor = window.getComputedStyle(originalPathElement).stroke; if (!originalColor || originalColor === 'none' || originalColor === 'transparent') { originalColor = 'grey'; }} catch (e) { /* Ignore error, use grey */ }
             const originalClipPath = originalPathElement.getAttribute('clip-path');
             const dAttribute = originalPathElement.getAttribute('d');

             if (!dAttribute) { console.error(`[GSC MA Script] Error: Could not get 'd' attribute for "${seriesId}". Skipping.`); return; }

             const dailyPoints = parsePathData(dAttribute);

             if (dailyPoints.length < movingAverageWindow) {
                 console.warn(`[GSC MA Script] Warning: Path for "${seriesId}" has only ${dailyPoints.length} points (< ${movingAverageWindow}). Skipping MA calculation.`);
                 originalPathElement.style.opacity = originalPathOpacity; // Still fade short paths
                 return;
             }

             const movingAveragePoints = [];
             for (let i = movingAverageWindow - 1; i < dailyPoints.length; i++) {
                 let sumY = 0; let count = 0;
                 for (let j = 0; j < movingAverageWindow; j++) { if(dailyPoints[i - j]?.[1] !== undefined && !isNaN(dailyPoints[i-j][1])) { sumY += dailyPoints[i - j][1]; count++; } }
                 movingAveragePoints.push([dailyPoints[i]?.[0], count > 0 ? sumY / count : NaN]); // Store X even if Y is NaN for index alignment
             }

             const validMaPoints = movingAveragePoints.filter(p => p?.[0] !== undefined && !isNaN(p[0]) && p?.[1] !== undefined && !isNaN(p[1]));
             if (validMaPoints.length === 0) { console.warn(`[GSC MA Script] No valid moving average points for "${seriesId}" after filtering NaN. Skipping draw.`); return; }

             let newD = `M${validMaPoints[0][0].toFixed(3)},${validMaPoints[0][1].toFixed(3)}`;
             for (let i = 1; i < validMaPoints.length; i++) { newD += ` L${validMaPoints[i][0].toFixed(3)},${validMaPoints[i][1].toFixed(3)}`; }

             const svgNS = 'http://www.w3.org/2000/svg';
             const newPathElement = document.createElementNS(svgNS, 'path');
             newPathElement.setAttribute('d', newD); newPathElement.setAttribute('fill', 'none'); newPathElement.setAttribute('stroke', originalColor); newPathElement.setAttribute('stroke-width', newPathStrokeWidth); if (originalClipPath) { newPathElement.setAttribute('clip-path', originalClipPath); } newPathElement.setAttribute('id', overlayId);

             originalPathElement.style.opacity = originalPathOpacity; // Fade original
             parentGElement.appendChild(newPathElement); // Append new path
             // console.log(`[GSC MA Script] Applied MA overlay for "${seriesId}".`); // Can be verbose
        }); // End forEach seriesId
        console.log("[GSC MA Script] Finished processing all series.");
    }

    // --- 2. Inject the Custom Button ---
    function injectCustomButton() {
        if (document.getElementById(customButtonId)) {
            // console.log("[GSC MA Script] Custom button already exists."); // Less verbose
            return;
        }

        // --- Find EXPORT button by content (more robust) ---
        let exportButtonElement = null;
        let buttonWrapper = null;
        const potentialButtons = document.querySelectorAll('div[role="button"], button'); // Look for divs and actual buttons

        for (const btn of potentialButtons) {
            const buttonText = btn.innerText?.trim().toUpperCase();
            if (buttonText && buttonText.includes('EXPORT')) {
                // Check if it's likely the correct header button
                if (btn.closest('div.DoV6xc')) { // Check if it's within the main header div structure
                    exportButtonElement = btn;
                    buttonWrapper = btn.parentElement; // Assume parent is the correct container
                    break;
                }
            }
        }

        if (!exportButtonElement || !buttonWrapper) {
            console.error("[GSC MA Script] Error: Could not find the EXPORT button or its wrapper based on text content. Cannot inject button.");
            return;
        }
        console.log("[GSC MA Script] Found EXPORT button, injecting custom button...");
        // --- End Button Finding Logic ---

        const newButton = document.createElement('div');
        newButton.setAttribute('role', 'button');
        newButton.setAttribute('id', customButtonId);
        const exportClasses = exportButtonElement.className || 'U26fgb c7fp5b FS4hgd fk7Kgf DDDVge'; // Use export's classes or fallback
        newButton.className = exportClasses;
        ['jscontroller', 'jsaction', 'aria-disabled', 'tabindex'].forEach(attr => { if (exportButtonElement.hasAttribute(attr)) { newButton.setAttribute(attr, exportButtonElement.getAttribute(attr)); } });
        newButton.setAttribute('aria-label', `Show ${movingAverageWindow}-day Moving Average`);
        newButton.setAttribute('tabindex', '0'); // Ensure focusable
        newButton.style.marginRight = '8px';
        newButton.style.userSelect = 'none';

        // Create button's inner content using safe DOM methods
        const div1 = document.createElement('div'); div1.className = 'lVYxmb MbhUzd'; newButton.appendChild(div1);
        const div2 = document.createElement('div'); div2.className = 'g4jUVc'; newButton.appendChild(div2);
        const spanOuter = document.createElement('span'); spanOuter.className = 'I3EnF oJeWuf'; newButton.appendChild(spanOuter);
        const spanInner = document.createElement('span'); spanInner.className = 'NlWrkb snByac'; spanOuter.appendChild(spanInner);
        const divContent = document.createElement('div'); divContent.className = 'gIhoZ'; spanInner.appendChild(divContent);

        // Add Icon
        const spanIcon = document.createElement('span');
        const exportIconSpan = exportButtonElement.querySelector('.DPvwYc'); // Try to find export icon classes
        spanIcon.className = exportIconSpan ? exportIconSpan.className : 'DPvwYc ddlHze'; // Use same classes or fallback
        spanIcon.setAttribute('aria-hidden', 'true');
        spanIcon.textContent = customButtonIcon;
        divContent.appendChild(spanIcon);

        // Add Text
        const spanText = document.createElement('span');
        spanText.className = 'izuYW';
        spanText.textContent = customButtonText;
        divContent.appendChild(spanText);

        // Add Click Listener
        newButton.addEventListener('click', (event) => {
             console.log(`[GSC MA Script] '${customButtonIcon} ${customButtonText}' button clicked.`);
             event.stopPropagation();
             applyMovingAverageOverlay();
        });

        // Insert the new button before the EXPORT button
        buttonWrapper.insertBefore(newButton, exportButtonElement);
        console.log(`[GSC MA Script] Custom button '${customButtonIcon} ${customButtonText}' injected successfully.`);
    }

    // --- 3. Run the button injection logic after a delay ---
    // Ensures GSC elements are likely loaded. Increase delay if button doesn't appear reliably.
    console.log('[GSC MA Script] Initializing...');
    setTimeout(injectCustomButton, injectionDelay);

})(); // End of Userscript IIFE
