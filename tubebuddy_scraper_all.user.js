// ==UserScript==
// @name         TubeBuddy Rankings to TSV
// @namespace    https://envato.com
// @version      0.3
// @updateURL	   https://mjw-envato.github.io/tutsplus-user-scripts/tubebuddy_scraper_all.user.js
// @description  Scrape search rankings from TubeBuddy and perform needed functions.
// @author       @michaeljw, @raguay
// @match        https://www.tubebuddy.com/keywordranktracking/*
// @require      https://code.jquery.com/jquery-3.7.0.slim.min.js
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_listValues
// @grant GM_deleteValue
// ==/UserScript==

/* globals jQuery, $, waitForKeyElements */

//
// Change log:
//
// 06/20/2023     @raguay       Added the ability to clear out the reports and added the TubeBuddy 
//                              report id for proper finding on the main page. Also commented the code some.
//
// 06/24/2023     @raguay       Added the showing of a report already generated or not and the 
//                              framework for reporting error in page layout to update the program.
//

// 
// function:      showFormatError
//
// Description:   This function will display a message to the user that 
//                the page format has changed and the maintainer needs to 
//                be notified.
//
// Inputs:
//                ele     The element to append the message to.
//
var anError = false;

function showFormatError(ele) {
  $("<p>", {
    text: 'Please contact maintainer (richard.guay@envato.com) to fix the program.',
    style: 'background-color: red; margin: 20px; color: white; border-radius: 10px; padding: 10px;'
  }).appendTo(ele);
}

// 
// Function:      getRowwiseData
//
// Description:   From the panel-body element passed to the function, retrieve the needed informaiton and 
//                return it.
//
// Inputs:
//                i           Index of the row 
//                panelbody   The HTML DOM element with the information.
//
var getRowwiseData = function(i, panelBody) {
  // 
  // Initalize needed variables.
  //
  var toReturn = [];
  var table = $(panelBody).find("table.table.table-bordered.margin-bottom5");
  var videoIdRe = new RegExp("youtube\\.com/watch\\?v=(.*)");
  var channelIdRe = new RegExp("youtube\\.com/channel/(.*)");
  var id, type, name, tr;

  // 
  // Make sure it has a table.
  //
  if (table.length > 0) {
    // 
    // Get each row of the table and loop over it.
    //
    tr = table.find("tbody>tr");
    for (var j = 0; j < tr.length; j++) {
      //
      // Get the information from each row.
      //
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

        //
        // Save the row to the return value.
        //
        toReturn.push([type, id, name.trim().replace("\t", " "), href, ytRank, googleRank]);
      }
    }
  }
  // 
  // Return the results from scraping the talbe.
  //
  return(toReturn);
};

// 
// Function:      individualReport
//
// Description:   This function is ran on the report page. It will create the report from the 
//                data on that page.
//
// Inputs:
//                none
//
var individualReport = function() {
  //
  // Initalize variables and get the channelID.
  //
  var final = [];
  var channelID = $("a.tb-external-channel").attr("href").split("/channel/")[1];
  anError = false;

  // 
  // The reportID is TubeBuddy's unique report number. This is best used for reference for the report.
  //
  var reportID = $("a#download-report").attr("href").split("?id=")[1];

  // 
  // Create the regular expressions and data points for creating the report.
  //
  var re = new RegExp("Data Collected on [a-zA-Z]+, ([^@]+) @");
  var dateString = re.exec($("i.fa-calendar").parent().text())[1];
  var parsedDateString = Date.parse(dateString);
  var reportDate = new Date(parsedDateString);
  var formattedReportDate = reportDate.toISOString().split("T")[0];

  //
  // Loop over the `panel-body` divs to get the informaiton.
  //
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

  // 
  // Save the report into Tampermonkey memory for later use.
  //
  var key = channelID + "_-" + reportID + "_-" + formattedReportDate;
  GM_setValue(key, final); // overwrite if exists
  final = GM_getValue(key, []);

  //
  // Create the TSV
  //
  var tsv = [];
  tsv.push(['date', 'query', 'type', 'id', 'name', 'url', 'ytRank', 'googleRank'].join("\t"));
  for (i = 0; i < final.length; i++) {
     tsv.push(final[i].join("\t"));
  }
  tsv = tsv.join("\n");

  // 
  // Create the download button for this report page.
  //
  var downloadPDF = $("a.btn#download-report");
  var downloadTSV = downloadPDF.clone();
  downloadTSV.attr("id", "download-tsv-report");
  downloadTSV.html(downloadTSV.html().replace("PDF", "TSV"));
  downloadTSV.attr('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(tsv));
  downloadTSV.attr('target', '_blank');
  downloadTSV.attr('download', 'TubeBuddy_' + channelID + "_report_" + formattedReportDate + '.csv');
  downloadTSV.prependTo(downloadPDF.parent());

  // 
  // If there was an error, display the error message.
  //
  if(anError) {
    showFormatError($("div.page-title-container"));
  }
};

//
// Function:      reportListing
//
// Description:   This function places a button to download the combined TSV report to the user.
//
// Inputs:        none
//
// globals:
//                downloadTSV       The element to download the TSV report
//                clearReport       The element for clearing the report information.
//
function reportListing() {
  // 
  // Initialize variables.
  //
  var final = [];
  var channelID = $("a.tb-external-channel").attr("href").split("/channel/")[1];
  let reports = false;
  anError = false;

  // 
  // Get the report data from storage.
  //
  var keys = GM_listValues();
  keys = keys.filter(function(value, index, array) { return value.search(channelID) > -1; });

  // 
  // Combine the report data to a single report and add flags to the reports that have been
  // generated alreay.
  //
  var tsv = [];
  tsv.push(['date', 'query', 'type', 'id', 'name', 'url', 'ytRank', 'googleRank'].join("\t"));
  for (var i = 0; i < keys.length; i++) {
    //
    // Get the reports data and combine them into one report.
    //
    var report = GM_getValue(keys[i], []);
    for (var j = 0; j < report.length; j++) {
      // 
      // Save the report row.
      //
      tsv.push(report[j].join("\t"));

      //
      // Set the flag to true that we have reports generated already.
      //
      reports = true;
    }
    if(reports) {
      // 
      // Get the reportID from the key and flag that report as created.
      //
      const reportID = keys[i].split('_-')[1];
      $(`a[data-reportid="${reportID}"]`).before("<span style='margin: 5px;'>Generated already</span>");
    }
  }
  // 
  // Make into a single string.
  //
  tsv = tsv.join("\n");

  // 
  // Add the download and clear report buttons if there is data.
  //
  if(reports) {
    const viewReport = $("a#viewReport")[0]
    const downloadTSV = $(viewReport).clone();
    downloadTSV.attr("id", "download-tsv-report");
    downloadTSV.removeClass("btn-loading");
    downloadTSV.removeAttr("data-reportid");
    downloadTSV.removeAttr("style");
    downloadTSV.text("Download TSV");
    downloadTSV.attr('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(tsv));
    downloadTSV.attr('target', '_blank');
    downloadTSV.attr('download', 'TubeBuddy_' + channelID + '_bulk_report.csv');
    downloadTSV.appendTo($("div.page-title"));
    downloadTSV.after('<span style="margin-right: 20px;"></span>')
    downloadTSV.before('<span style="margin-right: 20px;"></span>')
    const clearReport = $(viewReport).clone();
    clearReport.attr("id", "clear-report");
    clearReport.removeClass("btn-loading");
    clearReport.removeAttr("data-reportid");
    clearReport.removeAttr("style");
    clearReport.text("Clear TSV");
    clearReport.removeAttr('href', '#');
    clearReport.attr('target', '_blank');
    clearReport.removeAttr('download', '');
    clearReport.appendTo($("div.page-title"));
    clearReport.on('click', e => {
      e.preventDefault();

      //
      // Delete all the stored values.
      //
      var keys = GM_listValues();
      for(var i = 0; i < keys.length; i++) {
        GM_deleteValue(keys[i]);
      }

      //
      // Remove the buttons if they exists by reloading the page.
      //
      location.reload(true);
    });
  }
  // 
  // If there was an error, display the error message.
  //
  if(anError) {
    showFormatError($("div.page-title-container"));
  }
}

// 
// Function:        Self invocing function reference.
//
(function() {
  'use strict';

  // 
  // Run the proper function based on what page is being viewed.
  //
  if (document.location.href.search("/DisplayRankingReport/") > -1) {
    // 
    // This is an individual report page. Create the needed report.
    //
    individualReport();
  } else if (document.location.href.search("/keywordrankingreport/") > -1) {
    // 
    // This is the main report list page. Add the download and clear data
    // buttons.
    //
    reportListing();
  }
})();

