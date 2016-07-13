var Diff = require("diff");
var Flag = require("./Flag.js");

var History =
{
	// History action types
	TYPE_TRACK_EDITS: 1,
	TYPE_CONTENT_LINKS: 2,
	// Action on force update
	SWITCH_TAB: true,
};

// Request a type of history actions for the specified entity
History.request = function(historyType, entityId)
{
	var request = {};

	switch(historyType)
	{
		case History.TYPE_TRACK_EDITS:
		{
			request =
			{
				url: "/tracks/" + entityId + "/edits/",
				key: "track-edits",
				field: "trackId",
				diff: true,
				entityType: Flag.ENTITY.TRACK_EDIT,
				name: "track name change",
			};

			break;
		}
		case History.TYPE_CONTENT_LINKS:
		{
			request =
			{
				url: "/content/" + entityId + "/links/",
				key: "content-links",
				field: "externalId",
				entityType: Flag.ENTITY.CONTENT_LINK,
				name: "content association",
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
	$("#tab-history")
		.data( request.key, [] )
		.data(request.field, entityId);

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

			var Item = require("./Item.js");

			// No active item, bail out
			if(Item.active == null)
				return;

			// Item changed, bail out
			if( Item.active[request.field] &&
				Item.active[request.field] != entityId )
					return;

			$("#tab-history").data(request.key, response);

			var latest = ["", ""];

			var Reputation = require("./Reputation.js");

			var canSubmitFlags = Reputation.hasPermission(
				Reputation.PERMISSION.SUBMIT_FLAGS, true
			);

			var canProcessFlags = Reputation.hasPermission(
				Reputation.PERMISSION.PROCESS_FLAGS
			);

			var flagTitle = canSubmitFlags
				? canProcessFlags
					? ("Review " + request.name)
					: "Flag for moderator attention"
				: "Not enough reputation";

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

				var $changes = $("<div>")
					.addClass("changes")
					.append(
						$("<div>")
							.addClass("artist")
							.html( change[0] ),
						$("<div>")
							.addClass("title")
							.html( change[1] )
					);

				var relativeDate = History.getRelativeDate(date);

				var $details = $("<div>")
					.addClass("details")
					.append(
						$("<div>")
							.addClass("user")
							.text(username)
							.append(
								$("<div>")
									.addClass("flag icon")
									.toggleClass("active", active)
									.toggleClass("disabled", !canSubmitFlags)
									.attr("title", flagTitle)
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
									.addClass("clock icon")
									.attr( "title", new Date(date).toString() )
							)
					);

				var $action = $("<div>")
					.addClass("action")
					.append($changes, $details);

				$destination.prepend($action);
			});
		}
	});
}

// Request actions for each item's entity that changed
History.updateItemActions = function()
{
	var Item = require("./Item.js");

	// No active item, bail out
	if(Item.active == null)
		return;

	var $section = $("#history-menu > div.active");

	if(!$section.length)
		return;

	var sectionType = $section.index() + 1;

	switch(sectionType)
	{
		case History.TYPE_TRACK_EDITS:
		{
			var trackId = Item.active.trackId;

			// Update track edit actions if the track changed
			if( trackId != $("#tab-history").data("trackId") )
			{
				History.request(History.TYPE_TRACK_EDITS, trackId);
			}

			break;
		}
		case History.TYPE_CONTENT_LINKS:
		{
			var sourceId = Item.active.sourceId;
			var externalId = Item.active.externalId;

			// Update content link actions if the content changed
			if( externalId &&
				externalId != $("#tab-history").data("externalId") )
			{
				History.request( History.TYPE_CONTENT_LINKS,
					sourceId + "/" + externalId );
			}

			break;
		}
		default:
		{
			break;
		}
	}
}

// Wipe the storage, request new data and switch the tab
History.forceUpdate = function(switchTab, sectionType)
{
	History.clearStorage();
	History.updateItemActions();

	if(!switchTab)
		return;

	var Tab = require("./Tab.js");
	Tab.setActive(Tab.History);

	if(!sectionType)
		return;

	var sectionAlias = History.getSectionAlias(sectionType);

	if(sectionAlias == null)
		return;

	History.setActiveSection(sectionAlias);
}

// Clear storage variables
History.clearStorage = function()
{
	$("#tab-history").removeData();
}

// Set active section by alias
History.setActiveSection = function(alias)
{
	var $section = $("#history-menu-" + alias);

	if($section.is(".active"))
		return;

	$("#history-menu > div, #tab-history .section")
		.removeClass("active");
	
	$section.addClass("active");

	$("#tab-history .section")
		.eq( $section.index() )
		.addClass("active");

	History.updateItemActions();
}

// Obtain section alias for the specified type
History.getSectionAlias = function(sectionType)
{
	switch(sectionType)
	{
		case History.TYPE_TRACK_EDITS:
			return "track-edits";
		case History.TYPE_CONTENT_LINKS:
			return "content-links";
		default:
			return null;
	}
}

// Returns a relative date in a readable format
// Based on a snippet by John Resig & Faiz
History.getRelativeDate = function(dateStr)
{
	var date = new Date(
		(dateStr || "")
			.replace(/-/g, "/")
			.replace(/[TZ]/g, " ")
			.slice(0, -5)
	);

	var timezoneOffset = date.getTimezoneOffset() * 60000;
	var diff = ( ( ( new Date() ).getTime() -
		date.getTime() + timezoneOffset ) / 1000 );

	var dayDiff = Math.floor(diff / 86400);

	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDate();

	if( isNaN(dayDiff) || dayDiff >= 31 )
	{
		return (
			( (day < 10) ? "0" + day.toString() : day.toString() ) + "." +
			( (month < 10) ? "0" + month.toString() : month.toString() ) + "." +
			year.toString()
		);
	}

	var r =
	( 
		(
			dayDiff < 1 && 
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

// Called when the user account status has changed
History.onAccountSync = function()
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return;

	History.forceUpdate();
}

// Called when the history tab becomes active
History.onTabSetActive = function()
{
	History.updateItemActions();
}

// Called when an item is made active
History.onItemChange = function()
{
	var Playlist = require("./Playlist.js");
	var Tab = require("./Tab.js");

	if(Playlist.active && Playlist.active.flags)
	{
		var Flag = require("./Flag.js");

		Tab.setActive(Tab.History);

		var sectionType = null;

		switch(Playlist.active.flags)
		{
			case Flag.ENTITY.TRACK_EDIT:
			{
				sectionType = History.TYPE_TRACK_EDITS;
				break;
			}
			case Flag.ENTITY.CONTENT_LINK:
			{
				sectionType = History.TYPE_CONTENT_LINKS;
				break;
			}
			default:
			{
				return;
			}
		}

		var sectionAlias = History.getSectionAlias(sectionType);

		if(sectionAlias == null)
			return;

		History.setActiveSection(sectionAlias);
		return;
	}

	if( !Tab.isActive(Tab.History) )
		return;

	var Item = require("./Item.js");

	if(!Item.active.isManualSwitch)
	{
		// Switch to related tab if the item changed automatically
		// Prevents logs from being requested when they're not needed
		Tab.setActive(Tab.Related);
		return;
	}

	History.updateItemActions();
}

// Called upon clicking the menu button
History.onSectionMenuClick = function()
{
	var alias = $(this)
		.attr("id")
		.substring(13);

	History.setActiveSection(alias);
}

History.init = function()
{
	$("#history-menu > div").click(History.onSectionMenuClick);
}

module.exports = History;
