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

			Flag.REASONS[entityType].forEach(function(reason, reasonId)
			{
				var count = flags[++reasonId];

				if(!count)
					return;

				var $counter = $("<span>")
					.text(count);

				var $icon = $("<span>")
					.addClass("flag icon");

				$("#window label[for=\"" + reason[1] + "\"]")
					.append($counter, $icon);
			});
		},
		error: Toast.onRequestError,
	});
}

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
	Flag.REASONS[entityType].forEach(function(reason)
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

	var Reputation = require("./Reputation.js");

	if( !Reputation.hasPermission(
		Reputation.PERMISSION.VIEW_FLAG_COUNT ) )
			return;

	Flag.requestCount(entityType, entityId, secondId);
}

// Show flag creation overlay
Flag.showFlagOverlay = function(data, $flag)
{
	var summary;
	var subject;
	var extraSubject;

	var entityType = data.entityType;

	switch(entityType)
	{
		case Flag.ENTITY.RELATION:
		{
			summary = "You are reporting the following recommendation:";
			subject = data.artist + "<br>" + data.title;
			extraSubject = data.secondArtist + "<br>" + data.secondTitle;

			break;
		}
		case Flag.ENTITY.TRACK_EDIT:
		{
			summary = "You are reporting the following track name:";
			subject = data.artist + "<br>" + data.title;
			
			break;
		}
		case Flag.ENTITY.CONTENT_LINK:
		{
			var Content = require("./Content.js");

			var sourceId = data.entityId.charAt(0);
			var externalId = data.entityId.substring(2);
			var sourceName = Content.SOURCE_NAMES[sourceId];

			summary = "You are reporting the following association:";
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
		click: Flag.onReportSubmitClick,
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
		Flag.initOverlay(entityType, data.entityId, data.secondId);
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

module.exports = Flag;
