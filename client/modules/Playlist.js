var Overlay = require("./Overlay.js");

Playlist =
{
	SECTION:
	{
		PRIVATE: 1,
		SHARED: 2,
		PUBLIC: 3,
		FAVORITES: 4,
		RECENT: 5,
	},
	ACCESS:
	{
		PRIVATE: 1,
		SHARED: 2,
		PUBLIC: 3,
	},
	NAME_REGEX: /^[a-z0-9?!@#$%^&*();:_+\-= \[\]{}/|\\"<>'.,]+$/i,
}

// Create a new playlist with the name provided
Playlist.create = function(name, access)
{
	$.ajax
	({
		url: "/playlists/",
		type: "POST",
		data: JSON.stringify({ name: name, access: access }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var playlistId = response;
			var items = [];

			// todo: add playlist to the section if it's cached
			// request the section otherwise

			Playlist.setActive(playlistId, name, access, items);

			Overlay.destroy();
		}
	});
}

// Retrieve playlist tracks and metadata
Playlist.load = function(playlistId)
{
	$.ajax
	({
		url: "/playlists/" + playlistId + "/",
		type: "GET",
		success: Playlist.onLoadResponse,
	});
}

// Retrieve main playlist of the user
Playlist.loadMain = function()
{
	$.ajax
	({
		url: "/own/playlists/main/",
		type: "GET",
		success: Playlist.onLoadResponse,
	});
}

// Set the playlist as active
Playlist.setActive = function(playlistId, name, access, items)
{
	Playlist.active =
	{
		playlistId: playlistId,
		name: name,
		access: access,
	}

	$("#playlist-name").text(name);
	Playlist.setTrackCounter(items.length);

	var ItemList = require("./ItemList.js");
	ItemList.setItems(items);
}

// Retrieve the list of all playlists in a section
Playlist.loadSection = function(sectionId, alias)
{
	// todo: request playlists from the server

	var previewCount = sectionId * 3 + 1;

	for(var i = 1; i < previewCount; i++)
	{
		var $info =
			$("<div>")
				.addClass("info")
				.append(
					$("<div>")
						.addClass("name")
						.text("Playlist " + i),
					$("<div>")
						.addClass("details")
						.text("10 tracks")
				);

		var $icon =
			$("<div>")
				.addClass("edit icon fa fa-pencil");

		var $playlist = 
			$("<div>")
				.addClass("playlist")
				.append($info, $icon);

		$("#playlists").append($playlist);
	}

	var storage = [];

	$(".playlist").each(function()
	{
		storage.push( $(this) );
	});

	$("#playlists")
		.data(alias.toLowerCase(), storage)
		.animate({ scrollTop: 0, }, 0);
}

Playlist.onLoadResponse = function(response)
{
	if(response.errors)
		return;

	var playlist = response[0];
	var items = response[1];

	var playlistId = playlist[0];
	var name = playlist[1];
	var access = playlist[2];

	Playlist.setActive(playlistId, name, access, items);
}

// Fill the playlists section with data from server or the local storage
Playlist.updateSection = function()
{
	var alias = $("#playlists-menu .active").data("alias");

	$("#playlists").empty();

	var storage = $("#playlists").data( alias.toLowerCase() );

	// Already have the playlists stored, retrieve them and bail out
	if(storage != null)
	{
		storage.forEach(function($playlist)
		{
			$("#playlists").append($playlist);
		});

		$("#playlists").animate({ scrollTop: 0, }, 0);

		return;
	}

	Playlist.loadSection( Playlist.SECTION[alias], alias );
}

// Store alias as a data value of the menu button
Playlist.setMenuAlias = function()
{
	var alias = $(this).attr("id");

	// "playlists-menu-private" > "PRIVATE"
	alias = alias
		.substring(alias.indexOf("playlists-menu-") + 15)
		.toUpperCase();

	$(this).data("alias", alias);
}

// Set active section by alias
Playlist.setActiveSection = function(alias)
{
	var $section =
		$( "#playlists-menu-" + alias.toLowerCase() );

	// Section is already active, bail out
	if($section.is(".active"))
		return;

	$("#playlists-menu div").removeClass("active");
	$section.addClass("active");
	
	Playlist.updateSection();
}

// Set track counter to specified value
Playlist.setTrackCounter = function(count)
{
	$("#playlist-details").text(count + " tracks");
}

// Called once upon creating a playlist overlay
Playlist.initPlaylistOverlay = function()
{
	var accessLabels =
	{
		[Playlist.ACCESS.PRIVATE]: "Private (only me)",
		[Playlist.ACCESS.SHARED]: "Shared (anyone with the link)",
		[Playlist.ACCESS.PUBLIC]: "Public",
	};

	for(var access in Playlist.ACCESS)
	{
		var radioId = "access-" + access.toLowerCase();
		var accessId = Playlist.ACCESS[access];

		var $radio = Overlay.createElement
		({
			tag: "<input>",
			attributes:
			{
				id: radioId,
				type: "radio",
				name: "playlist-access",
			},
			data: { "accessId": accessId },
		});

		var $label = Overlay.createElement
		({
			tag: "<label>",
			attributes:
			{
				for: radioId,
			},
			text: accessLabels[accessId],
		});

		( (accessId == 1)
			? $("#playlist-edit-access")
			: $("#window label:last") )
				.after($label)
				.after($radio);
	}
}

// Show playlist creation/playlist edit overlay
Playlist.showPlaylistOverlay = function(playlistId, name)
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();

	if(Overlay.isActive())
		return;

	var elements =
	[{
		tag: "<input>",
		attributes:
		{
			id: "playlist-edit-name",
			type: "text",
			maxlength: 50,
			placeholder: "Name",
		},
		val: (name || ""),
		keyup: Playlist.updatePlaylistOverlay,
	},
	{
		tag: "<p>",
		attributes:
		{
			id: "playlist-edit-access",
		},
		text: "Access:",
	}];

	if(!playlistId)
	{
		elements.push
		({
			tag: "<div>",
			attributes:
			{
				id: "playlist-create",
				class: "inner window-link",
			},
			text: "Create Playlist",
			click: Playlist.onCreatePlaylistClick,
		},
		{
			tag: "<div>",
			attributes:
			{
				id: "playlist-cancel",
				class: "window-link",
			},
			text: "Cancel",
			click: Overlay.destroy,
		});
	}

	var header = (playlistId)
		? "Edit playlist"
		: "Create new playlist";

	Overlay.create
	(header,
	elements,
	{ noSpacer: true },
	function onOverlayCreate()
	{
		Playlist.initPlaylistOverlay();
	});
}

// Update playlist overlay
Playlist.updatePlaylistOverlay = function()
{
	Overlay.clearErrors();
	
	if($("#playlist-edit-name").val().length > 0 &&
		!Playlist.NAME_REGEX.test( $("#playlist-edit-name").val() ))
		Overlay.setError("#playlist-edit-name", "contains prohibited characters");
}

// Called upon clicking the playlist header
Playlist.onHeaderClick = function()
{
	var Account = require("./Account.js");
	var hiding = $("#sidebar").is(".visible");

	if( !Account.authenticated && !hiding)
		return Account.showLoginOverlay();

	$("#header-left").toggleClass("active");
	$("#sidebar").toggleClass("visible");

	if(hiding)
		return;

	Playlist.updateSection();
}

// Called upon clicking the menu button
Playlist.onMenuClick = function()
{
	var alias = $(this).data("alias");
	Playlist.setActiveSection(alias);
}

// Called upon pressing the new playlist button
Playlist.onNewPlaylistClick = function()
{
	Playlist.showPlaylistOverlay();
}

// Called when the create playlist button is pressed
Playlist.onCreatePlaylistClick = function()
{
	if( $("#playlist-edit-name").val().length < 3 )
		Overlay.setError("#playlist-edit-name", "min. 3 characters");

	if($("#playlist-edit-name").val().length > 0 &&
		!Playlist.NAME_REGEX.test( $("#playlist-edit-name").val() ))
		Overlay.setError("#playlist-edit-name", "contains prohibited characters");

	var $radio = Overlay.getActiveRadioButton();

	if(!$radio.length)
		return Overlay.shakeRadioButtonLabels();

	if( Overlay.hasErrors() )
		return;

	var name = $("#playlist-edit-name").val();
	var access = $radio.data("accessId");

	Playlist.create(name, access);
}

Playlist.init = function()
{
	$("#playlists-menu div")
		.each(Playlist.setMenuAlias)
		.click(Playlist.onMenuClick);

	$("#header-left").click(Playlist.onHeaderClick);
	$("#playlist-new").click(Playlist.onNewPlaylistClick)
}

module.exports = Playlist;
