// ==UserScript==
// @name         Canvas Colorizer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Colorize the names of courses in more places
// @author       samfundev
// @match        https://harrisburgu.instructure.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const courses = {};

    async function parseCourses() {
        const colors = await fetch(`/api/v1/users/${ENV.current_user_id}/colors/`)
            .then(response => response.text())
            .then(text => JSON.parse(text.substring(9)).custom_colors)
            .catch(console.error);

        const json = await fetch("/api/v1/users/self/favorites/courses?include[]=term&exclude[]=enrollments")
            .then(response => response.text())
            .then(text => JSON.parse(text.substring(9)))
            .catch(console.error);

        for (const course of json) {
            courses[course.name] = colors["course_" + course.id];
        }

        colorize();
    }

    parseCourses();

    function colorize() {
        for (const element of document.querySelectorAll("div.courses-tray ul:first-of-type a, div.ToDoSidebarItem__Info > span, div.links > a, a.content_summary > span.fake-link, h2.course-title, #breadcrumbs > ul > li:nth-of-type(2) span")) {
            const color = courses[element.textContent];
            if (color == null)
                continue;

            element.style.color = color;
        }
    }

    new MutationObserver(() => colorize()).observe(document.body, { subtree: true, childList: true });
})();