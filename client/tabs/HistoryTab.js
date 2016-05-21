var Diff = require("diff");
var Overlay = require("../modules/Overlay.js");

var HistoryTab =
{
	ALIAS: "history",
	// History action types
	TYPE_TRACK_EDITS: 1,
	TYPE_CONTENT_LINKS: 2,
};

HistoryTab.FLAG_REASONS =
{
	[HistoryTab.TYPE_TRACK_EDITS]:
	[
		[1, "reason-mismatching", "Mismatching information"],
		[2, "reason-incorrect", "Intentionally incorrect"],
	],
	[HistoryTab.TYPE_CONTENT_LINKS]:
	[
		[1, "reason-mismatching", "Mismatching association"],
		[2, "reason-incorrect", "Intentionally incorrect"],
		[3, "reason-unavailable", "Content not available"],
	]
};

// Request history actions for specified entity
HistoryTab.requestActions = function(historyType, entityId)
{
	var request = {};

	switch(historyType)
	{
		case HistoryTab.TYPE_TRACK_EDITS:
		{
			request =
			{
				url: "/tracks/" + entityId + "/edits",
				key: "track-edits",
				field: "trackId",
				diff: true,
			};

			break;
		}
		case HistoryTab.TYPE_CONTENT_LINKS:
		{
			request =
			{
				url: "/content/" + entityId + "/links",
				key: "content-links",
				field: "externalId",
			};

			break;
		}
		default:
		{
			return;
		}
	}

	// Remove existing actions
	var $destination = $("#history-" + request.key);
	$destination.empty();

	$destination.data("entityId", entityId);
	
	// Remove sourceId part from the entityId
	if(request.field == "externalId")
		entityId = entityId.substring(2);

	// Wipe the data storage
	$("#tab-history").data
	({
		[request.key]: [],
		[request.field]: entityId,
	});

	// No track attached, bail out
	if(request.field == "trackId" && entityId == -1)
		return;

	$.ajax
	({
		url: request.url,
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return;

			var $item = $(".item").filterByData(request.field, entityId);

			// Couldn't find the item, bail out
			if(!$item.length)
				return;

			// Item is no longer active, bail out
			if(!$item.is(".active"))
				return;

			$("#tab-history").data(request.key, response);

			var latest = ["", ""];

			response.forEach(function addAction(action)
			{
				var actionId = action[0];
				var artist = action[1];
				var title = action[2];
				var date = action[3];
				var username = action[4];

				var change = [artist, title];

				if(request.diff)
				{
					for(var i = 0; i < 2; i++)
					{
						var diff = Diff.diffChars(latest[i], change[i] || latest[i]);
						latest[i] = change[i] || latest[i];
						change[i] = "";

						diff.forEach(function(part)
						{
							if(part.added || part.removed)
							{
								part.value = "<span class=\"" + (part.added
									? "added"
									: "removed")
									+ "\">" + part.value + "</span>";
							}

							change[i] = change[i] + part.value;
						});
					}
				}
				else
				{
					for(var i = 0; i < 2; i++)
					{
						latest[i] = change[i] || latest[i];
						change[i] = latest[i];
					}
				}

				var relativeDate = HistoryTab.getRelativeDate(date);

				$destination.prepend(
					$("<div>")
						.addClass("action")
						.data("actionId", actionId)
						.append(
							$("<div>")
								.addClass("changes")
								.append(
									$("<div>")
										.addClass("artist")
										.html(change[0]),
									$("<div>")
										.addClass("title")
										.html(change[1])
								),
							$("<div>")
								.addClass("details")
								.append(
									$("<div>")
										.addClass("user")
										.text(username)
										.append(
											$("<div>")
												.addClass("flag icon fa fa-flag")
												.attr("title", "Flag for moderator attention")
												.click(HistoryTab.onFlagIconClick)
										),
									$("<div>")
										.addClass("date")
										.text(relativeDate)
										.append(
											$("<div>")
												.addClass("date icon fa fa-clock-o")
												.attr("title", new Date(date).toString())
										)
								)
						)
				);
			});
		}
	});
}

// Flag a history action as inappropriate
HistoryTab.flagAction = function(historyType, entityId, actionId, reasonId)
{
	var flagUrl;

	switch(historyType)
	{
		case HistoryTab.TYPE_TRACK_EDITS:
		{
			flagUrl = "/tracks/" + entityId + "/edits/" + actionId + "/flags/";
			break;
		}
		case HistoryTab.TYPE_CONTENT_LINKS:
		{
			flagUrl = "/content/" + entityId + "/links/" + actionId + "/flags/";
			break;
		}
		default:
		{
			return;
		}
	}

	$.ajax
	({
		url: flagUrl,
		type: "POST",
		data: JSON.stringify({ reasonId: reasonId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;
			
			// todo: update flag icon state to active

			Overlay.destroy();
		}
	});
}

// Returns a relative date in a readable format
// (c) John Resig & Faiz
HistoryTab.getRelativeDate = function(date)
{
	var date = new Date((date || "").replace(/-/g, "/").replace(/[TZ]/g, " ")),
		diff = ( ( ( new Date() ).getTime() - date.getTime() ) / 1000),
		dayDiff = Math.floor(diff / 86400);

	var year = date.getFullYear(),
		month = date.getMonth() + 1,
		day = date.getDate();

	if (isNaN(dayDiff) || dayDiff < 0 || dayDiff >= 31)
		return (
			year.toString() + "-"
			+ ( (month < 10) ? "0" + month.toString() : month.toString() ) + "-"
			+ ( (day < 10) ? "0" + day.toString() : day.toString() )
		);

		var r =
		( 
			(
				dayDiff == 0 && 
				(
					(diff < 60 && "just now")
						|| (diff < 120 && "1 minute ago")
						|| (diff < 3600 && Math.floor(diff / 60) + " minutes ago")
						|| (diff < 7200 && "1 hour ago")
						|| (diff < 86400 && Math.floor(diff / 3600) + " hours ago")
				)
			)
			|| (dayDiff == 1 && "Yesterday")
			|| (dayDiff < 7 && dayDiff + " days ago")
			|| (dayDiff < 31 && Math.ceil(dayDiff / 7) + " weeks ago")
		);

		return r;
}

// Clear storage variables
HistoryTab.clearStorage = function()
{
	$("#tab-history").removeData();
}

// Set active section by alias
HistoryTab.setActiveSection = function(alias)
{
	var $tab = $("#history-menu-" + alias);

	if($tab.is(".active"))
		return;

	$("#history-menu div, #tab-history .section")
		.removeClass("active");
	
	$tab.addClass("active");

	$("#tab-history .section")
		.eq( $tab.index() )
		.addClass("active");
}

// Called once upon creating a flag overlay
HistoryTab.initFlagOverlay = function(historyType)
{
	HistoryTab.FLAG_REASONS[historyType].forEach(function(reason)
	{
		var $radio = Overlay.createElement
		({
			tag: "<input>",
			attributes:
			{
				id: reason[1],
				type: "radio",
				name: "flag-reason",
			},
			data: { "reasonId": reason[0] }
		});

		var $label = Overlay.createElement
		({
			tag: "<label>",
			attributes:
			{
				for: reason[1],
			},
			text: reason[2],
		});

		$("#flag-submit")
			.before($radio)
			.before($label);
	});
}

// Called upon clicking the flag icon
HistoryTab.onFlagIconClick = function()
{
	if($(this).is(".active"))
		return;

	if(Overlay.isActive())
		return;

	var summary;
	var subject;
	var extraSubject;

	var $action = $(this).closest(".action");
	var historyType = $("#tab-history .active.section").data("type");

	switch(historyType)
	{
		case HistoryTab.TYPE_TRACK_EDITS:
		{
			summary = "You are reporting the following track name:";
			subject = $action.find(".artist").text() + "<br>" +
				$action.find(".title").text();
			
			break;
		}
		case HistoryTab.TYPE_CONTENT_LINKS:
		{
			var $item = $(".item.active");

			// No active item, bail out
			if(!$item.length)
				return;

			var Content = require("../modules/Content.js");
			var sourceName = Content.SOURCE_NAMES[ $item.data("sourceId") ];

			summary = "You are reporting the following association:";
			subject = sourceName + " <br>" +
				"#" + $item.data("externalId");
			extraSubject = $action.find(".artist").text() + "<br>" +
				$action.find(".title").text();

			break;
		}
		default:
		{
			return;
		}
	}

	var elements = [];

	elements.push
	({
		tag: "<p>",
		text: summary,
	},
	{
		tag: "<p>",
		attributes:
		{
			id: "flag-subject",
			class: (historyType == HistoryTab.TYPE_CONTENT_LINKS)
				? "content subject"
				: "subject",
		},
		html: subject,
		data:
		{
			type: historyType,
			entityId: $action.parent().data("entityId"),
			actionId: $action.data("actionId"),
		}
	});

	if(typeof extraSubject != "undefined")
	{
		if(historyType == HistoryTab.TYPE_CONTENT_LINKS)
		{
			elements.push
			({
				tag: "<img>",
				attributes:
				{
					class: "content-thumbnail",
					src: $("#content-image img").attr("src"),
				},
			});
		}

		elements.push
		({
			tag: "<p>",
			attributes:
			{
				id: "flag-extra-subject",
				class: "extra subject",
			},
			html: extraSubject,
		});
	}

	elements.push
	({
		tag: "<p>",
		text: "Please select one of the reasons below:",
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "flag-submit",
			class: "inner window-link",
		},
		text: "Submit Report",
		click: HistoryTab.onFlagSubmitClick,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "flag-cancel",
			class: "window-link",
		},
		text: "Cancel",
		click: Overlay.destroy,
	});

	Overlay.create("Flag for moderator attention",
	elements,
	function onOverlayCreate()
	{
		HistoryTab.initFlagOverlay(historyType);
	});
}

// Called when the submit report button is pressed
HistoryTab.onFlagSubmitClick = function()
{
	var $radio = Overlay.getActiveRadioButton();

	if(!$radio.length)
		return Overlay.shakeRadioButtonLabels();

	var reasonId = $radio.data("reasonId");
	var data = $("#flag-subject").data();

	HistoryTab.flagAction(data.type, data.entityId, data.actionId,
		reasonId);
}

// Called when the history tab becomes active
HistoryTab.onSetActive = function($overrideItem)
{
	var $item = $overrideItem || $(".item.active");

	// No active item, bail out
	if(!$item.length)
		return;

	// Update track edits data if a different track is being set
	if($item.data("trackId") != $("#tab-history").data("trackId"))
	{
		HistoryTab.requestActions( HistoryTab.TYPE_TRACK_EDITS,
			$item.data("trackId") );
	}

	// Update content links data if a different content is being set
	if($item.data("externalId") != $("#tab-history").data("externalId"))
	{
		HistoryTab.requestActions( HistoryTab.TYPE_CONTENT_LINKS,
			$item.data("sourceId") + "/" + $item.data("externalId") );
	}
}

// Called upon active item change
HistoryTab.onItemChange = function($item)
{
	HistoryTab.onSetActive($item);
}

// Called upon clicking the menu button
HistoryTab.onMenuClick = function()
{
	var alias = $(this).attr("id").substring(13);
	HistoryTab.setActiveSection(alias);
}

HistoryTab.init = function()
{
	$("#history-menu div")
		.click(HistoryTab.onMenuClick);

	$("#history-track-edits").data("type", HistoryTab.TYPE_TRACK_EDITS);
	$("#history-content-links").data("type", HistoryTab.TYPE_CONTENT_LINKS);
}

module.exports = HistoryTab;
