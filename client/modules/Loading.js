var Loading = {};

// Fade out the loading screen
Loading.complete = function()
{
	$("#loading").fadeOut(500);
	$("#spinner").animate({ "width": "20px", "height": "20px" }, 1000);
	$("#header .button").fadeIn(500).css("display", "inline-block");
}

module.exports = Loading;
