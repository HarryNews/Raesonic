var Preloader =
{
	visible: true,
};

// Called when the application has loaded
Preloader.onLoad = function()
{
	$("#loading").fadeOut(500);
	$("#spinner").animate({ "width": "20px", "height": "20px" }, 1000);

	$("#header .button")
		.fadeIn(500)
		.css("display", "inline-block");

	Preloader.visible = false;
}

module.exports = Preloader;
