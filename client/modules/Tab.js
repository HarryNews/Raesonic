var ContentTab = require("../tabs/ContentTab.js");

var Tab = {};

// Set active tab by alias
Tab.setActive = function(alias)
{
	var $tab = $("#menu-" + alias);

	if($tab.is(".active"))
		return;

	$("#tabs-menu div").removeClass("active");
	$("#tabs .tab-contents").removeClass("active");
	$tab.addClass("active");

	$("#tabs .tab-contents")
		.eq( $tab.index() )
		.addClass("active");
}

// Called upon clicking the tab
Tab.onClick = function()
{
	var alias = $(this)
		.attr("id")
		.substring(5);

	Tab.setActive(alias);
}

Tab.init = function()
{
	$("#tabs-menu div").click(Tab.onClick);
	
	ContentTab.init();
}

module.exports = Tab;
