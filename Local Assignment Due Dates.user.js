// ==UserScript==
// @name         Local Assignment Due Dates
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Give assignments your own due dates
// @author       samfundev
// @match        https://harrisburgu.instructure.com/calendar*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

	const contexts = ENV.CALENDAR.SELECTED_CONTEXTS.map(context => "&context_codes%5B%5D=" + context).join("");
	const url = "https://harrisburgu.instructure.com/api/v1/calendar_events?type=assignment&undated=1&per_page=50" + contexts;
	let events;
	let i18;
	const fakeEvents = [];
	const stored = localStorage.getItem("assignmentDates") || "{}";
	const assignmentDates = JSON.parse(stored);

	require(["i18nObj"], obj => { i18 = obj; window.i18 = obj; });

	const eventSource = {
		events: (_, __, ___, callback) => callback(fakeEvents)
	};

	const calendar = $("div.calendar");

	function fakeEvent(dateMoment, assignment, contextInfo) {
		assignment.due_at = dateMoment;

		const previous = fakeEvents.find(fakeEvent => fakeEvent.assignment.id == assignment.id);
		if (previous != null) {
			previous.start = dateMoment;
			previous._start = $.fullCalendar.moment(previous.start);
			previous.startDate = () => dateMoment;
			previous.end = dateMoment;
			previous._end = $.fullCalendar.moment(previous.end);
			previous.endDate = () => dateMoment;

			calendar.fullCalendar("refetchEvents");
			return;
		}

		const fake = {
			object: assignment,
			assignment: assignment,
			title: assignment.name,
			description: assignment.description,
			start: dateMoment,
			startDate: () => dateMoment,
			end: dateMoment,
			endDate: () => dateMoment,
			eventType: "assignment",
			className: "assignment group_" + contextInfo.asset_string,
			isAppointmentGroupEvent: () => false,
			contextInfo: contextInfo,
			isCompleted() {
				return this.assignment.user_submitted || (this.isPast() && this.assignment.needs_grading_count === 0);
			},
			isPast() {
				return this.start && this.start < $.fullCalendar.moment($.fudgeDateForProfileTimezone(new Date()))
			},
			iconType() {
				if (this.assignment.submission_types && this.assignment.submission_types.length) {
					const type = this.assignment.submission_types[0]
					if (type === 'online_quiz') return 'quiz'
					if (type === 'discussion_topic') return 'discussion'
				}
				return 'assignment'
			},
			isDueAtMidnight() {
				return (
					this.start &&
					(this.midnightFudged ||
					 (this.start.hours() === 23 && this.start.minutes() > 30) ||
					 (this.start.hours() === 0 && this.start.minutes() === 0))
				)
			},
			isDueStrictlyAtMidnight() {
				return (
					this.start &&
					(this.midnightFudged ||
					 (this.start.hours() === 23 && this.start.minutes() > 59) ||
					 (this.start.hours() === 0 && this.start.minutes() === 0))
				)
			},
			fullDetailsURL() {
				return this.assignment.html_url
			},
			displayTimeString() {
				const dueAt = `<span class="date-range">
					<time datetime='${dateMoment.toISOString()}'>
						${$.datetimeString(dateMoment.valueOf())}
					</time>
				</span>`;

				return i18.t("Due: %{dueAt}", {dueAt});
			},
		};

		calendar.fullCalendar("removeEventSource", eventSource);
		fakeEvents.push(fake);
		calendar.fullCalendar("addEventSource", eventSource);
	}

	function loadEvents(json) {
		events = json;

		for (const eventID in assignmentDates) {
			loadEvent(eventID);
		}
	}

	function loadEvent(eventID) {
		const date = $.fullCalendar.moment(assignmentDates[eventID]);
		const event = events.find(event => event.id == eventID);
		const context = ENV.CALENDAR.CONTEXTS.find(context => context.asset_string == event.context_code);
		if (event == null || context == null)
		{
			alert("This shouldn't usually happen.");
			return false;
		}

		fakeEvent(date, event.assignment, context);
	}

	fetch(url)
		.then(response => response.text())
		.then(text => JSON.parse(text.substring(9)))
		.then(loadEvents)
		.catch(console.error);

	function parseDate(value) {
		const date = $.fullCalendar.moment(value, "LLL");
		return date.isValid() ? date : null;
	}

	new MutationObserver(mutations => {
		for (let eventElement of document.querySelectorAll(".undated_event")) {
			eventElement = $(eventElement);

			const eventID = eventElement.data("event-id");
			if (!eventID.startsWith("assignment_"))
				continue;

			eventElement.contextmenu(() => {
				const defaultDate = $.fullCalendar.moment().hours(23).minutes(59).format("LLL");
				let date;
				while (date == null) {
					date = parseDate(prompt("What's the due date?", defaultDate));
				}

				assignmentDates[eventID] = date.format();
				loadEvent(eventID);

				localStorage.setItem("assignmentDates", JSON.stringify(assignmentDates));

				return false;
			});
		}
	}).observe(document.querySelector("div#undated-events"), { subtree: true, childList: true });
})();