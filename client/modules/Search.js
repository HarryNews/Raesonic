var Enum = require("./Enum.js");
var ItemList = require("./ItemList.js");

var Search = {};

// Request tracks matching the query and fill item list with the results
Search.getItems = function(query)
{
	$.ajax
	({
		url: "/search/" + query + "/",
		type: "GET",
		success: function(response)
		{
			if(response.error) return;
			var items = response;
			ItemList.setItems(items, true);
		}
	});
}

// Clear search input
Search.clear = function()
{
	$("#search").val("");
	$("#search-clear").hide();
}

// Called upon releasing a key in the search field
Search.onKeyUp = function(event)
{
	var query = $(this).val();
	var length = query.length;

	if(event.keyCode != 13 || length < 3)
	{
		if(query.indexOf("http") == 0)
		{
			$("#search-clear").is(":visible")
				? ItemList.clearFilter()
				: $("#search-clear").fadeIn(200);
			return;
		}

		if(!length)
		{
			Search.clear();
			ItemList.clearFilter();
			return;
		}

		$("#search-clear").fadeIn(200);
		var storage = $("#items").data("storage");

		if(storage && storage.length)
			return;

		ItemList.setFilter(query);
		return;
	}
	var Content = require("./Content.js");
	var match = /(youtu.be\/|youtube.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&\"\'>]+)/.exec(query);
	if(match && match[5])
	{
		Content.create(Enum.Source.YouTube, match[5]);
		return;
	}
	match = /^https?:\/\/(soundcloud.com|snd.sc)\/(.*)$/.exec(query);
	if(match && match[2])
	{
		SC.resolve(query).then(function(response)
		{
			Content.create(Enum.Source.SoundCloud, response.id);
		});
		return;
	}
	query = encodeURIComponent(query).replace(/%20/g, "+");
	Search.getItems(query);
}

// Called upon clicking the search clear button
Search.onClearClick = function()
{
	Search.clear();
	ItemList.clearFilter();
}

Search.init = function()
{
	$("#search").keyup(Search.onKeyUp);
	$("#search-clear").click(Search.onClearClick);
}

module.exports = Search;
