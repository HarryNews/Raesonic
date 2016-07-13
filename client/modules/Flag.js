var Throttle = require("throttle-debounce/throttle");
var Overlay = require("./Overlay.js");

var Flag =
{
	ENTITY:
	{
		USER: 1,
		PLAYLIST: 2,
		RELATION: 3,
		TRACK_EDIT: 4,
		CONTENT_LINK: 5,
	},
};

Flag.REASONS = {};
Flag.REASONS[Flag.ENTITY.RELATION] =
[
	[1, "reason-mismatching", "Mismatching recommendation"],
	[2, "reason-incorrect", "Intentionally incorrect"],
];
Flag.REASONS[Flag.ENTITY.TRACK_EDIT] =
[
	[1, "reason-mismatching", "Mismatching information"],
	[2, "reason-incorrect", "Intentionally incorrect"],
];
Flag.REASONS[Flag.ENTITY.CONTENT_LINK] =
[
	[1, "reason-mismatching", "Mismatching association"],
	[2, "reason-incorrect", "Intentionally incorrect"],
	[3, "reason-unavailable", "Content not available"],
];

// Flag specified entity as inappropriate
Flag.create = function(entityType, entityId, secondId, reasonId, $flag)
{
	var Toast = require("./Toast.js");

	var requestUrl = Flag.getRequestUrl(entityType, entityId, secondId);

	$.ajax
	({
		url: requestUrl,
		type: "POST",
		data: JSON.stringify({ reasonId: reasonId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;
			
			$flag.addClass("active");

			Overlay.destroy();

			Toast.show("Report has been submitted, thank you for " +
				"keeping Raesonic clean!", Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Flag.createThrottled = Throttle(5000,
function(entityType, entityId, secondId, reasonId, $flag)
{
	Flag.create(entityType, entityId, secondId, reasonId, $flag);
});

// Request flag count for the item
Flag.requestCount = function(entityType, entityId, secondId)
{
	var Toast = require("./Toast.js");

	var requestUrl = Flag.getRequestUrl(entityType, entityId, secondId);

	$.ajax
	({
		url: requestUrl,
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return;
			
			if( !Overlay.isActive() )
				return;

			var flags = response;
			var hasFlags = false;

			Flag.REASONS[entityType].forEach(function(reason, reasonId)
			{
				var count = flags[++reasonId];

				if(!count)
					return;

				hasFlags = true;

				var $counter = $("<span>")
					.text(count);

				var $icon = $("<span>")
					.addClass("flag icon");

				$("#window label[for=\"" + reason[1] + "\"]")
					.append($counter, $icon);
			});

			// Enable the "None of above" option, if available
			if(hasFlags)
			{
				$("#reason-none").prop("disabled", false);

				$("#window label[for=\"reason-none\"]")
					.removeClass("disabled");
			}
		},
		error: Toast.onRequestError,
	});
}

// Process decision on the specified entity
Flag.process = function(entityType, entityId, secondId, reasonId, $flag)
{
	var Toast = require("./Toast.js");

	var requestUrl =
		Flag.getRequestUrl(entityType, entityId, secondId) +
		"process/";

	$.ajax
	({
		url: requestUrl,
		type: "POST",
		data: JSON.stringify({ reasonId: reasonId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;
			
			$flag.removeClass("active");

			Overlay.destroy();

			if(reasonId > 0)
				return Flag.onEntityDismiss(entityType, entityId, response);

			Toast.show("All associated reports have been closed",
				Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Flag.processThrottled = Throttle(5000,
function(entityType, entityId, secondId, reasonId, $flag)
{
	Flag.process(entityType, entityId, secondId, reasonId, $flag);
});

// Return a request URL for the specified entity type
Flag.getRequestUrl = function(entityType, entityId, secondId)
{
	switch(entityType)
	{
		case Flag.ENTITY.USER:
		{
			return ( "/users/" + entityId + "/flags/" );
		}
		case Flag.ENTITY.PLAYLIST:
		{
			return ( "/playlists/" + entityId + "/flags/" );
		}
		case Flag.ENTITY.RELATION:
		{
			return ( "/tracks/" + entityId + "/relations/" +
				secondId + "/flags/" );
		}
		case Flag.ENTITY.TRACK_EDIT:
		{
			return ( "/tracks/" + entityId + "/edits/" +
				secondId + "/flags/" );
		}
		case Flag.ENTITY.CONTENT_LINK:
		{
			return ( "/content/" + entityId + "/links/" +
				secondId + "/flags/" );
		}
		default:
		{
			return null;
		}
	}
}

// Called once upon creating a flag overlay
Flag.initOverlay = function(entityType, entityId, secondId)
{
	// Make a copy of the flag reasons array
	var options = Flag.REASONS[entityType].slice();

	var Reputation = require("./Reputation.js");

	var canProcessFlags = Reputation.hasPermission(
		Reputation.PERMISSION.PROCESS_FLAGS
	);

	if(canProcessFlags)
	{
		options.push(
			[0, "reason-none", "None of above, close all reports"]
		);
	}

	options.forEach(function(reason)
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
			change: Flag.updateFlagOverlay,
			data: { "reasonId": reason[0] },
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

	if( !Reputation.hasPermission(
		Reputation.PERMISSION.VIEW_FLAG_COUNT ) )
			return;

	Flag.requestCount(entityType, entityId, secondId);

	if(!canProcessFlags)
		return;

	$("#reason-none").prop("disabled", true);

	$("#window label[for=\"reason-none\"]")
		.addClass("disabled");

	Overlay.initCheckbox
		("flag-malicious", "#flag-submit");
}

// Show flag creation overlay
Flag.showFlagOverlay = function(data, $flag)
{
	var Reputation = require("./Reputation.js");

	var canProcessFlags = Reputation.hasPermission(
		Reputation.PERMISSION.PROCESS_FLAGS
	);

	var action = (canProcessFlags)
		? "reviewing"
		: "reporting";

	var summary;
	var subject;
	var extraSubject;
	var entityName;

	var entityType = data.entityType;

	switch(entityType)
	{
		case Flag.ENTITY.RELATION:
		{
			entityName = "Recommendation";
			summary = "You are " + action + " the following recommendation:";
			subject = data.artist + "<br>" + data.title;
			extraSubject = data.secondArtist + "<br>" + data.secondTitle;

			break;
		}
		case Flag.ENTITY.TRACK_EDIT:
		{
			entityName = "Track name";
			summary = "You are " + action + " the following track name:";
			subject = data.artist + "<br>" + data.title;
			
			break;
		}
		case Flag.ENTITY.CONTENT_LINK:
		{
			var Content = require("./Content.js");

			var sourceId = data.entityId.charAt(0);
			var externalId = data.entityId.substring(2);
			var sourceName = Content.SOURCE_NAMES[sourceId];

			entityName = "Content association";
			summary = "You are " + action + " the following association:";
			subject = sourceName + " <br>" + "#" + externalId;
			extraSubject = data.artist + "<br>" + data.title;

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
			class: (entityType == Flag.ENTITY.CONTENT_LINK)
				? "content subject"
				: "subject",
		},
		html: subject,
		data:
		{
			entityType: entityType,
			entityId: data.entityId,
			secondId: data.secondId,
			flag: $flag,
		}
	});

	if(typeof extraSubject != "undefined")
	{
		if(entityType == Flag.ENTITY.CONTENT_LINK)
		{
			var $image = $("#content-image img");

			elements.push
			({
				tag: ($image.length)
					? "<img>"
					: "<div>",
				attributes:
				{
					class: "content-thumbnail",
					src: $image.attr("src"),
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
		text: (canProcessFlags)
			? "Select the correct statement:"
			: "Please select one of the reasons below:",
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "flag-submit",
			class: "inner window-link",
		},
		text: (canProcessFlags)
			? "Confirm"
			: "Submit Report",
		click: (canProcessFlags)
		? Flag.onReviewConfirmClick
		: Flag.onReportSubmitClick,
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

	if(canProcessFlags)
	{
		elements.push
		({
			tag: "<input>",
			attributes:
			{
				id: "flag-malicious-agree",
				type: "checkbox",
			},
		},
		{
			tag: "<label>",
			attributes:
			{
				id: "flag-malicious-label",
				for: "flag-malicious-agree",
			},
			text: "Mark reports as malicious",
		});
	}

	Overlay.create(canProcessFlags
		? (entityName + " review")
		: "Flag for moderator attention",
	elements,
	{ noSpacer: true },
	function onOverlayCreate()
	{
		Flag.initOverlay(entityType, data.entityId, data.secondId);
	});
}

// Update the flag overlay
Flag.updateFlagOverlay = function()
{
	var $radio = Overlay.getActiveRadioButton();

	if(!$radio.length)
		return;

	var reasonId = $radio.data("reasonId");

	var $malicious =
		$("#flag-malicious-container");

	(reasonId == 0)
		? $malicious
			.addClass("animated")
			.slideDown(200, function onDone()
			{
				$(this).removeClass("animated")
			})
		: $malicious
			.addClass("animated")
			.slideUp(200, function onDone()
			{
				$(this).removeClass("animated")
			});
}

// Called when the user account status has changed
Flag.onAccountSync = function()
{
	// Update all flags based on reputation
	var Reputation = require("./Reputation.js");

	var canSubmitFlags = Reputation.hasPermission(
		Reputation.PERMISSION.SUBMIT_FLAGS, true
	);

	$(".flag.icon, .flaglarge.icon")
		.toggleClass("disabled", !canSubmitFlags)
		.attr("title", canSubmitFlags
			? "Flag for moderator attention"
			: "Not enough reputation"
		);

	var Account = require("./Account.js");

	if(Account.authenticated)
		return;

	// Remove active state from all flags
	$(".flag.icon.active, .flaglarge.icon.active")
		.removeClass("active");
}

// Called upon clicking the flag icon
Flag.onIconClick = function()
{
	if( Overlay.isActive() )
		return Overlay.destroy();

	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();

	var $flag = $(this);

	if( $flag.is(".disabled") )
		return;

	Flag.showFlagOverlay($flag.data(), $flag);
}

// Called when the submit report button is pressed
Flag.onReportSubmitClick = function()
{
	var $radio = Overlay.getActiveRadioButton();

	if(!$radio.length)
		return Overlay.shakeLabels();

	var reasonId = $radio.data("reasonId");
	var data = $("#flag-subject").data();

	Flag.createThrottled(data.entityType, data.entityId,
		data.secondId, reasonId, data.flag);
}

// Called when the confirm review button is pressed
Flag.onReviewConfirmClick = function()
{
	var $radio = Overlay.getActiveRadioButton();

	if(!$radio.length)
		return Overlay.shakeLabels();

	var reasonId = $radio.data("reasonId");
	var data = $("#flag-subject").data();
	
	if( reasonId == 0 &&
		$("#flag-malicious-agree").is(":checked") )
			reasonId = -1;

	Flag.processThrottled(data.entityType, data.entityId,
		data.secondId, reasonId, data.flag);
}

// Called when the entity has been dismissed
Flag.onEntityDismiss = function(entityType, entityId, response)
{
	var Toast = require("./Toast.js");

	switch(entityType)
	{
		case Flag.ENTITY.USER:
		{
			Toast.show("User has been banned",
				Toast.INFO);

			break;
		}
		case Flag.ENTITY.PLAYLIST:
		{
			var Playlist = require("./Playlist.js");
			Playlist.clearActive();

			Toast.show("Playlist has been deleted",
				Toast.INFO);

			break;
		}
		case Flag.ENTITY.RELATION:
		{
			var Relation = require("./Relation.js");

			if(Relation.active)
			{
				var $item = $(".item").filterByData("trackId", entityId);

				if($item.length)
				{
					$item.remove();

					if( !$(".item").length )
						Relation.clearView();
				}
			}

			Toast.show("Recommendation has been deleted",
				Toast.INFO);

			break;
		}
		case Flag.ENTITY.TRACK_EDIT:
		{
			Toast.show("Track name change has been deleted",
				Toast.INFO);

			var Item = require("./Item.js");

			if(!Item.active)
				return;

			var previousTrackId = Item.active.trackId;
			var match = { key: "trackId", value: previousTrackId };

			var track = response;
			var trackId = track[0];
			var artist = track[1];
			var title = track[2];

			Item.onItemRename
				(match, previousTrackId, trackId, artist, title);

			break;
		}
		case Flag.ENTITY.CONTENT_LINK:
		{
			Toast.show("Content association has been deleted",
				Toast.INFO);

			var Item = require("./Item.js");

			if(!Item.active)
				return;

			var previousTrackId = Item.active.trackId;
			var externalId = Item.active.externalId;
			var match = { key: "externalId", value: externalId };

			var track = response;
			var trackId = track[0];
			var artist = track[1];
			var title = track[2];

			Item.onItemRename
				(match, previousTrackId, trackId, artist, title);

			break;
		}
		default:
		{
			break;
		}
	}
}

module.exports = Flag;
