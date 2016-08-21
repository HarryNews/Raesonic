var Throttle = require("throttle-debounce/throttle");
var Overlay = require("./Overlay.js");

var Item =
{
	NAME_REGEX: /^[\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC0-9?!#%^&();:_+\- /\|'.,]+$/i,
};

// Add item with the specified content to the active playlist
Item.create = function(sourceId, externalId)
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();
	
	var Playlist = require("./Playlist.js");
	var Toast = require("./Toast.js");

	if(!Playlist.active)
	{
		Toast.show("No active playlist", Toast.ERROR);
		return;
	}

	if(Playlist.active.user != null || Playlist.active.playlistId < 1)
	{
		Toast.show("Playlist belongs to another user", Toast.ERROR);
		return;
	}

	$.ajax
	({
		url: "/playlists/" + Playlist.active.playlistId + "/",
		type: "POST",
		data: JSON.stringify({ sourceId: sourceId, externalId: externalId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var ItemList = require("./ItemList.js");
			ItemList.clearFilter();
			ItemList.restoreStorage();

			var item =
			{
				trackId: response[0],
				artist: response[1],
				title: response[2],
				itemId: response[3],
				playlistPosition: response[4],
				sourceId: sourceId,
				externalId: externalId,
			};

			ItemList.addItem(item, ItemList.PREPEND);
			$("#items").scrollTop(0);

			Playlist.setTrackCounter(null, 1);

			var Search = require("./Search.js");
			Search.clear();
		},
		error: Toast.onRequestError,
	});
}
Item.createThrottled = Throttle(2000,
function(sourceId, externalId)
{
	Item.create(sourceId, externalId);
});

// Add item with the specified content to the specified playlist
Item.copy = function(playlistId, name, access, sourceId, externalId)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/playlists/" + playlistId + "/",
		type: "POST",
		data: JSON.stringify({ sourceId: sourceId, externalId: externalId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var artist = response[1];
			var title = response[2];

			var Playlist = require("./Playlist.js");

			// Prepend the item if added to active hidden playlist
			if(Playlist.active && Playlist.hidden &&
				Playlist.active.playlistId == playlistId)
			{
				var trackId = response[0];
				var itemId = response[3];

				var item =
				{
					trackId: response[0],
					artist: artist,
					title: title,
					itemId: response[3],
					sourceId: sourceId,
					externalId: externalId,
				};

				var ItemList = require("./ItemList.js");
				ItemList.addItem(item, ItemList.PREPEND,
					ItemList.USE_STORAGE);

				Playlist.setTrackCounter(null, 1);
			}
			else
			{
				Playlist.updateSectionCounter(playlistId, access, null, 1);
			}

			Toast.show("\"" + artist + " – " + title + "\"" +
				" has been added to " + name, Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Item.copyThrottled = Throttle(2000,
function(playlistId, name, access, sourceId, externalId)
{
	Item.copy(playlistId, name, access, sourceId, externalId);
});

// Remove specified item from the playlist
Item.remove = function(itemId)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/items/" + itemId + "/",
		type: "DELETE",
		success: function(response)
		{
			if(response.errors)
				return;

			var $item = $(".item").filterByData("itemId", itemId);

			if($item.is(".active"))
			{
				var Player = require("./Player.js");
				var ItemList = require("./ItemList.js");
				Player.switchItem(ItemList.NEXT_ITEM);
			}

			$item.remove();

			var Playlist = require("./Playlist.js");
			Playlist.setTrackCounter( $(".item").length );

			Overlay.destroy();

			Toast.show("Item has been removed from the playlist",
				Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}

// Change item's artist and/or title information
Item.rename = function(itemId, trackId, artist, title, artistChanged, titleChanged)
{
	var trackExists = (trackId != -1);

	var tracksUrl = trackExists
		? "/tracks/" + trackId + "/"
		: "/tracks/";

	var data = trackExists
		?
		{
			itemId: itemId,
			artist: { name: artist, changed: artistChanged},
			title: { name: title, changed: titleChanged },
		}
		:
		{
			itemId: itemId,
			artist: artist,
			title: title,
		};

	var Toast = require("./Toast.js");
	var previousTrackId = trackId;

	$.ajax
	({
		url: tracksUrl,
		type: trackExists ? "PUT" : "POST",
		data: JSON.stringify(data),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var trackId = response;

			var externalId = $(".item")
				.filterByData("itemId", itemId)
				.data("externalId");

			var match = { key: "externalId", value: externalId };

			Item.onItemRename
				(match, previousTrackId, trackId, artist, title);

			Overlay.destroy();

			Toast.show("Track information saved successfully",
				Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Item.renameThrottled = Throttle(5000,
function(itemId, trackId, artist, title, artistChanged, titleChanged)
{
	Item.rename(itemId, trackId, artist, title,
		artistChanged, titleChanged);
});

// Play the specified item
Item.play = function($item, isManualSwitch)
{
	var Player = require("./Player.js");
	Player.setItem($item, isManualSwitch);
}

// Update the item editing overlay
Item.updateEditOverlay = function()
{
	Overlay.clearErrors();

	// Without itemId no changes are possible
	if(!Item.editing.itemId)
		return Overlay.setAction(null);

	var artist = $("#edit-artist").val();
	var title = $("#edit-title").val();

	if( artist.length > 0 && !Item.NAME_REGEX.test(artist) )
		Overlay.setError("#edit-artist", "contains prohibited characters");

	if( title.length > 0 && !Item.NAME_REGEX.test(title) )
		Overlay.setError("#edit-title", "contains prohibited characters");

	var artistChanged = (artist != Item.editing.artist);
	var titleChanged = (title != Item.editing.title);

	var trackExists = (Item.editing.trackId != -1);

	// At least one field needs to be different to confirm changes
	// If there is no track assigned, both fields are required
	var saveAllowed = trackExists
		? (artistChanged || titleChanged)
		: (artistChanged && titleChanged)

	var hasErrors = Overlay.hasErrors();

	var $guidelines =
		$("#edit-guidelines-container");

	var agreedWithTerms = $guidelines
		.find("input")
		.is(":checked");

	(!trackExists || saveAllowed)
		? $guidelines
			.addClass("animated")
			.slideDown(200, function onDone()
			{
				$(this).removeClass("animated")
			})
		: $guidelines
			.addClass("animated")
			.slideUp(200, function onDone()
			{
				$(this).removeClass("animated")
			});

	saveAllowed
		? Overlay.setAction("Save",
			agreedWithTerms && !hasErrors
				? Item.onItemSaveClick
				: null
		)
		: Overlay.setAction("Remove",
			Item.onItemRemoveClickThrottled);
}

// Wrap each artist in a <span>
Item.formatArtist = function(artist)
{
	return "<span>" +
		artist.replace(/\s&\+\s/g, "</span> & <span>") +
	"</span>";
}

// Replace  (...) with <span>(...)</span>
Item.formatTitle = function(title)
{
	return title.replace(/\((.+)\)/g, "<span>$1</span>");
}

// Unwrap artists, replace &amp; with &
Item.restoreArtist = function(artist, clean)
{
	artist = artist
		.replace(/<\/span>\s&amp;\s<span>/g,
			clean
				? " & "
				: " &+ ")
		.replace(/<\/?span>/g, "")
		.replace(/&amp;/g, "&");

	return artist;
}

// Replace <span>(...)</span> with (...), &amp; with &
Item.restoreTitle = function(title)
{
	title = title
		.replace(/<span>(.+)<\/span>/g, "($1)")
		.replace(/&amp;/g, "&");

	return title;
}

// Replace <span> with <span class="padded">
Item.padSpans = function(field)
{
	return field.replace(/<span>/g,
		"<span class=\"padded\">");
}

// Fade out and remove the dropdown
Item.fadeRemoveDropdown = function()
{
	$("#add-list")
		.fadeOut(200, function onDropdownFadeOut()
		{
			$(this).remove();
		})
		.parent()
		.removeClass("adding");

	$("body").unbind("mousedown", Item.onDocumentMouseDown);
	$("body").unbind("keydown", Item.onDocumentKeyDown);

	$("#items").unbind("scroll touchmove mousewheel",
		Item.onItemListScroll);
}

// Return vertical offset of the item
Item.getScrollOffset = function($item, offset)
{
	return $item.height() *
		(
			$item
				.siblings(":visible")
				.addBack()
				.index($item) +
					(offset || 0)
		)
}

// Called when the item has been renamed
Item.onItemRename = function(match, previousTrackId, trackId, artist, title)
{
	artist = Item.formatArtist(artist);
	title = Item.formatTitle(title);

	var $item = $(".item")
		.filterByData(match.key, match.value);

	if( $item.length )
	{
		$(".artist", $item).html(artist);
		$(".title", $item).html(title);

		$item.data("trackId", trackId);
	}

	// Update meta and history if the item is active
	if(Item.active &&
		Item.active[match.key] == match.value)
	{
		$("#meta-artist").html(artist);
		$("#meta-title").html(title);

		var hasNameChanged = 
			( Item.active.artist != artist ||
			Item.active.title != title );

		var switchSection =
			(trackId != -1 && hasNameChanged);

		Item.active.trackId = trackId;
		Item.active.artist = artist;
		Item.active.title = title;

		var History = require("./History.js");
		
		// Switch to the appropriate section or keep the current one
		var sectionId = switchSection
			? (previousTrackId == -1 || trackId == previousTrackId)
				? History.TYPE_TRACK_EDITS
				: History.TYPE_CONTENT_LINKS
			: null;

		History.forceUpdate(History.SWITCH_TAB, sectionId);
		
		setTimeout(function()
		{
			// Toggle interaction based on whether a track is attached
			var Tab = require("./Tab.js");
			Tab.onItemChange();
		}, 1000);
	}
}

// Called upon clicking the item's artist or title element
Item.onClick = function()
{
	var $item = $(this).closest(".item");
	var ItemList = require("./ItemList.js");

	Item.play($item, ItemList.MANUAL_SWITCH);
}

// Called upon clicking the pencil icon
Item.onEditIconClick = function()
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();

	var $icon = $(this);

	if( $icon.is(".disabled") )
		return;
	
	var $item = $icon.parent();

	Item.editing = 
	{
		itemId: $item.data("itemId"),
		trackId: $item.data("trackId"),
		artist: "",
		title: "",
	};
	
	var trackExists = (Item.editing.trackId != -1);

	if(trackExists)
	{
		Item.editing.artist =
			Item.restoreArtist( $(".artist", $item).html() );
		Item.editing.title =
			Item.restoreTitle( $(".title", $item).html() );
	}
	
	Overlay.create("Edit track",
	[{
		tag: "<input>",
		attributes:
		{
			id: "edit-artist",
			type: "text",
			maxlength: 50,
			placeholder: "Artist",
		},
		val: Item.editing.artist,
		keyup: Item.updateEditOverlay,
	},
	{
		tag: "<input>",
		attributes:
		{
			id: "edit-title",
			type: "text",
			maxlength: 50,
			placeholder: "Title",
		},
		val: Item.editing.title,
		keyup: Item.updateEditOverlay,
	},
	{
		tag: "<input>",
		attributes:
		{
			id: "edit-guidelines-agree",
			type: "checkbox",
		},
		change: Item.updateEditOverlay,
	},
	{
		tag: "<label>",
		attributes:
		{
			id: "edit-guidelines-label",
			for: "edit-guidelines-agree",
		},
		html: "I agree to the " +
			"<a href=\"#\">Track Naming Guidelines</a>",
	}],
	function onOverlayCreate()
	{
		Overlay.initCheckbox("edit-guidelines");

		var Article = require("./Article.js");

		var $link = $("#edit-guidelines-label a");
		Article.addLink($link, Article.TRACK_NAMING_GUIDELINES);

		var Reputation = require("./Reputation.js");

		if( !Reputation.hasPermission(
			Reputation.PERMISSION.EDIT_OWN_TRACKS) )
		{
			$("#edit-artist, #edit-title")
				.prop("readOnly", true)
				.attr("title", "Not enough reputation");
		}

		if( Reputation.hasPermission(
			Reputation.PERMISSION.AUTOCHECK_GUIDELINES) )
		{
			$("#edit-guidelines-agree").prop("checked", true);
		}

		Item.updateEditOverlay();
	});
}

// Called upon clicking the plus icon
Item.onAddIconClick = function()
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();

	var $item = $(this).parent();

	// Dropdown is already shown for this item, remove it and bail
	if( $item.find("#add-list").length )
		return Item.fadeRemoveDropdown();

	Item.fadeRemoveDropdown();

	var $dropdown = $("<div>").attr("id", "add-list");

	// Active item exists and differs from selected, both have tracks attached
	if(Item.active && Item.active.trackId != $item.data("trackId") &&
		Item.active.trackId != -1 && $item.data("trackId") != -1)
	{
		var Reputation = require("./Reputation.js");

		if( Reputation.hasPermission(
			Reputation.PERMISSION.CREATE_RELATIONS) )
		{
			var trackName = Item.active.artist + " – " +
				Item.padSpans(Item.active.title);

			var $icon = $("<div>")
				.addClass("listrelated icon");

			var $label = $("<div>")
				.addClass("label")
				.html(trackName);

			$dropdown.append(
				$("<div>")
					.addClass("list-element")
					.append($icon, $label)
					.click(Item.onRelationElementClick)
			);
		}
	}

	var Playlist = require("./Playlist.js");

	Playlist.PERSONAL_SECTIONS
	.forEach(function(sectionAlias, sectionIndex)
	{
		var $playlists = $("#playlists").data(sectionAlias);

		if($playlists != null)
		{
			$playlists.forEach(function($playlist)
			{
				var playlistId = $playlist.data("playlistId");

				// Skip active playlist unless in another view
				if(Playlist.active &&
					Playlist.active.playlistId == playlistId &&
					!Playlist.hidden)
						return;

				var name = $playlist.find(".name").text();
				var access = $playlist.data("access");

				var accessName =
					Playlist.PERSONAL_SECTIONS[sectionIndex];

				var $icon = $("<div>")
					.addClass("listplaylists icon");

				var $label = $("<div>")
					.addClass("label")
					.text(name)
					.append(
						$("<span>")
							.addClass("access")
							.text(accessName)
					);

				$dropdown.append(
					$("<div>")
						.addClass("list-element")
						.append($icon, $label)
						.data
						({
							playlistId: playlistId,
							name: name,
							access: access,
						})
						.click(Item.onPlaylistElementClick)
				);
			});
		}
	});

	if( !$dropdown.children().length )
	{
		var Toast = require("./Toast.js");
		Toast.show("No cached playlists found", Toast.ERROR);

		return;
	}

	// Below item or above item if it doesn't fit on screen
	var itemsVisible = Math.min($dropdown.children().length, 5);

	var isFittingBelow =
		( $item.offset().top <
			( $(document).height() - itemsVisible * 40 - 80 ) );

	$dropdown.css("top", (isFittingBelow)
		? Item.getScrollOffset($item, 1)
		: Item.getScrollOffset($item, -itemsVisible) + itemsVisible * 3
	);

	$item
		.addClass("adding")
		.append( $dropdown.fadeIn(200) );

	$("body").bind("mousedown", Item.onDocumentMouseDown);
	$("body").bind("keydown", Item.onDocumentKeyDown);

	$("#items").bind("scroll touchmove mousewheel",
		Item.onItemListScroll);
}

// Called upon clicking the save button in the overlay
Item.onItemSaveClick = function()
{
	// Trim outer and inner whitespace
	$("#edit-artist, #edit-title").each(function()
	{
		$(this).val(
			$(this)
				.val()
				.trim()
				.replace(/ +/g, " ")
		);
	});

	var artist = $("#edit-artist").val();
	var title = $("#edit-title").val();

	if(artist.length < 2)
		Overlay.setError("#edit-artist", "min. 2 characters");

	if(title.length < 2)
		Overlay.setError("#edit-title", "min. 2 characters");

	if( artist.length > 0 && !Item.NAME_REGEX.test(artist) )
		Overlay.setError("#edit-artist", "contains prohibited characters");

	if( title.length > 0 && !Item.NAME_REGEX.test(title) )
		Overlay.setError("#edit-title", "contains prohibited characters");

	if( Overlay.hasErrors() )
		return;

	var artistChanged = (artist != Item.editing.artist);
	var titleChanged = (title != Item.editing.title);

	var itemId = Item.editing.itemId;
	var trackId = Item.editing.trackId;

	Item.renameThrottled(itemId, trackId, artist, title,
		artistChanged, titleChanged);
}

// Called upon clicking the remove button in the overlay
Item.onItemRemoveClick = function()
{
	Item.remove(Item.editing.itemId);
}
Item.onItemRemoveClickThrottled =
Throttle(5000, function()
{
	Item.onItemRemoveClick();
});

// Called upon clicking a track item in the dropdown list
Item.onRelationElementClick = function()
{
	if( Overlay.isActive() )
		return;

	Item.fadeRemoveDropdown();

	$item = $(this).parents(".item");

	var trackName = Item.active.artist + "<br>" +
		Item.padSpans(Item.active.title);

	var linkedName = $(".artist", $item).html() + "<br>" +
		Item.padSpans( $(".title", $item).html() );

	Overlay.create("Create new recommendation",
	[{
		tag: "<p>",
		text: "You are suggesting that these tracks are similar:",
	},
	{
		tag: "<p>",
		attributes:
		{
			id: "relation-subject",
			class: "subject",
		},
		html: trackName,
		data:
		{
			trackId: Item.active.trackId,
			linkedId: $item.data("trackId"),
		}
	},
	{
		tag: "<p>",
		attributes:
		{
			id: "relation-extra-subject",
			class: "extra subject final",
		},
		html: linkedName,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "relation-create",
			class: "inner window-link",
		},
		text: "Create Recommendation",
		click: Item.onRelationCreateClick,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "relation-cancel",
			class: "window-link",
		},
		text: "Cancel",
		click: Overlay.destroy,
	}],
	function onOverlayCreate()
	{
		
	});
}

// Called upon clicking a playlist item in the dropdown list
Item.onPlaylistElementClick = function()
{
	var $playlist = $(this);
	var $item = $(".item.adding");

	var playlistData = $playlist.data();
	var itemData = $item.data();

	Item.copyThrottled(playlistData.playlistId, playlistData.name,
		playlistData.access, itemData.sourceId, itemData.externalId);

	Item.fadeRemoveDropdown();
}

// Called upon clicking the create relation button
Item.onRelationCreateClick = function()
{
	var data = $("#relation-subject").data();

	var Relation = require("./Relation.js");
	Relation.createThrottled(data.trackId, data.linkedId);
}

// Called when the mouse is pressed somewhere
Item.onDocumentMouseDown = function(event)
{
	var $target = $(event.target);

	// Ignore clicks on the dropdown
	if( $target.is("#add-list") ||
		$target.parents("#add-list").length )
		return;

	Item.fadeRemoveDropdown();
}

// Called when a key is pressed somewhere
Item.onDocumentKeyDown = function(event)
{
	// Ignore keys that do not change the scroll
	if([32, 33, 34, 35, 36, 37, 38, 39, 40]
		.indexOf(event.keyCode) == -1)
			return;

	Item.fadeRemoveDropdown();
}

// Called when the item list is scrolled
Item.onItemListScroll = function(event)
{
	// Not scrolling the dropdown list
	if( !$("#add-list:hover").length )
		return Item.fadeRemoveDropdown();

	if(event.type == "mousewheel")
	{
		var $dropdown = $("#add-list");

		var scrollHeight = $dropdown[0].scrollHeight;
		var scrollTop = $dropdown.scrollTop();
		var height = $dropdown.height();
		var delta = event.originalEvent.wheelDelta;
		var up = (delta > 0);

		// Allow scrolling within the dropdown list
		if( ( !up && ( -delta <= (scrollHeight - height - scrollTop) ) ) ||
			(up && (delta <= scrollTop) ) )
			return;

		// Past the limit, use the edge values
		(up)
			? $dropdown.scrollTop(0)
			: $dropdown.scrollTop(scrollHeight);
	}

	event.preventDefault();
	event.stopPropagation();
	return false;
}

module.exports = Item;
