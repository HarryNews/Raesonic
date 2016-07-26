var Throttle = require("throttle-debounce/throttle");
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
		FLAGS: 6,
	},
	ACCESS:
	{
		PRIVATE: 1,
		SHARED: 2,
		PUBLIC: 3,
	},
	PERSONAL_SECTIONS: ["private", "shared", "public"],
	SUBCAT_ITEM: true,
	NAME_REGEX: /^[a-z0-9?!@#$%^&*();:_+\-= \[\]{}/|\\"<>'.,]+$/i,
	PLAYLIST_URL: window.location.origin + "/playlist/",
	MAX_RECENT_HISTORY: 20,
};

Playlist.ACCESS_LABELS = {};
Playlist.ACCESS_LABELS[Playlist.ACCESS.PRIVATE] =
	"Private (only me)";
Playlist.ACCESS_LABELS[Playlist.ACCESS.SHARED] =
	"Shared (anyone with the link)";
Playlist.ACCESS_LABELS[Playlist.ACCESS.PUBLIC] =
	"Public";

// Create a new playlist with the name provided
Playlist.create = function(name, access, sectionAlias)
{
	var Toast = require("./Toast.js");

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

			Playlist.setActiveSection(sectionAlias);

			var playlist =
			[
				playlistId,
				name,
				access,
				alias,
				0, // items count
			];

			Playlist.addCachedSectionPlaylist(playlist, sectionAlias);

			var playlistData =
			{
				playlistId: playlistId,
				name: name,
				access: access,
				alias: alias,
				user: null,
				favorited: false,
				items: items,
			};

			Playlist.setActive(playlistData);

			Overlay.destroy();

			Toast.show("Playlist created successfully", Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Playlist.createThrottled = Throttle(5000,
function(name, access, sectionAlias)
{
	Playlist.create(name, access, sectionAlias);
});

// Edit name and access of the specified playlist
Playlist.edit = function(playlistId, name, access, alias, sectionAlias)
{
	var Toast = require("./Toast.js");

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

			var playlist =
			{
				playlistId: playlistId,
				name: name,
				access: access,
				alias: alias,
				user: Playlist.active.user,
				favorited: Playlist.active.favorited,
				count: Playlist.active.count,
			};

			var accessChanged = (access != Playlist.editing.access);

			if(accessChanged)
			{
				// Remove playlist from the current section
				$(".playlist")
					.filterByData("playlistId", playlistId)
					.remove();

				// Clear storage and update the new section
				$("#playlists").removeData( sectionAlias.toLowerCase() );
				Playlist.setActiveSection(sectionAlias);
			}
			else
			{
				Playlist.updateCachedSectionPlaylist(playlist, sectionAlias);
			}

			// If the changed playlist is active, update the values
			if(Playlist.active && playlistId == Playlist.active.playlistId)
				Playlist.setActive(playlist);

			Overlay.destroy();

			var Toast = require("./Toast.js");
			Toast.show("Playlist saved successfully", Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Playlist.editThrottled = Throttle(2000,
function(playlistId, name, access, alias, sectionAlias)
{
	Playlist.edit(playlistId, name, access, alias, sectionAlias);
});

// Delete the specified playlist
Playlist.delete = function(playlistId)
{
	var Toast = require("./Toast.js");

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

			Toast.show("Playlist has been deleted", Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Playlist.deleteThrottled = Throttle(5000,
function(playlistId)
{
	Playlist.delete(playlistId);
});

// Add the playlist to personal favorites
Playlist.addFavorite = function(playlistId)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/own/playlists/favorites/",
		type: "POST",
		data: JSON.stringify({ playlistId: playlistId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			if(Playlist.active.playlistId == playlistId)
				Playlist.active.favorited = true;

			var playlist =
			[
				Playlist.active.playlistId,
				Playlist.active.name,
				Playlist.active.access,
				Playlist.active.alias,
				Playlist.active.count,
			];

			Playlist.addCachedSectionPlaylist(playlist, "FAVORITES");

			Toast.show("Playlist has been added to Favorites",
				Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Playlist.addFavoriteThrottled = Throttle(5000,
function(playlistId)
{
	Playlist.addFavorite(playlistId);
});

// Add the playlist to personal favorites
Playlist.removeFavorite = function(playlistId)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/own/playlists/favorites/" + playlistId + "/",
		type: "DELETE",
		success: function(response)
		{
			if(response.errors)
				return;

			if(Playlist.active.playlistId == playlistId)
			{
				Playlist.active.favorited = false;

				Playlist.removeCachedSectionPlaylist
					(Playlist.active.alias, "FAVORITES");
			}

			Toast.show("Playlist has been removed from Favorites",
				Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Playlist.removeFavoriteThrottled = Throttle(5000,
function(playlistId)
{
	Playlist.removeFavorite(playlistId);
});

// Retrieve playlist tracks and metadata
Playlist.load = function(playlistAlias)
{
	$.ajax
	({
		url: "/playlists/" + playlistAlias + "/",
		type: "GET",
		success: Playlist.onLoadResponse,
		error: Playlist.onLoadError,
	});
}

// Retrieve main playlist of the user
Playlist.loadMain = function()
{
	var Account = require("./Account.js");

	var requestUrl = (Account.authenticated)
		? "/own/playlists/main/"
		: "/playlists/landing/";

	$.ajax
	({
		url: requestUrl,
		type: "GET",
		success: Playlist.onLoadResponse,
		error: Playlist.onLoadError,
	});
}

// Set the playlist as active
Playlist.setActive = function(playlist)
{
	var playlistId = playlist.playlistId;
	var name = playlist.name;
	var access = playlist.access;
	var alias = playlist.alias;
	var user = playlist.user;
	var favorited = playlist.favorited;
	var items = playlist.items;

	var count = (playlist.count != null)
		? playlist.count
		: (items.length != null)
			? items.length
			: 0;

	$("#items").removeClass("no-active-playlist");

	var accessName = Playlist.PERSONAL_SECTIONS[access - 1];

	Playlist.active =
	{
		playlistId: playlistId,
		name: name,
		access: access,
		alias: alias,
		user: user,
		favorited: favorited,
		count: count,
	};

	var $access = $("<span>")
		.attr("id", "playlist-access")
		.text(accessName);

	$("#playlist-name")
		.text(name)
		.append($access);

	Playlist.highlightActivePlaylist();

	// Updating values of active playlist that changed, bail out
	if(items == null)
		return;

	var playlistUrl = (alias != "landing")
		? "/playlist/" + alias + "/"
		: "/";

	if(playlistUrl != window.location.pathname)
		history.pushState(null, null, playlistUrl);

	Playlist.setTrackCounter(items.length);
	$("#playlist-details-user").remove();

	var sectionAlias =
		$("#playlists-dropdown .dropdown-item.active")
			.data("alias");

	if(user != null)
	{
		// Show user data for playlists made by other users
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

		// Default to private section if the playlist is not owned
		if(sectionAlias == null)
			Playlist.setActiveSection("PRIVATE");

		if(sectionAlias == null || sectionAlias != "RECENT")
		{
			// Store data about recently viewed playlist
			var Local = require("./Local.js");
			var recent = Local.get( "recent", [] );

			// Remove duplicates
			recent.forEach(function(recentPlaylist, recentIndex)
			{
				if( recentPlaylist[0] == playlistId )
					recent.splice(recentIndex, 1);
			});

			var recentData =
			[
				playlistId,
				name,
				alias,
			];

			// Add to the start, limit to a constant size
			recent.unshift(recentData);
			recent.slice(0, Playlist.MAX_RECENT_HISTORY);

			Local.set( "recent", JSON.stringify(recent) );
		}
	}
	else
	{
		if(playlistId != 0)
		{
			// Remove recent data matching own playlist
			var Local = require("./Local.js");
			var recent = Local.get( "recent", [] );

			recent.forEach(function(recentPlaylist, recentIndex)
			{
				if( recentPlaylist[0] == playlistId )
					recent.splice(recentIndex, 1);
			});

			Local.set( "recent", JSON.stringify(recent) );

			if(sectionAlias != null && sectionAlias == "RECENT")
				Playlist.updateSection("RECENT");

			// Default to the owned playlist's section
			if(sectionAlias == null)
			{
				var switchAlias =
					Playlist.PERSONAL_SECTIONS[access - 1];

				Playlist.setActiveSection(switchAlias);
			}
		}
		else
		{
			var Flag = require("./Flag.js");

			// Flagged entity playlists
			switch(alias)
			{
				case "track-name-flags":
				{
					Playlist.active.flags = Flag.ENTITY.TRACK_EDIT;
					break;
				}
				case "content-association-flags":
				{
					Playlist.active.flags = Flag.ENTITY.CONTENT_LINK;
					break;
				}
				default:
				{
					break;
				}
			};

			Playlist.setActiveSection("FLAGS");
		}
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
	Playlist.clearActiveHeader();

	Playlist.highlightActivePlaylist();

	var ItemList = require("./ItemList.js");
	ItemList.setItems( [] );

	$("#items").addClass("no-active-playlist");
}

// Retrieve the list of all playlists in a section
Playlist.loadSection = function(sectionId, sectionAlias)
{
	switch(sectionId)
	{
		case Playlist.SECTION.RECENT:
		{
			var sectionAlias =
				$("#playlists-dropdown .dropdown-item.active")
					.data("alias");

			if(sectionAlias != null && sectionAlias == "RECENT")
				$(".playlist").remove();

			var Local = require("./Local.js");
			var recent = Local.get( "recent", [] );
			var playlists = [];

			recent.forEach(function(recentPlaylist)
			{
				playlists.push
				([
					recentPlaylist[0], // playlistId
					recentPlaylist[1], // name
					2, // access
					recentPlaylist[2], // alias
					"view",
				]);
			});

			// Clear storage and add recent playlists
			$("#playlists").removeData( sectionAlias.toLowerCase() );
			Playlist.setSectionPlaylists(playlists, sectionAlias);
			return;
		}
		case Playlist.SECTION.FLAGS:
		{
			var playlists =
			[
				[
					0,
					"Track Name Flags",
					Playlist.ACCESS.PUBLIC,
					"track-name-flags",
					"view associated",
				],
				[
					0,
					"Content Association Flags",
					Playlist.ACCESS.PUBLIC,
					"content-association-flags",
					"view associated",
				],
			];

			Playlist.setSectionPlaylists(playlists, sectionAlias);
			return;
		}
		default:
		{
			break;
		}
	}

	$.ajax
	({
		url: "/own/playlists/" + sectionAlias.toLowerCase() + "/",
		type: "GET",
		success: function(response)
		{
			var playlists = response;
			Playlist.setSectionPlaylists(playlists, sectionAlias);
		},
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
			.addClass("edit icon")
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

// Add playlist to the cached section
Playlist.addCachedSectionPlaylist = function(playlist, sectionAlias)
{
	var activeSectionAlias =
		$("#playlists-dropdown .dropdown-item.active")
			.data("alias");

	var isActiveSection = (activeSectionAlias != null &&
		activeSectionAlias == sectionAlias);

	var storage = $("#playlists").data( sectionAlias.toLowerCase() );

	if(storage == null)
		return;

	var isDuplicate = false;

	storage.forEach(function($playlist)
	{
		if( $playlist.data("alias") == playlist[3] )
			isDuplicate = true;
	});

	if(isDuplicate)
		return;

	var $playlist = Playlist.addSectionPlaylist(playlist);
	storage.push( $playlist.clone(true) );
	
	if(!isActiveSection)
		$playlist.remove();

	$("#playlists")
		.data(sectionAlias.toLowerCase(), storage)
		.animate({
			scrollTop: $("#playlists").prop("scrollHeight"),
		}, 0);

	Playlist.highlightActivePlaylist();
}

// Update playlist on the cached section
Playlist.updateCachedSectionPlaylist = function(playlist, sectionAlias)
{
	var playlistId = playlist.playlistId;
	var name = playlist.name;
	var access = playlist.access;
	var alias = playlist.alias;

	var activeSectionAlias =
		$("#playlists-dropdown .dropdown-item.active")
			.data("alias");

	if(activeSectionAlias != null &&
		activeSectionAlias == sectionAlias)
	{
		// Update name and access on the active section
		$(".playlist")
			.filterByData("playlistId", playlistId)
			.data("access", access)
			.find(".name")
			.text(name);
	}

	var storage = $("#playlists").data( sectionAlias.toLowerCase() );

	if(storage == null)
		return;

	storage.forEach(function($playlist, playlistIndex)
	{
		if( $playlist.data("alias") == alias )
		{
			$playlist
				.data("access", access)
				.find(".name")
				.text(name);
		}
	});

	$("#playlists")
		.data(sectionAlias.toLowerCase(), storage);

	Playlist.highlightActivePlaylist();
}

// Remove playlist from the cached section
Playlist.removeCachedSectionPlaylist = function(playlistAlias, sectionAlias)
{
	var activeSectionAlias =
		$("#playlists-dropdown .dropdown-item.active")
			.data("alias");

	if(activeSectionAlias != null &&
		activeSectionAlias == sectionAlias)
	{
		// Remove playlist from the active section
		$(".playlist")
			.filterByData("alias", playlistAlias)
			.remove();
	}

	var storage = $("#playlists").data( sectionAlias.toLowerCase() );

	if(storage == null)
		return;

	storage.forEach(function($playlist, playlistIndex)
	{
		if( $playlist.data("alias") == playlistAlias )
			storage.splice(playlistIndex, 1);
	});

	$("#playlists")
		.data(sectionAlias.toLowerCase(), storage);

	Playlist.highlightActivePlaylist();
}

// Remove active class from all playlists but the active one
Playlist.highlightActivePlaylist = function()
{
	$(".playlist.active").removeClass("active");

	if(!Playlist.active)
		return;
	
	$(".playlist")
		.filterByData("alias", Playlist.active.alias)
		.addClass("active");
}

// Fill the playlists section with data from server or the local storage
Playlist.updateSection = function(previousAlias)
{
	// Obtain storage of the currently active section
	var sectionAlias =
		$("#playlists-dropdown .dropdown-item.active").data("alias");

	if(sectionAlias == null)
		return;

	Playlist.updateNav(sectionAlias);

	var storage = $("#playlists").data( sectionAlias.toLowerCase() );

	var isSectionCached =
		( storage != null && sectionAlias != "RECENT" );

	// If the active section has not changed
	if(previousAlias == null)
	{
		if(isSectionCached)
			return;

		// Load active section from the server and bail out
		Playlist.loadSection( Playlist.SECTION[sectionAlias], sectionAlias );

		if(Playlist.active)
			Playlist.setTrackCounter(Playlist.active.count);

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
	if(isSectionCached)
	{
		storage.forEach(function($playlist)
		{
			$("#playlists").append($playlist);
		});

		Playlist.highlightActivePlaylist();
		$("#playlists").animate({ scrollTop: 0, }, 0);

		$(".playlist")
			.hide()
			.delay(200)
			.fadeIn(400);

		return;
	}

	// No storage found, load active section from the server
	Playlist.loadSection( Playlist.SECTION[sectionAlias], sectionAlias );
	
	if(Playlist.active)
		Playlist.setTrackCounter(Playlist.active.count);
}

// Update nav in the playlists dropdown header button
Playlist.updateNav = function(alias)
{
	var $section =
		$( "#playlists-dropdown #item-" + alias.toLowerCase() );

	var $subcat = $section.parents(".dropdown-subcat");
	var inSubcat = ($subcat.length != 0)

	$elements = [];

	if(inSubcat)
	{
		var name = $subcat
			.find(".subcat-header .label")
			.text();

		var $label = $("<div>")
			.addClass("label")
			.text(name);

		var $icon = $("<div>")
			.addClass("navarrow icon");

		$elements.push($label, $icon)
	}

	var name = alias.charAt(0).toUpperCase() +
		alias.slice(1).toLowerCase();

	var $label = $("<div>")
		.addClass("label")
		.text(name);

	$elements.push($label);

	$("#playlist-active-nav")
		.empty()
		.append($elements);
}

// Add a category to the playlists dropdown
Playlist.addDropdownCategory = function(name, $elements)
{
	$("#playlists-dropdown")
		.append(
			$("<div>")
				.attr("id", "category-" + name)
				.addClass("dropdown-category")
				.append($elements)
		);
}

// Add a subcategory to the playlists dropdown
Playlist.addDropdownSubcat = function(name, $elements)
{
	var $icon = $("<div>")
		.addClass("list" + name.toLowerCase() + " icon");

	var $label = $("<div>")
		.addClass("label")
		.text(name);

	var $expandIcon = $("<div>")
		.addClass("subcatexpand icon");

	var $header = $("<div>")
		.addClass("subcat-header")
		.append($icon, $label, $expandIcon)
		.click(Playlist.onSubcatHeaderClick);

	var $items = $("<div>")
		.addClass("subcat-items")
		.append($elements);

	var subcatId = name.toLowerCase();

	var $subcat = $("<div>")
		.attr("id", "subcat-" + subcatId)
		.addClass("dropdown-subcat")
		.append($header, $items);

	return $subcat;
}

// Add an item to the playlists dropdown
Playlist.addDropdownItem = function(name, inSubcat)
{
	var iconClass = inSubcat
		 ? "navarrow icon"
		 : "list" + name.toLowerCase() + " icon";

	var $icon = $("<div>")
		.addClass(iconClass);

	var $label = $("<div>")
		.addClass("label")
		.text(name);

	var itemId = name.toLowerCase();
	var alias = name.toUpperCase();

	var $item = $("<div>")
		.attr("id", "item-" + itemId)
		.addClass("dropdown-item")
		.data("alias", alias)
		.append($icon, $label)
		.click(Playlist.onDropdownItemClick);

	return $item;
}

// Initialise playlists dropdown
Playlist.initDropdown = function()
{
	Playlist.addDropdownCategory("own",
	[
		Playlist.addDropdownSubcat("Playlists",
		[
			Playlist.addDropdownItem("Private", Playlist.SUBCAT_ITEM),
			Playlist.addDropdownItem("Shared", Playlist.SUBCAT_ITEM),
			Playlist.addDropdownItem("Public", Playlist.SUBCAT_ITEM),
		]),
		Playlist.addDropdownItem("Favorites"),
		Playlist.addDropdownItem("Recent"),
	]);

	var globalItems = [];

	var Reputation = require("./Reputation.js");

	if( Reputation.hasPermission(
		Reputation.PERMISSION.VIEW_FLAGS) )
			globalItems.push( Playlist.addDropdownItem("Flags") );

	if(globalItems.length)
		Playlist.addDropdownCategory("global", globalItems);

	if(Playlist.active != null)
	{
		// Obtain alias from the active playlist, unless it belongs to another user
		var sectionAlias = (Playlist.active.user == null)
			? Playlist.PERSONAL_SECTIONS[Playlist.active.access - 1]
			: "PRIVATE";

		Playlist.setActiveSection(sectionAlias);
	}
}

// Clear the dropdown, active section and remove all playlist data
Playlist.clearAllSections = function()
{
	$("#playlists-dropdown").empty();

	$("#playlists")
		.empty()
		.removeData();

	if( $("#sidebar").is(".visible") )
		Playlist.toggleSidebar();
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
		$("body")
			.unbind("mousemove",
				Playlist.onDocumentMouseMove)
			.unbind("mousedown",
				Playlist.onDocumentMouseDown);

		Playlist.hidePlaylistOptions();
		return;
	}

	Playlist.updateSection();

	$("body")
		.bind("mousemove",
			Playlist.onDocumentMouseMove)
		.bind("mousedown",
			Playlist.onDocumentMouseDown);
}

// Set active section by alias
Playlist.setActiveSection = function(alias)
{
	var $section =
		$( "#playlists-dropdown #item-" + alias.toLowerCase() );

	// Section is already active, bail out
	if( $section.is(".active") )
		return;

	var $previous =
		$("#playlists-dropdown .dropdown-item.active");

	var previousAlias = $previous.data("alias");

	$previous
		.parents(".dropdown-subcat")
		.removeClass("active");

	$previous.removeClass("active");

	var $subcat = $section.parents(".dropdown-subcat");
	var inSubcat = ($subcat.length != 0)

	if(inSubcat)
	{
		$section
			.parents(".dropdown-subcat")
			.addClass("active");
	}

	$section.addClass("active");
	
	Playlist.updateSection(previousAlias);
}

// Set the playlists of the active section
Playlist.setSectionPlaylists = function(playlists, sectionAlias)
{
	if(playlists)
		playlists.forEach(Playlist.addSectionPlaylist);

	var storage = [];

	$(".playlist").each(function()
	{
		storage.push( $(this).clone(true) );
	});

	Playlist.highlightActivePlaylist();

	$("#playlists")
		.data(sectionAlias.toLowerCase(), storage)
		.animate({ scrollTop: 0, }, 0);

	$(".playlist")
		.hide()
		.delay(200)
		.fadeIn(400);
}

// Set track counter to specified value
Playlist.setTrackCounter = function(count, relative)
{
	if(count == null)
		count = $("#playlist-details").data("count") + relative;

	$("#playlist-details").data("count", count)
	$("#playlist-details-count").text(count + " tracks");

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

// Clear the active playlist information
Playlist.clearActiveHeader = function()
{
	$("#playlist-name").empty();
	$("#playlist-details-count").empty();
	$("#playlist-details-user").remove();
}

// Load playlist according to URL
Playlist.processUrl = function(onLoadStart)
{
	var url = window.location.pathname.split("/");

	if(typeof onLoadStart == "function")
		onLoadStart();

	if( url[1] != "playlist" )
		return Playlist.loadMain();

	var alias = url[2];
	Playlist.load(alias);
}

// Called once upon creating a playlist overlay
Playlist.initPlaylistOverlay = function(currentAccess)
{
	var Reputation = require("./Reputation.js");

	for(var access in Playlist.ACCESS)
	{
		var accessId = Playlist.ACCESS[access];

		if( accessId == Playlist.ACCESS.PUBLIC &&
			!Reputation.hasPermission(
				Reputation.PERMISSION.OWN_PUBLIC_PLAYLISTS) )
					continue;

		var radioId = "access-" + access.toLowerCase();

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
			text: Playlist.ACCESS_LABELS[accessId],
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
	var activeAlias =
		$("#playlists-dropdown .dropdown-item.active").data("alias");

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

	if( Overlay.isActive() )
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

// Show the playlist sharing overlay
Playlist.showShareOverlay = function()
{
	if( Overlay.isActive() )
		return;

	if(!Playlist.active)
		return;

	Overlay.create
	("Share playlist",
	[{
		tag: "<p>",
		attributes: { class: "hint" },
		text: "Anyone with this link can view the playlist",
	},
	{
		tag: "<input>",
		attributes:
		{
			id: "share-url",
			type: "text",
			spellcheck: "false",
		},
		val: Playlist.PLAYLIST_URL + Playlist.active.alias + "/",
		keydown: Overlay.onReadOnlyKeyDown,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "share-close",
			class: "window-link",
		},
		text: "Close",
		click: Overlay.destroy,
	}],
	function onOverlayCreate()
	{

	});
}

// Show the playlist export overlay
Playlist.showExportOverlay = function()
{
	if( Overlay.isActive() )
		return;

	if(!Playlist.active)
		return;

	Overlay.create
	("Export playlist",
	[{
		tag: "<p>",
		attributes: { class: "hint" },
		text: "Remember to create backups to prevent data loss",
	},
	{
		tag: "<textarea>",
		attributes:
		{
			id: "export-text",
			type: "text",
			spellcheck: "false",
		},
		keydown: Overlay.onReadOnlyKeyDown,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "export-close",
			class: "window-link",
		},
		text: "Close",
		click: Overlay.destroy,
	}],
	function onOverlayCreate()
	{
		var Content = require("./Content.js");
		var text = Playlist.active.name + "\n";

		$(".item").each(function()
		{
			var link = Content.getItemExternalUrl( $(this) );

			if(link != null)
				text = text + link + "\n";
		});

		text = text.slice(0, -1);
		$("#export-text").text(text);
	});
}

// Hide the playlist options menu, return true if it was hidden
Playlist.hidePlaylistOptions = function()
{
	var $options = $("#playlist-options");
	var $list = $("#playlist-options-list");

	if( !$options.is(":visible") )
		return false;

	$options.fadeOut(200);
	$list.slideUp(200);

	return true;
}

// Initialize the options for playlist menu
Playlist.initPlaylistOptions = function()
{
	$("#playlist-options-list").empty();

	// Service playlist, bail out
	if(!Playlist.active.playlistId)
		return;

	// Allow adding/removing favorites if not the playlist owner
	if(Playlist.active.user != null)
	{
		Playlist.active.favorited
			? Playlist.addMenuOption("remove-favorite",
				"Remove from Favorites",
				Playlist.onRemoveFavoriteClick)
			: Playlist.addMenuOption("add-favorite",
				"Add to Favorites",
				Playlist.onAddFavoriteClick)
	}

	// Allow sharing playlist unless it has a private access
	if(Playlist.active.access != Playlist.ACCESS.PRIVATE)
		Playlist.addMenuOption("share", "Share",
			Playlist.onSharePlaylistClick);

	Playlist.addMenuOption("export", "Export",
		Playlist.onExportPlaylistClick);
}


// Add a new option to the playlist menu
Playlist.addMenuOption = function(optionId, name, handler)
{
	var $list = $("#playlist-options-list");

	var $option = $("<div>")
		.attr("id", "playlist-" + optionId)
		.addClass("option")
		.text(name);

	if(typeof handler == "function")
		$option.click(handler);

	$list.append($option);
}

// Returns true if the playlist passed validation
Playlist.hasPassedInputValidation = function()
{
	var name = $("#playlist-edit-name").val();

	if(name.length < 3)
		Overlay.setError("#playlist-edit-name", "min. 3 characters");

	if( name.length > 0 && !Playlist.NAME_REGEX.test(name) )
		Overlay.setError("#playlist-edit-name",
			"contains prohibited characters");

	var $radio = Overlay.getActiveRadioButton();

	if(!$radio.length)
	{
		Overlay.shakeLabels();
		return false;
	}

	if( Overlay.hasErrors() )
		return false;

	return true;
}

// Called when the user account status has changed
Playlist.onAccountSync = function()
{
	var Account = require("./Account.js");

	// Remove playlist creator data if it's the same user
	if( Account.authenticated &&
		Playlist.active &&
		Playlist.active.user &&
		Playlist.active.user[0] == Account.own.username )
	{
		Playlist.active.user = null;
		$("#playlist-details-user").remove();
	}

	// Update sections based on authentication status
	Account.authenticated
		? Playlist.initDropdown()
		: Playlist.clearAllSections();

	// Load playlist from the current url
	if(!Playlist.active || !Account.authenticated)
		return Playlist.processUrl();
}

// Called when the playlist is loaded
Playlist.onLoadResponse = function(response)
{
	if(response.errors)
		return Playlist.onLoadError(response);

	var data = response[0];
	var items = response[1];

	var playlist =
	{
		playlistId: data[0],
		name: data[1],
		access: data[2],
		alias: data[3],
		user: data[4],
		favorited: data[5],
		items: items,
	};

	Playlist.setActive(playlist);
}

// Called when the playlist failed to load
Playlist.onLoadError = function(response)
{
	Playlist.clearActive();
	Playlist.setActiveSection("PRIVATE");

	var json = response.responseJSON;

	if(!json || !json.errors)
		return;

	var error = json.errors[0];

	var Toast = require("./Toast.js");

	if(error == "playlist not found")
	{
		Toast.show("Playlist is no longer available",
			Toast.ERROR);

		return;
	}

	if(error == "no access")
	{
		Toast.show("Playlist access has been restricted by the owner",
			Toast.ERROR);

		return;
	}

	Toast.onRequestError(response);
}

// Called upon movement of the mouse cursor
Playlist.onDocumentMouseMove = function(event)
{
	var $dropdown = $("#playlists-dropdown");

	// Toggled by click, no action required
	if( $dropdown.is(".manual") )
		return;

	var $options = $("#playlist-options");

	$dropdown.toggleClass("visible",
		$dropdown.is(".visible")
			? ( event.pageX < $("#sidebar").width() )
			: ( event.pageX < 5 &&
				$("#sidebar").is(":hover") &&
				!$dropdown.is(":hover") &&
				!$options.is(":visible") )
	);
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
Playlist.onHeaderClick = function(event)
{
	// Ignore clicks on the playlist menu icon
	var $target = $(event.target);

	if( $target.is("#playlist-menu-icon") )
		return;

	Playlist.toggleSidebar();
}

// Called upon clicking on the active playlist button
Playlist.onActivePlaylistClick = function()
{
	var $dropdown = $("#playlists-dropdown");

	// Inversed since we need the value after toggle
	var isDropdownVisible = !$dropdown.is(".visible");

	$dropdown
		.toggleClass("visible")
		.toggleClass("manual", isDropdownVisible);
}

// Called upon clicking on the subcategory header in a dropdown
Playlist.onSubcatHeaderClick = function()
{
	var $items = $(this).siblings(".subcat-items");

	$items.is(":visible")
		? $items.slideUp(200)
		: $items.slideDown(200);
}

// Called upon clicking on the item in a dropdown
Playlist.onDropdownItemClick = function()
{
	var alias = $(this).data("alias");
	Playlist.setActiveSection(alias);

	$("#playlists-dropdown")
		.removeClass("visible manual");
}

// Called upon clicking on the new playlist button
Playlist.onNewPlaylistClick = function()
{
	Playlist.editing = null;
	Playlist.deleting = null;

	Playlist.showPlaylistOverlay();
}

// Called upon clicking the playlist menu button
Playlist.onMenuIconClick = function()
{
	var isMenuVisible = Playlist.hidePlaylistOptions();

	if(isMenuVisible)
		return;

	$("#playlist-options").fadeIn(200);
	$("#playlist-options-list").slideDown(200);

	Playlist.initPlaylistOptions();
}

// Called upon clicking the playlist options container
Playlist.onPlaylistOptionsClick = function(event)
{
	// The click wasn't outside the list
	if(event.target != this)
		return;

	Playlist.hidePlaylistOptions();
}

// Called when the create playlist button is clicked
Playlist.onPlaylistCreateClick = function()
{
	if( !Playlist.hasPassedInputValidation() )
		return;

	var name = $("#playlist-edit-name").val();
	var $radio = Overlay.getActiveRadioButton();

	var access = $radio.data("accessId");
	var sectionAlias = $radio.data("sectionAlias");

	Playlist.createThrottled(name, access, sectionAlias);
}

// Called when the save playlist button is clicked
Playlist.onPlaylistSaveClick = function()
{
	if( !Playlist.hasPassedInputValidation() )
		return;

	var playlistId = Playlist.editing.playlistId;
	var name = $("#playlist-edit-name").val();
	var $radio = Overlay.getActiveRadioButton();

	var access = $radio
		.parent()
		.children("input[type=\"radio\"]")
		.index($radio) + 1;

	var alias = Playlist.editing.alias;
	var sectionAlias = $radio.data("sectionAlias");

	Playlist.editThrottled(playlistId, name, access,
		alias, sectionAlias);
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
	Playlist.deleteThrottled(Playlist.deleting.playlistId);
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

	var isPrivatePlaylist =
		( $playlist.data("access") == Playlist.ACCESS.PRIVATE );

	var playlistAlias = $playlist.data(
		isPrivatePlaylist
			? "playlistId"
			: "alias"
	);

	Playlist.load(playlistAlias);
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

// Called upon clicking the add to favorites option
Playlist.onAddFavoriteClick = function()
{
	Playlist.addFavoriteThrottled(Playlist.active.playlistId);
	Playlist.hidePlaylistOptions();
}

// Called upon clicking the remove from favorites option
Playlist.onRemoveFavoriteClick = function()
{
	Playlist.removeFavoriteThrottled(Playlist.active.playlistId);
	Playlist.hidePlaylistOptions();
}

// Called upon clicking the share playlist option
Playlist.onSharePlaylistClick = function()
{
	Playlist.showShareOverlay();
	Playlist.hidePlaylistOptions();
}

// Called upon clicking the export playlist option
Playlist.onExportPlaylistClick = function()
{
	Playlist.showExportOverlay();
	Playlist.hidePlaylistOptions();
}

Playlist.init = function()
{
	$(window).on("popstate", Playlist.onWindowPopState);

	$("#header-left").click(Playlist.onHeaderClick);
	$("#playlist-active").click(Playlist.onActivePlaylistClick);

	$("#playlist-new").click(Playlist.onNewPlaylistClick);
	$("#playlist-menu-icon").click(Playlist.onMenuIconClick);
	$("#playlist-options").click(Playlist.onPlaylistOptionsClick);
}

module.exports = Playlist;
