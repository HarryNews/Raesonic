var Tab =
{
	Related: require("../tabs/RelatedTab.js"),
	Content: require("../tabs/ContentTab.js"),
	History: require("../tabs/HistoryTab.js"),
};

// Store tab alias as a data value
Tab.setAlias = function()
{
	// "menu-related" > "related"
	var tabId = $(this)
		.attr("id")
		.substring(5);

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
	$.each(Tab, function(_, tab)
	{
		if(typeof tab == "function")
			return;
		
		tab.onItemChange($item);
	});
}

// Called upon clicking the tab
Tab.onClick = function()
{
	var tabId = $(this).data("tabId");
	Tab.setActive( Tab[tabId] );
}

Tab.init = function()
{
	$("#tabs-menu div")
		.each(Tab.setAlias)
		.click(Tab.onClick);
	
	$.each(Tab, function(_, tab)
	{
		if(typeof tab == "function")
			return;

		tab.init();
	});
}

module.exports = Tab;
