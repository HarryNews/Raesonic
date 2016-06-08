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
Playlist.create = function(name, access, sectionAlias)
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

			var playlistId = response[0];
			var alias = response[1];
			var items = [];

			var storage =
				$("#playlists").data(sectionAlias.toLowerCase());

			// Add playlist to the section whether it's cached or not
			if(storage != null)
			{
				var playlist =
				[
					playlistId,
					name,
					access,
					alias,
					0, // items count
				];

				var $playlist = Playlist.addSectionPlaylist(playlist);
				storage.push( $playlist.clone(true) );

				$("#playlists")
					.data(sectionAlias.toLowerCase(), storage)
					.animate({
						scrollTop: $("#playlists").prop("scrollHeight"),
					}, 0);
			}
			else
			{
				Playlist.setActiveSection(sectionAlias);
			}

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
	var accessIcons =
	{
		[Playlist.ACCESS.PRIVATE]: "private icon fa fa-lock",
		[Playlist.ACCESS.SHARED]: "shared icon fa fa-link",
		[Playlist.ACCESS.PUBLIC]: "public icon fa fa-globe",
	};

	Playlist.active =
	{
		playlistId: playlistId,
		name: name,
		access: access,
	}

	var $access = $("<span>")
		.attr
		({
			id: "playlist-access",
			class: accessIcons[access],
		});

	$("#playlist-name")
		.text(name)
		.append($access);

	Playlist.setTrackCounter(items.length);
	Playlist.highlightActivePlaylist();

	var ItemList = require("./ItemList.js");
	ItemList.setItems(items);
}

// Retrieve the list of all playlists in a section
Playlist.loadSection = function(sectionId, sectionAlias)
{
	// todo: retrieve from cookies
	if(sectionId == Playlist.SECTION.RECENT)
		return;

	$.ajax
	({
		url: "/own/playlists/" + sectionAlias.toLowerCase() + "/",
		type: "GET",
		success: function(playlists)
		{
			if(playlists)
			{
				playlists.forEach(Playlist.addSectionPlaylist);
			}

			var storage = [];

			$(".playlist").each(function()
			{
				storage.push( $(this).clone(true) );
			});

			Playlist.highlightActivePlaylist();

			$("#playlists")
				.data(sectionAlias.toLowerCase(), storage)
				.animate({ scrollTop: 0, }, 0);
		}
	});
}

Playlist.addSectionPlaylist = function(playlist)
{
	var playlistId = playlist[0];
	var name = playlist[1];
	var access = playlist[2];
	var alias = playlist[3];
	var count = playlist[4];

	var $info =
		$("<div>")
			.addClass("info")
			.append(
				$("<div>")
					.addClass("name")
					.text(name),
				$("<div>")
					.addClass("details")
					.text(count + " tracks")
			);

	var $icon =
		$("<div>")
			.addClass("edit icon fa fa-pencil");

	var $playlist = 
		$("<div>")
			.addClass("playlist")
			.append($info, $icon)
			.data
			({
				playlistId: playlistId,
				access: access,
			})
			.click(Playlist.onPlaylistClick);

	$("#playlists").append($playlist);

	return $playlist;
}

// Remove active class from all playlists but the active one
Playlist.highlightActivePlaylist = function()
{
	$(".playlist.active").removeClass("active");

	if(!Playlist.active)
		return;
	
	$(".playlist")
		.filterByData("playlistId", Playlist.active.playlistId)
		.addClass("active");
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
Playlist.updateSection = function(previousAlias)
{
	// Obtain storage of the currently active section
	var sectionAlias = $("#playlists-menu .active").data("alias");
	var storage = $("#playlists").data( sectionAlias.toLowerCase() );

	// If the active section has not changed
	if(previousAlias == null)
	{
		// Active section is already up-to-date, bail out
		if(storage != null)
			return;

		// Load active section from the server and bail out
		Playlist.loadSection( Playlist.SECTION[sectionAlias], sectionAlias );
		return;
	}

	// Store the previously active section
	var previousStorage = [];

	$(".playlist").each(function()
	{
		previousStorage.push( $(this).detach() );
	});

	$("#playlists").data(previousAlias.toLowerCase(), previousStorage);

	// Section storage contains the playlists, retrieve them and bail out
	if(storage != null)
	{
		storage.forEach(function($playlist)
		{
			$("#playlists").append($playlist);
		});

		Playlist.highlightActivePlaylist();
		$("#playlists").animate({ scrollTop: 0, }, 0);

		return;
	}

	// No storage found, load active section from the server
	Playlist.loadSection( Playlist.SECTION[sectionAlias], sectionAlias );
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

// Hide/show the playlists management sidebar
Playlist.toggleSidebar = function()
{
	var Account = require("./Account.js");
	var hidingSidebar = $("#sidebar").is(".visible");

	if( !Account.authenticated && !hidingSidebar)
		return Account.showLoginOverlay();

	$("#header-left").toggleClass("active");
	$("#sidebar").toggleClass("visible");

	if(hidingSidebar)
	{
		$("body").unbind("mousedown",
			Playlist.onDocumentMouseDown);

		return;
	}

	Playlist.updateSection();

	$("body").bind("mousedown",
		Playlist.onDocumentMouseDown);
}

// Set active section by alias
Playlist.setActiveSection = function(alias)
{
	var $section =
		$( "#playlists-menu-" + alias.toLowerCase() );

	// Section is already active, bail out
	if($section.is(".active"))
		return;

	var $previous = $("#playlists-menu div.active");
	var previousAlias = $previous.data("alias");

	$previous.removeClass("active");
	$section.addClass("active");
	
	Playlist.updateSection(previousAlias);
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
			data:
			{
				accessId: accessId,
				sectionAlias: access,
			},
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

	// Default access according to active sidebar section
	var activeAlias = $("#playlists-menu div.active").data("alias");

	$("#window input[type=\"radio\"]")
		.filterByData("sectionAlias", activeAlias)
		.prop("checked", true);
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

// Called when the mouse is pressed somewhere
Playlist.onDocumentMouseDown = function(event)
{
	var $target = $(event.target);

	// Ignore clicks on specific elements
	if( $target.is("#header-left") ||
		$target.is("#overlay") ||
		$target.parents("#header-left").length ||
		$target.parents("#sidebar").length ||
		$target.parents("#controls").length ||
		$target.parents("#overlay").length )
		return;

	Playlist.toggleSidebar();
}

// Called upon clicking the playlist header
Playlist.onHeaderClick = function()
{
	Playlist.toggleSidebar();
}

// Called upon clicking on the section menu button
Playlist.onMenuClick = function()
{
	var alias = $(this).data("alias");
	Playlist.setActiveSection(alias);
}

// Called upon clicking on the new playlist button
Playlist.onNewPlaylistClick = function()
{
	Playlist.showPlaylistOverlay();
}

// Called when the create playlist button is clicked upon
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
	var sectionAlias = $radio.data("sectionAlias");

	Playlist.create(name, access, sectionAlias);
}

// Called when the playlist item is clicked upon
Playlist.onPlaylistClick = function()
{
	var $playlist = $(this);

	// Do nothing if the playlist is already active
	if( $playlist.is(".active") )
		return;

	Playlist.load( $playlist.data("playlistId") );
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
