var Item = require("./Item.js");

var ItemList =
{
	// For setting items
	USE_STORAGE: true,
	// New item destination
	APPEND: false,
	PREPEND: true,
	// Item switch direction
	PREVIOUS_ITEM: false,
	NEXT_ITEM: true,
	// Item switch mode
	AUTO_SWITCH: false,
	MANUAL_SWITCH: true,
	// Action on content error
	SKIP_TRACK: true,
	// Variables
	shuffleEnabled: false,
};

// Set items of the item list
// If useStorage is true and the storage is empty, it is filled with current items
ItemList.setItems = function(items, useStorage)
{
	var storage = $("#items").data("storage") || [];

	if(useStorage && !storage.length)
	{
		$(".item").each(function()
		{
			storage.push( $(this).detach() );
		});
		
		$("#items")
			.addClass("search-results")
			.removeClass("filtered all-hidden")
			.data("storage", storage);

		var Playlist = require("./Playlist.js");

		if(Playlist.active != null)
			Playlist.active.hidden = true;
	}

	$("#items").empty();
	items.forEach(function addItem(item)
	{
		ItemList.addItem(item);
	});

	ItemList.setShuffle(ItemList.shuffleEnabled);

	$("#items").scrollTop(0);
}

// Add item to the item list
// If the boolean is true, item is added to the beginning
ItemList.addItem = function(item, prepend, useStorage)
{
	var isContentAttached = ( item[4] != null );

	var $item =
		$("<div>")
			.addClass("item")
			.append(
				$("<div>")
					.addClass("artist")
					.html( Item.formatArtist( item[1] ) ),
				$("<div>")
					.addClass("title")
					.html( Item.formatTitle( item[2] ) ),
				$("<div>")
					.addClass("add icon")
					.toggleClass("hidden", !isContentAttached)
					.click(Item.onAddIconClick)
			)
			.data("trackId", item[0]);

	// If the itemId is known, store extra values
	if(item[3] != null)
	{
		var Reputation = require("./Reputation.js");

		var isEditingAllowed = Reputation.hasPermission(
			Reputation.PERMISSION.EDIT_OWN_TRACKS, true
		);

		var $edit = $("<div>")
			.addClass("edit icon")
			.toggleClass("disabled", !isEditingAllowed)
			.click(Item.onEditIconClick);

		if(!isEditingAllowed)
			$edit.attr("title", "Not enough reputation");

		$item
			.data
			({
				"itemId": item[3],
				"sourceId": item[4],
				"externalId": item[5],
				"initial":
				[
					item[4],
					item[5],
				],
			})
			.append($edit);
	}

	// If the relation rating is known, store relation values
	if(item[6] != null)
	{
		$item.data
		({
			"rating": item[6],
			"vote": item[7],
			"flagged": item[8],
		});
	}

	$item
		.children()
		.slice(0, 2)
		.click(Item.onClick);

	if(useStorage)
	{
		// Add item to the storage
		var storage = $("#items").data("storage") || [];

		prepend
			? storage.unshift( $item.clone(true) )
			: storage.push( $item.clone(true) );

		return;
	}

	prepend
		? $("#items").prepend($item)
		: $("#items").append($item);
}

// Shuffle or restore order of the items
ItemList.setShuffle = function(shuffle)
{
	var $items = $("#items");
	var $children = $("#items").children();

	if(shuffle)
	{
		// Store the order
		$children.each(function(index)
		{
			$(this).attr("data-order", ++index);
		});
	}

	// Nothing to restore, bail out
	if( !shuffle && $(".item[data-order]").length == 0 )
		return;

	$children
		.sort(function(itemA, itemB)
		{
			if(shuffle)
			{
				// Always keep the active item on top
				if( itemA.classList.contains("active") )
					return -1;

				if( itemB.classList.contains("active") )
					return 1;

				// Randomly shuffle the rest
				return ( Math.round( Math.random() ) - 0.5 );
			}

			// Restore the order
			var orderA = itemA.getAttribute("data-order") || 0;
			var orderB = itemB.getAttribute("data-order") || 0;

			return (orderA - orderB);
		})
		.detach()
		.appendTo($items);

	if(shuffle)
		return;

	// Remove the order attribute
	$children.removeAttr("data-order");
}

// Return next/previous item
ItemList.getSwitchItem = function(forward, manual)
{
	var $item = $(".item.active").closest(".item");

	$item = forward
		? $item.next()
		: $item.prev();

	var itemMissing = ($item.length < 1);

	if(itemMissing)
	{
		// Do not cycle item list unless the switch is manual
		if(!manual)
			return false;

		$item = forward
			? $(".item:first")
			: $(".item:last");
	}

	return $item;
}

// Set specified item as active
ItemList.setActiveItem = function($item, isManualSwitch)
{
	$item.addClass("active");
	
	Item.active = $item.data();
	Item.active.artist = $("#meta-artist").html();
	Item.active.title = $("#meta-title").html();
	Item.active.isManualSwitch = isManualSwitch;

	var History = require("./History.js");
	History.onItemChange($item);

	var Tab = require("./Tab.js");
	Tab.onItemChange($item);
}

// Scroll to the specified item
ItemList.scrollTo = function($item)
{
	$("#items").animate
	({
		scrollTop:
			Math.max(
				Item.getScrollOffset($item, -1),
				0
			)
	}, 500);
}

// Hide items not matching the query
ItemList.setFilter = function(query)
{
	query = query.toLowerCase();

	var length = query.length;
	var count = 0;

	$(".item").each(function()
	{
		if(!length)
			return $(this).removeClass("hidden odd even");

		var hidden = true;

		$(this)
			.children()
			.slice(0, 2)
			.each(function()
			{
				var field = $(this)
					.text()
					.toLowerCase();

				if(field.indexOf(query) != -1)
					hidden = false;
			});

		$(this)
			.toggleClass("hidden", hidden)
			.removeClass("odd even");

		if(hidden)
			return;

		(count % 2)
			? $(this).addClass("even")
			: $(this).addClass("odd");

		count++;
	});

	var allHidden = ( $(".item:not(.hidden)").length == 0);

	$("#items")
		.addClass("filtered")
		.toggleClass("all-hidden", allHidden)
		.scrollTop(0);
}

// Show all items previously hidden by the filter
ItemList.clearFilter = function()
{
	$("#items").removeClass("filtered all-hidden");

	var hiddenCount = $(".item.hidden").length;

	if(hiddenCount < 1)
		return;

	$(".item").removeClass("hidden odd even");
	ItemList.scrollTo( $(".item.active") );
}

// Restore previous items from the storage
ItemList.restoreStorage = function()
{
	var Playlist = require("./Playlist.js");

	if(Playlist.active == null)
	{
		$("#items")
			.removeClass("search-results")
			.empty();

		return;
	}

	if(!Playlist.active.hidden)
		return;

	Playlist.active.hidden = false;

	$("#items")
		.removeClass("search-results")
		.empty();

	var storage = $("#items").data("storage") || [];

	if(!storage.length)
		return;

	storage.forEach(function($item)
	{
		$("#items").append(
			$item.removeClass("hidden odd even active")
		);
	});

	$("#items").data( "storage", [] );

	ItemList.scrollTo( $(".item.active") );
}

// Called when the user account status has changed
ItemList.onAccountSync = function()
{
	// Update all edit icons based on reputation
	var Reputation = require("./Reputation.js");

	var isEditingAllowed = Reputation.hasPermission(
		Reputation.PERMISSION.EDIT_OWN_TRACKS, true
	);

	$(".item > .edit.icon")
		.toggleClass("disabled", !isEditingAllowed)
		.attr("title", isEditingAllowed
			? ""
			: "Not enough reputation"
		);
}

module.exports = ItemList;
