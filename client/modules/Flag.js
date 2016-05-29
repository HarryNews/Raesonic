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

Flag.REASONS =
{
	[Flag.ENTITY.RELATION]:
	[
		[1, "reason-mismatching", "Mismatching recommendation"],
		[2, "reason-incorrect", "Intentionally incorrect"],
	],
	[Flag.ENTITY.TRACK_EDIT]:
	[
		[1, "reason-mismatching", "Mismatching information"],
		[2, "reason-incorrect", "Intentionally incorrect"],
	],
	[Flag.ENTITY.CONTENT_LINK]:
	[
		[1, "reason-mismatching", "Mismatching association"],
		[2, "reason-incorrect", "Intentionally incorrect"],
		[3, "reason-unavailable", "Content not available"],
	]
};

// Flag specified entity as inappropriate
Flag.create = function(entityType, entityId, secondId, reasonId, $flag)
{
	var flagUrl;

	switch(entityType)
	{
		case Flag.ENTITY.USER:
		{
			flagUrl = "/users/" + entityId + "/flags/";
			break;
		}
		case Flag.ENTITY.PLAYLIST:
		{
			flagUrl = "/playlists/" + entityId + "/flags/";
			break;
		}
		case Flag.ENTITY.RELATION:
		{
			flagUrl = "/tracks/" + entityId + "/relations/" + secondId + "/flags/";
			break;
		}
		case Flag.ENTITY.TRACK_EDIT:
		{
			flagUrl = "/tracks/" + entityId + "/edits/" + secondId + "/flags/";
			break;
		}
		case Flag.ENTITY.CONTENT_LINK:
		{
			flagUrl = "/content/" + entityId + "/links/" + secondId + "/flags/";
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
			
			$flag.addClass("active");

			Overlay.destroy();
		}
	});
}

// Called once upon creating a flag overlay
Flag.initOverlay = function(entityType)
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
}

// Called upon clicking the flag icon
Flag.onIconClick = function()
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();

	if(Overlay.isActive())
		return;

	var summary;
	var subject;
	var extraSubject;

	var data = $(this).data();
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
			var Content = require("../modules/Content.js");

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
			flag: $(this),
		}
	});

	if(typeof extraSubject != "undefined")
	{
		if(entityType == Flag.ENTITY.CONTENT_LINK)
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
		Flag.initOverlay(entityType);
	});
}

// Called when the submit report button is pressed
Flag.onReportSubmitClick = function()
{
	var $radio = Overlay.getActiveRadioButton();

	if(!$radio.length)
		return Overlay.shakeRadioButtonLabels();

	var reasonId = $radio.data("reasonId");
	var data = $("#flag-subject").data();

	Flag.create(data.entityType, data.entityId, data.secondId,
		reasonId, data.flag);
}

module.exports = Flag;
