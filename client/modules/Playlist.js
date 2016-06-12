var Overlay = require("./Overlay.js");

var Playlist =
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
	PERSONAL_SECTIONS: ["private", "shared", "public"],
	PERSONAL_SECTION_ICONS:
	[
		"private corner icon fa fa-lock",
		"shared corner icon fa fa-link",
		"public corner icon fa fa-globe",
	],
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
				$("#playlists").data( sectionAlias.toLowerCase() );

			Playlist.setActiveSection(sectionAlias);

			// Add playlist to the section if it's already cached
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

			Playlist.setActive(playlistId, name, access, alias, null, items);

			Overlay.destroy();
		}
	});
}

// Edit name and access of the specified playlist
Playlist.edit = function(playlistId, name, access, alias, sectionAlias)
{
	$.ajax
	({
		url: "/playlists/" + playlistId + "/",
		type: "PUT",
		data: JSON.stringify({ name: name, access: access }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var accessChanged = (access != Playlist.editing.access);

			if(accessChanged)
			{
				// Remove playlist from the current section
				$(".playlist")
					.filterByData("playlistId", playlistId)
					.remove();

				// Clear storage and update the new section
				$("#playlists").removeData( sectionAlias.toLowerCase() )
				Playlist.setActiveSection(sectionAlias);
			}
			else
			{
				// Update name and access of the sidebar item
				$(".playlist")
					.filterByData("playlistId", playlistId)
					.find(".name")
					.text(name)
					.data("access", access);
			}

			// If the changed playlist is active, update the values
			if(Playlist.active && playlistId == Playlist.active.playlistId)
				Playlist.setActive(playlistId, name, access, alias);

			Overlay.destroy();

			// todo: show toast message about successful save
		}
	});
}

// Delete the specified playlist
Playlist.delete = function(playlistId)
{
	$.ajax
	({
		url: "/playlists/" + playlistId + "/",
		type: "DELETE",
		success: function(response)
		{
			if(response.errors)
				return;

			// If removed playlist is currently active, clear the view
			if(Playlist.active &&
				Playlist.active.playlistId == playlistId)
					Playlist.clearActive();

			// Remove playlist from the sidebar
			$(".playlist")
				.filterByData("playlistId", playlistId)
				.remove();

			Overlay.destroy();

			// todo: show toast message about successful deletion
		},
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
		error: Playlist.onLoadError,
	});
}

// Retrieve main playlist of the user
Playlist.loadMain = function()
{
	var Account = require("./Account.js")

	if(!Account.authenticated)
		return;

	$.ajax
	({
		url: "/own/playlists/main/",
		type: "GET",
		success: Playlist.onLoadResponse,
		error: Playlist.onLoadError,
	});
}

// Set the playlist as active
Playlist.setActive = function(playlistId, name, access, alias, user, items)
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
	};

	var $access = $("<span>")
		.attr
		({
			id: "playlist-access",
			class: accessIcons[access],
		});

	$("#playlist-name")
		.text(name)
		.append($access);

	Playlist.highlightActivePlaylist();

	// Updating values of active playlist that changed, bail out
	if(items == null)
		return;

	var playlistUrl = "/playlist/" + alias + "/";

	if(playlistUrl != window.location.pathname)
		history.pushState(null, null, playlistUrl);

	Playlist.setTrackCounter(items.length);

	// Show user data for playlists made by other users
	if(user != null)
	{
		var username = user[0];
		var avatar = user[1];

		var $avatar = $("<img>")
			.attr
			({
				id: "playlist-details-avatar",
				src: avatar,
			});

		var $user = $("<span>")
			.attr("id", "playlist-details-user")
			.text(username)
			.prepend($avatar);

		$("#playlist-details").append($user);
	}

	var Relation = require("./Relation.js");
	var ItemList = require("./ItemList.js");

	// Clear item list filter and restore storage
	if(!Relation.active)
	{
		var Search = require("./Search.js");

		Search.clear();
		ItemList.clearFilter();
		ItemList.restoreStorage();

		Search.updatePlaceholder();
	}

	ItemList.setItems(items);

	if(!Relation.active)
		return;

	var Item = require("./Item.js");

	// Resume viewing recommendations
	Item.active.trackId = Relation.active.trackId;
	Item.active.artist = Relation.active.artist;
	Item.active.title = Relation.active.title;

	Relation.request(Relation.active.trackId,
		Relation.active.resumeTrackId);
}

// Clear active playlist
Playlist.clearActive = function()
{
	Playlist.active = null;

	$("#playlist-name").empty();

	Playlist.highlightActivePlaylist();

	Playlist.clearTrackCounter();

	var ItemList = require("./ItemList.js");
	ItemList.setItems( [] );
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
			)
			.click(Playlist.onPlaylistClick);

	var $icon =
		$("<div>")
			.addClass("edit icon fa fa-pencil")
			.click(Playlist.onEditIconClick);

	var $playlist = 
		$("<div>")
			.addClass("playlist")
			.append($info, $icon)
			.data
			({
				playlistId: playlistId,
				access: access,
				alias: alias,
				count: count,
			});

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

// Clear the active section and remove all playlist data
Playlist.clearAllSections = function()
{
	$("#playlists")
		.empty()
		.removeData();
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
Playlist.setTrackCounter = function(count, relative)
{
	if(count == null)
		count = $("#playlist-details").data("count") + relative;

	$("#playlist-details")
		.data("count", count)
		.text(count + " tracks");

	Playlist.updateSectionCounter(Playlist.active.playlistId,
		Playlist.active.access, count);
}

// Update the track count in the section
Playlist.updateSectionCounter = function(playlistId, access, count, relative)
{
	var playlistSection = access - 1;

	Playlist.PERSONAL_SECTIONS
	.forEach(function(sectionAlias, sectionIndex)
	{
		if(sectionIndex != playlistSection)
			return;

		var $playlist = $(".playlist").filterByData("playlistId", playlistId);

		// Playlist is in the active section, update it in place and bail out
		if($playlist.length)
		{
			if(count == null)
				count = $playlist.data("count") + relative;

			$playlist
				.data("count", count)
				.find(".details")
				.text(count + " tracks");

			return;
		}

		// Search the playlist within the section storage
		var $sectionPlaylists = $("#playlists").data(sectionAlias);

		if($sectionPlaylists != null)
		{
			$sectionPlaylists.forEach(function($sectionPlaylist, playlistIndex)
			{
				var sectionPlaylistId = $sectionPlaylist.data("playlistId");

				if(sectionPlaylistId == playlistId)
				{
					if(count == null)
						count = $sectionPlaylist.data("count") + relative;

					$sectionPlaylists[playlistIndex]
						.data("count", count)
						.find(".details")
						.text(count + " tracks");
				}
			});

			$("#playlists").data(sectionAlias, $sectionPlaylists);
		}
	});
}

// Cleat the track counter text
Playlist.clearTrackCounter = function()
{
	$("#playlist-details").text("");
}

// Load playlist according to URL
Playlist.processUrl = function(onLoadStart)
{
	var url = window.location.pathname.split("/");

	if(typeof onLoadStart == "function")
		onLoadStart();

	if(url[1] != "playlist")
		return Playlist.loadMain();

	var alias = url[2];
	Playlist.load(alias);
}

// Called once upon creating a playlist overlay
Playlist.initPlaylistOverlay = function(currentAccess)
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
			change: Playlist.updatePlaylistOverlay,
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

	// Use current playlist access
	if(currentAccess != null)
	{
		$("#window input[type=\"radio\"]")
			.eq(currentAccess - 1)
			.prop("checked", true);

		return;
	}

	// Use active sidebar section
	var activeAlias = $("#playlists-menu div.active").data("alias");

	$("#window input[type=\"radio\"]")
		.filterByData("sectionAlias", activeAlias)
		.prop("checked", true);
}

// Show playlist creation/playlist edit overlay
Playlist.showPlaylistOverlay = function(playlistId, name, access)
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
		text: "Access to view:",
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
			click: Playlist.onPlaylistCreateClick,
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
		Playlist.initPlaylistOverlay(access);
		Playlist.updatePlaylistOverlay();
	});
}

// Update playlist overlay
Playlist.updatePlaylistOverlay = function()
{
	Overlay.clearErrors();
	
	if($("#playlist-edit-name").val().length > 0 &&
		!Playlist.NAME_REGEX.test( $("#playlist-edit-name").val() ))
		Overlay.setError("#playlist-edit-name",
			"contains prohibited characters");

	// Creating a new playlist, bail out
	if(!Playlist.editing)
		return;

	var nameChanged =
		( $("#playlist-edit-name").val() != Playlist.editing.name );

	var $radio = Overlay.getActiveRadioButton();

	var selectedAccess =
		$radio.parent().children("input[type=\"radio\"]").index($radio) + 1;

	var accessChanged =
		( selectedAccess != Playlist.editing.access );

	// At least one option needs to be different to confirm changes
	var saveAllowed = (nameChanged || accessChanged);

	var deletingPlaylist = (Playlist.deleting != null);

	deletingPlaylist
		? ( $("#playlist-edit-code").val() == Playlist.deleting.code )
			? Playlist.onPlaylistCodeInput()
			: Overlay.setAction("Cancel", Playlist.onPlaylistCancelClick)
		: saveAllowed
			? Overlay.setAction("Save", Playlist.onPlaylistSaveClick)
			: Overlay.setAction("Remove", Playlist.onPlaylistRemoveClick);

	$("#playlist-edit-name").prop("readOnly", deletingPlaylist);
	$("#overlay input[type=\"radio\"]").prop("disabled", deletingPlaylist);
	$("#overlay label").toggleClass("disabled", deletingPlaylist);
}

// Called when the user authentication is done
Playlist.onAccountSync = function()
{
	var Account = require("./Account.js");

	// Request or clear the playlists storage
	Account.authenticated
		? Playlist.updateSection()
		: Playlist.clearAllSections();

	// Load playlist from the current url
	if(!Playlist.active || !Account.authenticated)
		return Playlist.processUrl();

	// Remove playlist creator data if it's the same user
	var $user = $("#playlist-details-user");

	if( $user.length &&
		$user.text() == Account.own.username )
			$user.remove();
}

// Called when the playlist is loaded
Playlist.onLoadResponse = function(response)
{
	if(response.errors)
		return;

	var playlist = response[0];
	var items = response[1];

	var playlistId = playlist[0];
	var name = playlist[1];
	var access = playlist[2];
	var alias = playlist[3];
	var user = playlist[4];

	Playlist.setActive(playlistId, name, access, alias, user, items);
}

// Called when the playlist failed to load
Playlist.onLoadError = function(response)
{
	Playlist.clearActive();

	var json = response.responseJSON;

	if(!json || !json.errors)
		return;

	var error = json.errors[0];

	// if(error == "playlist not found")
	// todo: show toast about the error

	// if(error == "no access")
	// todo: show toast about the error

	// if(error == "internal error")
	// todo: show toast about the error, suggesting to try again later
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

// Called when the active history entry changes
Playlist.onWindowPopState = function()
{
	Playlist.processUrl(function onPlaylistLoadStart()
	{
		var Relation = require("./Relation.js");

		if(Relation.active)
			Relation.clearView();
	});
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
	Playlist.editing = null;
	Playlist.deleting = null;

	Playlist.showPlaylistOverlay();
}

// Called when the create playlist button is clicked
Playlist.onPlaylistCreateClick = function()
{
	if( $("#playlist-edit-name").val().length < 3 )
		Overlay.setError("#playlist-edit-name", "min. 3 characters");

	if($("#playlist-edit-name").val().length > 0 &&
		!Playlist.NAME_REGEX.test( $("#playlist-edit-name").val() ))
		Overlay.setError("#playlist-edit-name",
			"contains prohibited characters");

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

// Called when the save playlist button is clicked
Playlist.onPlaylistSaveClick = function()
{
	var $radio = Overlay.getActiveRadioButton();

	if(!$radio.length)
		return Overlay.shakeRadioButtonLabels();

	if( Overlay.hasErrors() )
		return;

	var name = $("#playlist-edit-name").val();

	var access =
		$radio.parent().children("input[type=\"radio\"]").index($radio) + 1;

	var sectionAlias = $radio.data("sectionAlias");

	Playlist.edit(Playlist.editing.playlistId, name,
		access, Playlist.editing.alias, sectionAlias);
}

// Called when the remove playlist button is clicked
Playlist.onPlaylistRemoveClick = function()
{
	Playlist.deleting =
	{
		playlistId: Playlist.editing.playlistId,
		code: Math.floor( (Math.random() * 888) + 111 ),
	};

	$("#window-header").text("Delete playlist");

	var $code = Overlay.createElement
	({
		tag: "<input>",
		attributes:
		{
			id: "playlist-edit-code",
			type: "text",
			maxlength: 3,
			placeholder: "Type " + Playlist.deleting.code +
				" to confirm. This cannot be undone.",
		},
		keyup: Playlist.updatePlaylistOverlay,
	});

	$("#playlist-edit-name").after( $code.hide() );
	$("#playlist-edit-code").slideDown(200);

	Playlist.updatePlaylistOverlay();
}

// Called when the cancel playlist deletion button is clicked
Playlist.onPlaylistCancelClick = function()
{
	Playlist.deleting = null;

	$("#window-header").text("Edit playlist");

	$("#playlist-edit-code").slideUp(200, function()
	{
		$(this).remove();
	});

	Playlist.updatePlaylistOverlay();
}

// Called when the confirmation code has been entered
Playlist.onPlaylistCodeInput = function()
{
	Playlist.delete(Playlist.deleting.playlistId);
}

// Called when the playlist item is clicked
Playlist.onPlaylistClick = function()
{
	var $playlist = $(this).parent();

	// Do nothing if the playlist is already active
	if( $playlist.is(".active") )
		return;

	var Relation = require("./Relation.js");

	if(Relation.active)
		Relation.clearView();

	Playlist.load( $playlist.data("playlistId") );
}

// Called when the pencil icon is clicked
Playlist.onEditIconClick = function()
{
	var $playlist = $(this).parent();

	var data = $playlist.data();
	var name = $playlist.find(".name").text();

	Playlist.editing =
	{
		playlistId: data.playlistId,
		name: name,
		access: data.access,
		alias: data.alias,
	}

	Playlist.deleting = null;

	Playlist.showPlaylistOverlay(data.playlistId, name, data.access);
}

Playlist.init = function()
{
	$(window).on("popstate", Playlist.onWindowPopState);

	$("#playlists-menu div")
		.each(Playlist.setMenuAlias)
		.click(Playlist.onMenuClick);

	$("#header-left").click(Playlist.onHeaderClick);
	$("#playlist-new").click(Playlist.onNewPlaylistClick)
}

module.exports = Playlist;
