var History = require("./History.js");

var Tab =
{
	Related:
	{
		ALIAS: "related",
	},
	Content:
	{
		ALIAS: "content",
	},
	History:
	{
		ALIAS: "history",
		onSetActive: History.onTabSetActive,
	},
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

	// Tab is already active, bail out
	if( $tab.is(".active") )
		return;
	
	if(tab.onSetActive)
		tab.onSetActive();

	$("#tabs-menu > div, #tabs .tab-contents")
		.removeClass("active");
	
	$tab.addClass("active");

	$("#tabs .tab-contents")
		.eq( $tab.index() )
		.addClass("active");
}

// Returns true if the tab is active
Tab.isActive = function(tab)
{
	var $tab = $("#menu-" + tab.ALIAS);
	return $tab.is(".active");
}

// Called upon active item change
Tab.onItemChange = function($item)
{
	// Allow tab interaction if a track is linked to the item
	($item.data("trackId") == -1)
		? $("#tabs-overlay").addClass("visible")
		: $("#tabs-overlay.visible").removeClass("visible");
}

// Called upon clicking the menu button
Tab.onMenuClick = function()
{
	var tabId = $(this).data("tabId");
	Tab.setActive( Tab[tabId] );
}

Tab.init = function()
{
	$("#tabs-menu > div")
		.each(Tab.setAlias)
		.click(Tab.onMenuClick);
}

module.exports = Tab;
