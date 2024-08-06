// ==UserScript==
// @name         Envato CM Sentence Caser
// @namespace    http://tampermonkey.net/
// @version      2024-08-06
// @description  Convert Envato content headers to sentence case
// @author       You
// @match        https://tutsplus.com/*
// @match        https://*.tutsplus.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tutsplus.com
// @grant        none
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// ==/UserScript==

const toKeep = [
    "Illustrator",
    "InDesign",
    "Photoshop",
    "Affinity Designer",
    "Affinity Photo",
    "Affinity Publisher",
    "Affinity",
    "Procreate",
    "PaintTool SAI",
    "Pixelmator",
    "iPhone",
    "iOS",
    "Tuts+",
    "CorelDRAW",
    "Inkscape",
    "Design Space",
    "AI",
    "PowerPoint",
    "Keynote",
    "Google Docs",
    "Google Slides",
    "Google",
    "Excel",
    "Microsoft Word",
    "Microsoft",
    "Outlook",
    "Gmail",
    "Lightroom",
    "Adobe Camera Raw",
    "Capture One",
    "Gemstone",
    "Photo Mechanic",
    "After Effects",
    "Adobe Premiere",
    "Premiere Pro",
    "Davinci Resolve",
    "Cinema 4D",
    "Blender",
    "Final Cut Pro",
    "Apple Motion",
    "OBS",
    "Camtasia",
    "Screenflow",
    "Kapwing",
    "Runway",
    "Adobe Rush",
    "CapCut",
    "Spline",
    "Spline3D",
    "3D",
    "CSS",
    "Envato Elements",
    "HTML",
    "HTML5",
    "JavaScript",
    "YouTube",
    "Figma",
    "Adobe XD",
    "Sublime Text",
    "Visual Studio Code",
    "Visual Studio",
    "MailChimp",
    "Webflow",
    "Campaign Monitor",
    "WordPress",
    "CMS",
    "Elementor",
    "SVG",
    "UX",
    "UI",
    "UX/UI",
    "SEO",
    "eCommerce",
    "Shopify",
    "WooCommerce",
    "BigCommerce",
    "Magento",
    "Android",
    "Python",
    "Ruby on Rails",
    "Ruby",
    "AWS",
    "SQL",
    "PHP",
    "Audacity",
    "Ableton",
    "Ableton Pro",
    "Reaper",
    "Pro Tools",
    "Fairlight",
    "Cubase",
    "Garageband",
    "Logic Pro",
    "CV",
    "Cricut",
    "Placeit",
    "Kotlin",
    "Time Magazine",
    "Instagram",
    "Twitter",
    "Facebook",
    "TikTok",
    "Adobe",
    "Envato",
    "Leo the Lion",
    "Netflix",
    "Amazon"
];

function firstLetterUpper(theString) {
  console.log(theString);
  //var newString = theString.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g,function(c){return c.toUpperCase()});
  var newString = theString
    .toLowerCase()
    .replace("vs.", "vs")
    .replace(/(^[0-9\.]+\s*\w\s*|^\s*\w|[\.\!\?]\s*\w)/g,function(c){return c.toUpperCase()})
    .replace(/\bvs\b/g, "vs.");
  return newString;
}

function sentenceCase(theString) {
    var newString = firstLetterUpper(theString);
    for (var i = 0; i < toKeep.length; i++) {
        newString = newString.replace(new RegExp("\\b" + toKeep[i].toLowerCase() + "\\b", "gi"), toKeep[i]);
    }
    console.log(theString);
    console.log(newString);
    return(newString);
}

(function() {
    'use strict';
    jQuery.noConflict();

    if (document.location.href.includes("tutsplus.com")) {
        jQuery(":header, span.visual-toc__heading-title").text(function(i, text) { return(sentenceCase(text)) });
    }
})();
