var Item = require("./Item.js");

var ItemList =
{
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
			storage.push($(this).detach());
		});
		$("#items").data("storage", storage);
	}

	$("#items").empty();
	items.forEach(function addItem(item)
	{
		ItemList.addItem(item);
	});

	$("#items").scrollTop(0);
}

// Add item to the item list
// If the boolean is true, item is added to the beginning
ItemList.addItem = function(item, prepend)
{
	var Player = require("./Player.js");

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
					.addClass("add icon fa fa-plus")
					.click(Item.onAddIconClick)
			)
			.data("trackId", item[0]);

	// If the itemId is known, store extra values
	if(item[3])
	{
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
			.append(
				$("<div>")
					.addClass("edit icon fa fa-pencil")
					.click(Item.onEditIconClick)
			);
	}

	// If the relation rating is known, store it on the item
	if(item[6])
		$item.data("rating", item[6]);

	$item
		.children()
		.slice(0, 2)
		.click(Item.onClick);

	prepend
		? $("#items").prepend($item)
		: $("#items").append($item);
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
ItemList.setActiveItem = function($item)
{
	$item.addClass("active");
	
	Item.active = $item.data();
	Item.active.artist = $("#meta-artist").html();
	Item.active.title = $("#meta-title").html();

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

	$("#items").scrollTop(0);
}

// Clear item filtering and restore previous items
ItemList.clearFilter = function()
{
	var hiddenCount = $(".item.hidden").length;
	$(".item").removeClass("hidden odd even");

	var storage = $("#items").data("storage");
	var storageInUse = (storage && storage.length);

	if(!storageInUse)
	{
		if(hiddenCount > 0)
			ItemList.scrollTo( $(".item.active") );

		return;
	}

	$("#items").empty();

	storage.forEach(function($item)
	{
		$("#items").append(
			$item.removeClass("hidden odd even active")
		);
	});

	$("#items").data( "storage", [] );

	ItemList.scrollTo( $(".item.active") );
}

module.exports = ItemList;
