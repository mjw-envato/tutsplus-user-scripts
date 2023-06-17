// ==UserScript==
// @name         TubeBuddy Rankings to TSV
// @namespace    https://envato.com
// @version      0.2
// @updateURL	 https://mjw-envato.github.io/tutsplus-user-scripts/tubebuddy_scraper_all.user.js
// @description  Scrape search rankings from TubeBuddy
// @author       @michaeljw, @raguay
// @match        https://www.tubebuddy.com/keywordranktracking/*
// @require      https://code.jquery.com/jquery-3.7.0.slim.min.js
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_listValues
// ==/UserScript==

/* globals jQuery, $, waitForKeyElements */

var getRowwiseData = function(i, panelBody) {
    var toReturn = [];
    var table = $(panelBody).find("table.table.table-bordered.margin-bottom5");
    var videoIdRe = new RegExp("youtube\\.com/watch\\?v=(.*)");
    var channelIdRe = new RegExp("youtube\\.com/channel/(.*)");

    var id, type, name, tr;

    if (table.length > 0) {
        tr = table.find("tbody>tr");
        for (var j = 0; j < tr.length; j++) {
            name = $(tr[j]).find("td.middle:nth-child(3)>span.text-left").text();
            if (name != null && name != "") {
                var href = $(tr[j]).find("td.middle:nth-child(3)>a").attr("href");
                if (videoIdRe.exec(href) != null) {
                    id = videoIdRe.exec(href)[1];
                    type = "Video";
                } else if (channelIdRe.exec(href) != null) {
                    id = channelIdRe.exec(href)[1];
                    type = "Channel";
                }
                var ytRank = $(tr[j]).find("td.middle:nth-child(4)>span").text();
                ytRank = isNaN(ytRank) ? null : parseInt(ytRank);
                var googleRank = $(tr[j]).find("td.middle:nth-child(6)>span").text();
                googleRank = isNaN(googleRank) ? null : parseInt(googleRank);
                toReturn.push([type, id, name.trim().replace("\t", " "), href, ytRank, googleRank]);
            }
        }
    }
    return(toReturn);
};

var individualReport = function() {
    var final = [];
    var channelID = $("a.tb-external-channel").attr("href").split("/channel/")[1];

    var re = new RegExp("Data Collected on [a-zA-Z]+, ([^@]+) @");
    var dateString = re.exec($("i.fa-calendar").parent().text())[1];
    var parsedDateString = Date.parse(dateString);
    var reportDate = new Date(parsedDateString);
    var formattedReportDate = reportDate.toISOString().split("T")[0];

    var panelBodies = $("div.panel-body");
    for (var i = 0; i < panelBodies.length; i++) {
        var panelBody = panelBodies[i];
        var query = $(panelBody).find(".fa-search").parent().text().trim();
        var rowwise = getRowwiseData(i, panelBody);
        if (query != null && query != "" && rowwise != null && rowwise.length > 0) {
            var base = [formattedReportDate, query];
            for (var j = 0; j < rowwise.length; j++) {
                var row = base.concat(rowwise[j]);
                final.push(row);
            }
        }
    }

    var key = channelID + "_" + formattedReportDate;
    GM_setValue(key, final); // overwrite if exists
    console.log(key);
    console.log(final);
    final = GM_getValue(key, []);
    console.log(final);

    // Create the TSV
    var tsv = [];
    tsv.push(['date', 'query', 'type', 'id', 'name', 'url', 'ytRank', 'googleRank'].join("\t"));
    for (i = 0; i < final.length; i++) {
        tsv.push(final[i].join("\t"));
    }
    tsv = tsv.join("\n");

    var downloadPDF = $("a.btn#download-report");
    var downloadTSV = downloadPDF.clone();
    downloadTSV.attr("id", "download-tsv-report");
    downloadTSV.html(downloadTSV.html().replace("PDF", "TSV"));
    downloadTSV.attr('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(tsv));
    downloadTSV.attr('target', '_blank');
	downloadTSV.attr('download', 'TubeBuddy_' + channelID + "_report_" + formattedReportDate + '.csv');
    downloadTSV.prependTo(downloadPDF.parent());
};

var reportListing = function() {
    var final = [];
    var channelID = $("a.tb-external-channel").attr("href").split("/channel/")[1];

    var keys = GM_listValues();
    keys = keys.filter(function(value, index, array) { return value.search(channelID) > -1; });
    console.log(keys);

    var tsv = [];
    tsv.push(['date', 'query', 'type', 'id', 'name', 'url', 'ytRank', 'googleRank'].join("\t"));
    for (var i = 0; i < keys.length; i++) {
        var report = GM_getValue(keys[i], []);
        for (var j = 0; j < report.length; j++) {
            tsv.push(report[j].join("\t"));
        }
    }
    tsv = tsv.join("\n");

    var viewReport = $("a#viewReport")[0]
    var downloadTSV = $(viewReport).clone();
    downloadTSV.attr("id", "download-tsv-report");
    downloadTSV.attr("data-reportid", "");
    downloadTSV.removeClass("btn-loading");
    downloadTSV.text("Download TSV");
    downloadTSV.attr('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(tsv));
    downloadTSV.attr('target', '_blank');
	downloadTSV.attr('download', 'TubeBuddy_' + channelID + '_bulk_report.csv');
    downloadTSV.appendTo($("div.page-title"));
};

(function() {
    'use strict';
    if (document.location.href.search("/DisplayRankingReport/") > -1) {
        individualReport();
    } else if (document.location.href.search("/keywordrankingreport/") > -1) {
        reportListing();
    }
})();
