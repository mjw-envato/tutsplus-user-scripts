// ==UserScript==
// @name         Envato YouTube Link Tagger
// @namespace    http://tampermonkey.net/
// @version      0.1.23
// @description  Automatically add the correct UTM tags to links in Envato and Tuts+ YouTube video descriptions
// @author       MichaelJW
// @match        https://studio.youtube.com/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.0.slim.min.js
// @run-at       document-idle
// @downloadURL  https://mjw-envato.github.io/tutsplus-user-scripts/youtube_url_tagger.user.js
// @updateURL    https://mjw-envato.github.io/tutsplus-user-scripts/youtube_url_tagger.user.js
// ==/UserScript==

/* globals $ */
/* globals ytcfg */

'use strict';
let MJW = {};

function tryToSetUpUI() {
    // It takes a while for ytcfg to be defined so it might not be ready yet
    if (typeof(ytcfg) != "undefined") {
        MJW.channel = "";
        if (ytcfg.get("CHANNEL_ID") == "UC8lxnUR_CzruT2KA6cb7p0Q") {
            MJW.channel = "Tuts+";
        } else if (ytcfg.get("CHANNEL_ID") == "UCJr72fY4cTaNZv7WPbvjaSw") {
            MJW.channel = "Envato";
        }
        if (document.location.href.match("/video/([^/]+)/") != null) {
            MJW.videoId = document.location.href.match("/video/([^/]+)/")[1];
        } else {
            MJW.videoID = "";
        }
    }
    if (MJW.channel != "") {
        if ($("#MJW_description_url_params_button_MJW").length == 0 && document.location.href.search("/video/[^/]+/edit") > -1 && $("#description-container.description").length > 0) {
            MJW.descButton = $("<input type='button' id='MJW_description_url_params_button_MJW' value='Set URL Parameters' title='URL parameters seem fine.'/>").insertBefore("#description-container.description");
            MJW.descButton.on("click", fixURLParametersDescription);
            $($("#description-container #textbox")[0]).on('focus', function() { MJW.descriptionOnFocus = $("#description-container #textbox")[0].textContent; });
            $($("#description-container #textbox")[0]).on('blur keyup paste', descriptionHasChanged);

            let fixedDescription = fixURLParameters($("#description-container #textbox")[0].textContent);
            if ($("#description-container #textbox")[0].textContent != fixedDescription) {
                MJW.descButton[0].value = "Set URL Parameters (*)";
                MJW.descButton[0].title = "Description has changed since URL parameters were last checked.";
            } else {
                MJW.lastFixedDescription = fixedDescription;
            }
        }

        if ($("#MJW_card_url_params_button_MJW").length == 0 && document.location.href.search("/video/[^/]+/edit") > -1 && $("#url-input").length > 0) {
            let cardButton = $("<input type='button' id='MJW_card_url_params_button_MJW' value='Set URL Parameters' />").insertBefore("#url-input");
            cardButton.on("click", fixURLParametersCard);
        }
    }
};
// Keep calling this function, because the page might change via AJAX and anything could change, from UI to URL
setInterval(tryToSetUpUI, 500);

function descriptionHasChanged() {
    if ($("#description-container #textbox")[0].textContent != MJW.descriptionOnFocus) {
        MJW.descButton[0].value = "Set URL Parameters (*)";
        MJW.descButton[0].title = "Description has changed since URL parameters were last checked.";
    }
    if (typeof(MJW.lastFixedDescription) != "undefined" && $("#description-container #textbox")[0].textContent == MJW.lastFixedDescription) {
        MJW.descButton[0].value = "Set URL Parameters";
        MJW.descButton[0].title = "URL parameters seem fine.";
    }
}

function fixURLParameters(originalText) {
    const unnecessaryParamsRE = /((?:twitter\.com|facebook\.com|pixabay\.com|github\.com|s3\.amazonaws\.com|cdn\.tutsplus\.com)(?:\/[%\.a-zA-Z0-9/\-_]*|))(?:\?[a-zA-Z0-9-_=&\.]*|)/gi;
    const envatoURLPattern = /(\/\/[^/]*)(placeit\.net|envato\.com|elements\.envato\.com|twenty20\.com|mixkit\.co|tutsplus\.com|graphicriver\.net|themeforest\.net|codecanyon\.net|videohive\.net|audiojungle\.net|photodune\.net|3docean\.net)(\/[\.a-zA-Z0-9/%+-]*|)(\?[^\)\s,]*|)/gi;
    const utmCampaignsToKeep = [
        /utm_campaign=yt_tutsplus_promo/,
        /utm_campaign=[a-z]+_social_eyt_promo/,
        /utm_campaign=yt_tutsplus_march_flash_sale/,
        /utm_campaign=elements_social_eyt_TKLaunch_14May/,
        /utm_campaign=yt_tutsplus_p-[a-zA-Z0-9_-]+-p_[a-zA-Z0-9_-]+/,
        /utm_campaign=[a-z]+_social_eyt_p-[a-zA-Z0-9_-]+-p_[a-zA-Z0-9_-]+/
    ];

    let editedText = originalText;
    editedText = editedText.replaceAll(unnecessaryParamsRE, "$1");

    let envatoURLs = editedText.matchAll(envatoURLPattern);
    envatoURLs = [...envatoURLs];

    // loop backwards because we'll be changing the indices of the matches as we change the content
    for (let i = envatoURLs.length - 1; i >= 0; i--) {
        let originalURL = envatoURLs[i][0];
        let domain = envatoURLs[i][1] + envatoURLs[i][2];
        let path = envatoURLs[i][3];
        let paramString = envatoURLs[i][4].replace(/^\?/, "");
        let replacementStartLocation = envatoURLs[i].index;
        let replacementEndLocation = replacementStartLocation + originalURL.length;

        // These are Envato domains but we don't ever want to change their parameters, so skip them
        if (domain.includes("cdn\.tutsplus\.com") || domain.includes("cms-assets\.tutsplus\.com")) {
            continue;
        }

        let params = paramString.split("&");

        // Get first coupon code used, if there is one
        let couponCode = params.find(param => /coupon_code=.+/.test(param));

        // Get first of each UTM codes used, if there are some
        let utmCampaign = params.find(param => /utm_campaign=.+/.test(param));
        let utmMedium = params.find(param => /utm_medium=.+/.test(param));
        let utmSource = params.find(param => /utm_source=.+/.test(param));
        let utmContent = params.find(param => /utm_content=.+/.test(param));

        // Should we keep the existing UTM codes or replace them with the defaults based on channel and video ID?
        if (utmCampaign != undefined && utmCampaignsToKeep.find(toKeep => toKeep.test(utmCampaign)) != undefined) {
            // do nothing
        } else {
            if (MJW.channel == "Tuts+") {
                utmCampaign = "utm_campaign=yt_tutsplus_" + MJW.videoId;
                utmMedium = "utm_medium=referral";
                utmSource = "utm_source=youtube.com";
                utmContent = "utm_content=description";
            } else if (MJW.channel == "Envato") {
                if (/placeit\.net/i.test(domain)) utmCampaign = "utm_campaign=placeit_social_eyt_" + MJW.videoId;
                if (/elements\.envato\.com/i.test(domain)) utmCampaign = "utm_campaign=elements_social_eyt_" + MJW.videoId;
                if (/mixkit\.co/i.test(domain)) utmCampaign = "utm_campaign=mixkit_social_eyt_" + MJW.videoId;
                if (/twenty20\.com/i.test(domain)) utmCampaign = "utm_campaign=twenty20_social_eyt_" + MJW.videoId;
                if (/(graphicriver\.net|themeforest\.net|codecanyon\.net|videohive\.net|audiojungle\.net|photodune\.net|3docean\.net)/i.test(domain)) utmCampaign = "utm_campaign=market_social_eyt_" + MJW.videoId;
                if (/(\/\/|www\.|webuild\.|reports\.|affiliates\.|community\.|forum\.|blog\.|support\.|press\.|forums\.|api\.|account\.|sites\.|intranet\.)(envato\.com)/i.test(domain)) utmCampaign = "utm_campaign=envato_social_eyt_" + MJW.videoId;
                if (/tutsplus.com/i.test(domain)) utmCampaign = "utm_campaign=tutsplus_social_eyt_" + MJW.videoId;
                utmMedium = "utm_medium=social";
                utmSource = "utm_source=YouTube";
                utmContent = "utm_content=description";
            }
        }

        let otherParams = params.filter(param => !(/^(?:utm_campaign|utm_source|utm_content|utm_medium|coupon_code)=/i.test(param)));

        let newURLParams = [couponCode, utmCampaign, utmMedium, utmSource, utmContent, otherParams].flat().filter(element => element != undefined).join("&").replace(/&$/, "");

        // Starting June 16 we found that YouTube does not treat URL parameters as part of the link if they are tacked on to a bare (sub)domain without trailing space.
        // https://elements.envato.com?utm_[...] does not include the URL parameters, but
        // https://elements.envato.com/?utm_[...] does.
        // This does not seem to affect URLs that link to a page or folder.
        if (path == '') path = '/';

        let editedURL = domain + path;
        if (newURLParams != undefined && newURLParams != "") editedURL = editedURL + "?" + newURLParams;

        editedText = editedText.substring(0, replacementStartLocation) + editedURL + editedText.substring(replacementEndLocation);
    }

    return editedText;
}

function fixURLParametersDescription() {
    MJW.originalDescription = $("#description-container #textbox")[0].textContent;
    let editedDescription = fixURLParameters(MJW.originalDescription);

    // Log the original so we have some kind of backup
    console.log(MJW.originalDescription);
    // Change the contents of the box
    $("#description-container #textbox")[0].textContent = editedDescription;

    // Fake manual entry so the site will update the character count and show "Your description is too long" if necessary
    $("#description-container #textbox")[0].focus();
    $("#description-container #textbox")[0].dispatchEvent(new Event('input'));

    MJW.descButton[0].value = "Set URL Parameters";
    MJW.descButton[0].title = "URL parameters seem fine.";
    MJW.lastFixedDescription = editedDescription;
}

function fixURLParametersCard() {
    let originalURL = $("#url-input")[0].value;
    let editedURL = fixURLParameters(originalURL);

    // Change the contents of the box
    $("#url-input")[0].value = editedURL;

    // Fake manual entry so the site will still validate the new URL
    $("#url-input")[0].focus();
    $("#url-input")[0].dispatchEvent(new Event('input'));
}