var ContentTab = require("../tabs/ContentTab.js");

var Tabs = {};

// Set active tab by alias
Tabs.setActive = function(alias)
{
	var $tab = $("#menu-" + alias);
	if($tab.is(".active")) return;
	$("#tabs-menu div").removeClass("active");
	$("#tabs .tab-contents").removeClass("active");
	$tab.addClass("active");
	$("#tabs .tab-contents").eq($tab.index()).addClass("active");
}

// Called upon clicking the tab
Tabs.onClick = function()
{
	Tabs.setActive($(this).attr("id").substring(5));
}

Tabs.init = function()
{
	$("#tabs-menu div").click(Tabs.onClick);
	ContentTab.init();
}

module.exports = Tabs;
