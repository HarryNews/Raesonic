var Preloader =
{
	visible: true,
};

// Called when the application has loaded
Preloader.onLoad = function()
{
	$("#loading").fadeOut(500);

	$("#spinner")
		.animate({ "width": "20px", "height": "20px" }, 1000);

	$("#header .button")
		.fadeIn(500)
		.css("display", "inline-block");

	Preloader.visible = false;

	if(!Preloader.verifiedEmail)
		return;

	setTimeout(function()
	{
		var Toast = require("./Toast.js")

		Toast.show(
			"Email address has been successfully verified",
			Toast.INFO
		);
	}, 1000);
}

module.exports = Preloader;
