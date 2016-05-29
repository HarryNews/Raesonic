var Diff = require("diff");
var Flag = require("../modules/Flag.js");

var HistoryTab =
{
	ALIAS: "history",
	// History action types
	TYPE_TRACK_EDITS: 1,
	TYPE_CONTENT_LINKS: 2,
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
				url: "/tracks/" + entityId + "/edits/",
				key: "track-edits",
				field: "trackId",
				diff: true,
				entityType: Flag.ENTITY.TRACK_EDIT,
			};

			break;
		}
		case HistoryTab.TYPE_CONTENT_LINKS:
		{
			request =
			{
				url: "/content/" + entityId + "/links/",
				key: "content-links",
				field: "externalId",
				entityType: Flag.ENTITY.CONTENT_LINK,
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

	var fullEntityId = entityId;
	
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
				var active = action[5];

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
												.toggleClass("active", active)
												.attr("title", "Flag for moderator attention")
												.data
												({
													entityType: request.entityType,
													entityId: fullEntityId,
													secondId: actionId,
													artist: change[0],
													title: change[1],
												})
												.click(Flag.onIconClick)
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

// Returns a relative date in a readable format
// (c) John Resig & Faiz
HistoryTab.getRelativeDate = function(dateStr)
{
	var date = new Date((dateStr || "").replace(/-/g, "/").replace(/[TZ]/g, " ").slice(0, -5));
	var timezoneOffset = date.getTimezoneOffset() * 60000;
	var diff = ( ( ( new Date() ).getTime() - date.getTime() + timezoneOffset ) / 1000 );
	var dayDiff = Math.floor(diff / 86400);

	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDate();

	if (isNaN(dayDiff) || dayDiff < 0 || dayDiff >= 31)
		return (
			( (day < 10) ? "0" + day.toString() : day.toString() ) + "." +
			( (month < 10) ? "0" + month.toString() : month.toString() ) + "." +
			year.toString()
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
	if($item.data("externalId") && $item.data("externalId") != $("#tab-history").data("externalId"))
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
