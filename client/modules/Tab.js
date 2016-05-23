var Tab =
{
	Related: require("../tabs/RelatedTab.js"),
	Content: require("../tabs/ContentTab.js"),
	History: require("../tabs/HistoryTab.js"),
};

// Store tab alias as a data value
Tab.setAlias = function()
{
	var tabId = $(this).attr("id");

	// "menu-related" > "related"
	tabId = tabId.substring(tabId.indexOf("menu-") + 5);

	// "related" > "Related"
	tabId = tabId.charAt(0).toUpperCase() + tabId.slice(1);

	$(this).data("tabId", tabId);
}

// Set active tab by object reference
Tab.setActive = function(tab)
{
	var $tab = $("#menu-" + tab.ALIAS);
	
	tab.onSetActive();

	if($tab.is(".active"))
		return;

	$("#tabs-menu div, #tabs .tab-contents")
		.removeClass("active");
	
	$tab.addClass("active");

	$("#tabs .tab-contents")
		.eq( $tab.index() )
		.addClass("active");
}

// Called upon active item change
Tab.onItemChange = function($item)
{
	// Allow tab interaction if a track is linked to the item
	($item.data("trackId") == -1)
		? $("#tabs-overlay").addClass("visible")
		: $("#tabs-overlay.visible").removeClass("visible");

	$.each(Tab, function(_, tab)
	{
		if(typeof tab == "function")
			return;
		
		tab.onItemChange($item);
	});
}

// Called upon clicking the menu button
Tab.onMenuClick = function()
{
	var tabId = $(this).data("tabId");
	Tab.setActive( Tab[tabId] );
}

Tab.init = function()
{
	$("#tabs-menu div")
		.each(Tab.setAlias)
		.click(Tab.onMenuClick);
	
	$.each(Tab, function(_, tab)
	{
		if(typeof tab == "function")
			return;

		tab.init();
	});
}

module.exports = Tab;
