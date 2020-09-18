// ==UserScript==
// @name         Simplify Course Names in Canvas
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Removes the class code from course names
// @author       samfundev
// @match        https://harrisburgu.instructure.com/*
// @grant        none
// ==/UserScript==


(function() {
    'use strict';

    const targetElements = [
        "div.courses-tray ul:first-of-type a",
        "div.ToDoSidebarItem__Info > span",
        "div.links > a",
        "a.content_summary > span.fake-link",
        "h2.course-title",
        "#breadcrumbs > ul > li:nth-of-type(2) span",
        "p.event-details__context", // Dashboard Recent Feedback
        "h3.ic-DashboardCard__header-title span", // Dashboard Card View
        "span.Grouping-styles__title", // Dashboard List View Groupings
        "div.PlannerItem-styles__type span", // Dashboard List View Item
        "div.GradesDisplay-styles__course a span span", // Dashboard List View Grades
        "li.context_list_context label", // Calendar: "Calendars"
        "div.event-details-content a", // Calendar: Event Details
    ];

    function simplify() {
        for (const element of document.querySelectorAll(targetElements.join(", "))) {
            if (!element.textContent.includes(" - "))
                continue;

            element.textContent = element.textContent.split(" - ")[1];
        }
    }

    new MutationObserver(() => simplify()).observe(document.body, { subtree: true, childList: true });
})();